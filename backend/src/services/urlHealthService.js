const axios = require('axios');
const db = require('../db');
const discordService = require('./discordService');
const { logEvent } = require('../routes/logs');

async function checkUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, statusCode: null, error: 'Missing or invalid URL' };
  }

  try {
    const res = await axios.head(url, {
      timeout: 12000,
      maxRedirects: 5,
      validateStatus: status => status < 500
    });
    return { ok: res.status >= 200 && res.status < 400, statusCode: res.status, error: null };
  } catch (headErr) {
    try {
      const res = await axios.get(url, {
        timeout: 12000,
        maxRedirects: 5,
        validateStatus: status => status < 500
      });
      return { ok: res.status >= 200 && res.status < 400, statusCode: res.status, error: null };
    } catch (getErr) {
      return {
        ok: false,
        statusCode: getErr.response?.status || null,
        error: getErr.message
      };
    }
  }
}

function recordCheck(jobId, url, urlType, result) {
  db.prepare(`
    INSERT INTO job_url_checks (job_id, url, url_type, status_code, ok, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(jobId || null, url, urlType, result.statusCode || null, result.ok ? 1 : 0, result.error || null);
}

async function runDailyUrlCheck() {
  logEvent('url_check_start', 'Daily URL accuracy check started');

  const jobs = db.prepare(`
    SELECT id, title, company, source_url, company_career_url
    FROM jobs
    WHERE source_url IS NOT NULL
      AND status NOT IN ('rejected', 'self_applied')
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(Number(process.env.URL_CHECK_LIMIT || 150));

  let checked = 0;
  const broken = [];

  for (const job of jobs) {
    for (const [urlType, url] of [['source_url', job.source_url], ['company_career_url', job.company_career_url]]) {
      if (!url) continue;
      const result = await checkUrl(url);
      recordCheck(job.id, url, urlType, result);
      checked++;
      if (!result.ok) {
        broken.push({ jobId: job.id, title: job.title, company: job.company, urlType, url, statusCode: result.statusCode, error: result.error });
        logEvent('broken_link', `Broken ${urlType} for job #${job.id}: ${job.title}`, { jobId: job.id, url, statusCode: result.statusCode, error: result.error });
      }
      await new Promise(resolve => setTimeout(resolve, 120));
    }
  }

  const summary = { checked, brokenCount: broken.length, broken: broken.slice(0, 20) };
  logEvent('url_check_complete', `Daily URL check complete: ${checked} checked, ${broken.length} broken`, summary);
  if (broken.length > 0) {
    await discordService.notifyError('url-check', `${broken.length} CareerOS job links need review. Open Bot Logs for details.`);
  }
  return summary;
}

module.exports = { runDailyUrlCheck, checkUrl };
