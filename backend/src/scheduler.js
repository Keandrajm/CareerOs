const cron = require('node-cron');
const db = require('./db');
const greenhouseService = require('./services/greenhouseService');
const leverService = require('./services/leverService');
const ashbyService = require('./services/ashbyService');
const scoringService = require('./services/scoringService');
const discordService = require('./services/discordService');
const learningService = require('./services/learningService');
const urlHealthService = require('./services/urlHealthService');
const { logEvent } = require('./routes/logs');

let scanInProgress = false;
let maintenanceInProgress = false;

function upsertJob(job) {
  const existing = db.prepare('SELECT id FROM jobs WHERE external_id = ?').get(job.external_id);
  if (existing) {
    db.prepare(`
      UPDATE jobs SET
        title = ?, company = ?, salary_min = ?, salary_max = ?, salary_text = ?,
        remote_status = ?, location = ?, posted_date = ?, source_name = ?,
        source_url = ?, company_career_url = ?, description = ?,
        description_snippet = ?, updated_at = ?
      WHERE id = ?
    `).run(
      job.title, job.company,
      job.salary_min != null ? job.salary_min : null,
      job.salary_max != null ? job.salary_max : null,
      job.salary_text || null,
      job.remote_status || 'unknown',
      job.location || null,
      job.posted_date || null,
      job.source_name,
      job.source_url,
      job.company_career_url || null,
      job.description || null,
      job.description_snippet || null,
      new Date().toISOString(),
      existing.id
    );
    return { id: existing.id, isNew: false };
  }

  const result = db.prepare(
    'INSERT INTO jobs ' +
    '(external_id, title, company, salary_min, salary_max, salary_text,' +
    ' remote_status, location, posted_date, source_name, source_url,' +
    ' company_career_url, description, description_snippet,' +
    ' hard_filter_status, status, label, score, red_flags)' +
    ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(
    job.external_id, job.title, job.company,
    job.salary_min != null ? job.salary_min : null,
    job.salary_max != null ? job.salary_max : null,
    job.salary_text || null, job.remote_status || 'unknown',
    job.location || null, job.posted_date || null,
    job.source_name, job.source_url, job.company_career_url || null,
    job.description || null, job.description_snippet || null,
    job.hard_filter_status || 'pending', job.status || 'new',
    job.label || 'unscored', job.score || 0, job.red_flags || null
  );

  return { id: Number(result.lastInsertRowid), isNew: true };
}

async function runScan(reason = 'manual') {
  if (scanInProgress) {
    logEvent('scan_skip', 'Job scan skipped because another scan is already running', { reason });
    return { skipped: true };
  }

  scanInProgress = true;
  console.log('[Scheduler] Starting job scan:', reason);
  logEvent('scan_start', 'Job scan started', { reason, timestamp: new Date().toISOString() });

  let totalFound = 0, totalRejected = 0, greenCount = 0, yellowCount = 0, updatedCount = 0, newCount = 0;

  try {
    const [ghJobs, lvJobs, ashbyJobs] = await Promise.allSettled([
      greenhouseService.scanAll(),
      leverService.scanAll(),
      ashbyService.scanAll()
    ]);

    const allJobs = [
      ...(ghJobs.status === 'fulfilled' ? ghJobs.value : []),
      ...(lvJobs.status === 'fulfilled' ? lvJobs.value : []),
      ...(ashbyJobs.status === 'fulfilled' ? ashbyJobs.value : [])
    ];

    logEvent('scan_fetch', 'Fetched ' + allJobs.length + ' raw jobs across all sources', { count: allJobs.length, reason });
    totalFound = allJobs.length;

    for (const rawJob of allJobs) {
      try {
        const { id, isNew } = upsertJob(rawJob);
        if (isNew) newCount++;
        else updatedCount++;

        const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
        const shouldScore = isNew || ['new', 'saved', 'packet_ready'].includes(job.status);
        if (!shouldScore) continue;

        const scoreResult = await scoringService.scoreAndSaveJob(job);

        if (scoreResult.filtered) {
          totalRejected++;
        } else if (scoreResult.label === 'green') {
          greenCount++;
          if (isNew) {
            const updatedJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
            await discordService.notifyGreenJob(updatedJob, scoreResult.total_score);
          }
        } else if (scoreResult.label === 'yellow') {
          yellowCount++;
        }
      } catch (jobErr) {
        logEvent('error', 'Failed to process job "' + rawJob.title + '": ' + jobErr.message, { title: rawJob.title });
      }
    }

    await discordService.notifyScanComplete({ found: totalFound, greenCount, yellowCount, rejectedCount: totalRejected });
    const summary = { found: totalFound, newCount, updatedCount, greenCount, yellowCount, rejectedCount: totalRejected, reason };
    logEvent('scan_complete',
      'Scan complete: ' + totalFound + ' found, ' + newCount + ' new, ' + updatedCount + ' updated, ' + greenCount + ' green, ' + yellowCount + ' yellow, ' + totalRejected + ' rejected',
      summary
    );
    return summary;
  } catch (err) {
    logEvent('error', 'Scan failed: ' + err.message, { error: err.message, reason });
    await discordService.notifyError('scan', err.message);
    console.error('[Scheduler] Scan error:', err);
    throw err;
  } finally {
    scanInProgress = false;
  }
}

async function runDailySystemCheck() {
  if (maintenanceInProgress) {
    logEvent('system_check_skip', 'Daily system check skipped because maintenance is already running');
    return { skipped: true };
  }

  maintenanceInProgress = true;
  logEvent('system_check_start', 'Daily system check started');

  try {
    const preferences = learningService.learnPreferences();

    const staleJobs = db.prepare(`
      SELECT COUNT(*) AS count FROM jobs
      WHERE updated_at < datetime('now', '-14 days')
        AND status IN ('new', 'saved')
    `).get().count;

    const summary = {
      preferences,
      staleJobs,
      checkedAt: new Date().toISOString()
    };

    logEvent('system_check_complete', `Daily system check complete: preferences updated, ${staleJobs} stale open jobs`, summary);
    await discordService.notifySystemLearning(summary);
    return summary;
  } catch (err) {
    logEvent('error', 'Daily system check failed: ' + err.message, { error: err.message });
    await discordService.notifyError('system-check', err.message);
    throw err;
  } finally {
    maintenanceInProgress = false;
  }
}

function scheduleJob(expression, name, task, timezone) {
  if (!cron.validate(expression)) {
    console.error('[Scheduler] Invalid cron expression for', name, expression);
    return;
  }
  cron.schedule(expression, task, { timezone });
  console.log(`[Scheduler] ${name}: ${expression} (${timezone})`);
}

function init() {
  const timezone = process.env.TZ || 'America/Los_Angeles';
  const scanSchedule = process.env.SCAN_CRON || '0 7,11,15,19 * * *';
  const urlCheckSchedule = process.env.URL_CHECK_CRON || '25 6 * * *';
  const systemCheckSchedule = process.env.SYSTEM_CHECK_CRON || '45 6 * * *';

  scheduleJob(scanSchedule, 'Live board updates', () => runScan('scheduled-live-feed'), timezone);
  scheduleJob(urlCheckSchedule, 'Daily URL check', () => urlHealthService.runDailyUrlCheck(), timezone);
  scheduleJob(systemCheckSchedule, 'Daily system learning check', () => runDailySystemCheck(), timezone);
}

module.exports = { init, runScan, runDailySystemCheck, runDailyUrlCheck: urlHealthService.runDailyUrlCheck };
