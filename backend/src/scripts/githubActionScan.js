require('dotenv').config();

const db = require('../db');
const { runScan, runDailySystemCheck } = require('../scheduler');
const discordService = require('../services/discordService');

async function main() {
  const reason = process.env.GITHUB_ACTION_SCAN_REASON || 'github-actions-scheduled';
  console.log(`[GitHubActionScan] Starting ${reason}`);

  const summary = await runScan(reason);

  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN label = 'green' THEN 1 ELSE 0 END) AS green,
      SUM(CASE WHEN label = 'yellow' THEN 1 ELSE 0 END) AS yellow,
      SUM(CASE WHEN label = 'red' THEN 1 ELSE 0 END) AS red,
      COUNT(*) AS total
    FROM jobs
  `).get();

  await discordService.sendBotChat([
    'GitHub Actions scan finished.',
    `Found this run: ${summary.found || 0}`,
    `New this run: ${summary.newCount || 0}`,
    `Green this run: ${summary.greenCount || 0}`,
    `Yellow this run: ${summary.yellowCount || 0}`,
    `Rejected this run: ${summary.rejectedCount || 0}`,
    `Runner database totals: ${counts.total || 0} total | ${counts.green || 0} green | ${counts.yellow || 0} yellow | ${counts.red || 0} red`
  ].join('\n'));

  if (process.env.RUN_SYSTEM_CHECK === 'true') {
    await runDailySystemCheck();
  }

  console.log('[GitHubActionScan] Complete');
}

main().catch(async err => {
  console.error('[GitHubActionScan] Failed:', err);
  try {
    await discordService.notifyError('github-actions-scan', err.message);
  } catch (notifyErr) {
    console.error('[GitHubActionScan] Failed to notify Discord:', notifyErr.message);
  }
  process.exit(1);
});
