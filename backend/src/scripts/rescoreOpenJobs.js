const scoringService = require('../services/scoringService');
const db = require('../db');
const { logEvent } = require('../routes/logs');

async function main() {
  const jobs = db.prepare(`
    SELECT * FROM jobs
    WHERE status IN ('new', 'saved', 'packet_ready', 'approved')
    ORDER BY created_at DESC
  `).all();

  const summary = { total: jobs.length, rescored: 0, filtered: 0, errors: 0 };
  for (const job of jobs) {
    try {
      const result = await scoringService.scoreAndSaveJob(job);
      if (result.filtered) summary.filtered += 1;
      else summary.rescored += 1;
    } catch (err) {
      summary.errors += 1;
      logEvent('error', `Rescore failed for job #${job.id}: ${err.message}`, { jobId: job.id });
    }
  }

  logEvent('system_check', `Open jobs rescored with narrowed fit criteria: ${summary.rescored} rescored, ${summary.filtered} filtered`, summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
