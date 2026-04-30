const cron = require('node-cron');
const db = require('./db');
const greenhouseService = require('./services/greenhouseService');
const leverService = require('./services/leverService');
const ashbyService = require('./services/ashbyService');
const scoringService = require('./services/scoringService');
const discordService = require('./services/discordService');
const { logEvent } = require('./routes/logs');

function upsertJob(job) {
  const existing = db.prepare('SELECT id FROM jobs WHERE external_id = ?').get(job.external_id);
  if (existing) return { id: existing.id, isNew: false };

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

async function runScan() {
  console.log('[Scheduler] Starting job scan...');
  logEvent('scan_start', 'Job scan started', { timestamp: new Date().toISOString() });

  let totalFound = 0, totalRejected = 0, greenCount = 0, yellowCount = 0;

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

    logEvent('scan_fetch', 'Fetched ' + allJobs.length + ' raw jobs across all sources', { count: allJobs.length });
    totalFound = allJobs.length;

    for (const rawJob of allJobs) {
      try {
        const { id, isNew } = upsertJob(rawJob);
        if (!isNew) continue;

        const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
        const scoreResult = await scoringService.scoreAndSaveJob(job);

        if (scoreResult.filtered) {
          totalRejected++;
        } else if (scoreResult.label === 'green') {
          greenCount++;
          const updatedJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
          await discordService.notifyGreenJob(updatedJob, scoreResult.total_score);
        } else if (scoreResult.label === 'yellow') {
          yellowCount++;
        }
      } catch (jobErr) {
        logEvent('error', 'Failed to process job "' + rawJob.title + '": ' + jobErr.message, { title: rawJob.title });
      }
    }

    await discordService.notifyScanComplete({ found: totalFound, greenCount, yellowCount, rejectedCount: totalRejected });
    logEvent('scan_complete',
      'Scan complete: ' + totalFound + ' found, ' + greenCount + ' green, ' + yellowCount + ' yellow, ' + totalRejected + ' rejected',
      { found: totalFound, greenCount, yellowCount, rejectedCount: totalRejected }
    );
    console.log('[Scheduler] Scan complete. Found:', totalFound, 'Green:', greenCount, 'Yellow:', yellowCount, 'Rejected:', totalRejected);
  } catch (err) {
    logEvent('error', 'Scan failed: ' + err.message, { error: err.message });
    await discordService.notifyError('scan', err.message);
    console.error('[Scheduler] Scan error:', err);
  }
}

function init() {
  const schedule = '0 9 * * *';
  if (cron.validate(schedule)) {
    cron.schedule(schedule, function() {
      console.log('[Scheduler] Cron triggered — running daily scan');
      runScan();
    });
    console.log('[Scheduler] Cron scheduled: ' + schedule + ' (server local time)');
    console.log('[Scheduler] Set TZ=America/Los_Angeles in env for Pacific time.');
  } else {
    console.error('[Scheduler] Invalid cron expression:', schedule);
  }
}

module.exports = { init, runScan };
