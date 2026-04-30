const axios = require('axios');

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5173';
const MAX_MESSAGE_LENGTH = 1800;

function sanitizeDiscordText(value) {
  return String(value || '')
    .replace(/https:\/\/discord\.com\/api\/webhooks\/\S+/gi, '[redacted-discord-webhook]')
    .replace(/\b((?:OPENAI|ANTHROPIC|GEMINI|CAREEROS|DISCORD)[A-Z0-9_]*)=([^\s]+)/gi, '$1=[redacted]')
    .replace(/\b(sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,})\b/g, '[redacted-api-key]')
    .slice(0, MAX_MESSAGE_LENGTH);
}

function truncate(value, limit = MAX_MESSAGE_LENGTH) {
  const text = sanitizeDiscordText(value);
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

async function postWebhook(webhookUrl, payload, label) {
  if (!webhookUrl) {
    console.log(`[Discord] No ${label} webhook URL configured - skipping notification`);
    return;
  }

  const safePayload = {
    content: truncate(payload.content || ''),
    embeds: Array.isArray(payload.embeds) ? payload.embeds.slice(0, 3) : []
  };

  try {
    await axios.post(webhookUrl, safePayload, { timeout: 8000 });
  } catch (err) {
    console.error(`[Discord] Failed to send ${label} notification:`, err.message);
  }
}

async function sendDiscord(content, embeds = []) {
  await postWebhook(process.env.DISCORD_WEBHOOK_URL, { content, embeds }, 'alerts');
}

async function sendBotChat(content, embeds = []) {
  await postWebhook(process.env.DISCORD_CHAT_WEBHOOK_URL, { content, embeds }, 'bot-chat');
}

function preferenceQuestion(preferences = {}) {
  const positives = (preferences.positiveSignals || []).slice(0, 4).map(item => item.keyword).join(', ');
  const negatives = (preferences.negativeSignals || []).slice(0, 4).map(item => item.keyword).join(', ');

  if (preferences.positiveCount < 5) {
    return 'Question: I need a little more signal. Please approve, save, reject, or self-apply a few jobs today so I can learn which direction to prioritize.';
  }

  if (positives && negatives) {
    return `Question: I am seeing interest around ${positives}, and less interest around ${negatives}. Should I keep narrowing toward the positive group? Use approve/save/reject in the dashboard to teach me.`;
  }

  return 'Question: Should I keep prioritizing operations/project/process roles over broader customer success or analyst roles? Use the dashboard actions to teach me.';
}

async function notifyScanComplete({ found, greenCount, yellowCount, rejectedCount }) {
  const content = `CareerOS Scan Complete\nFound: ${found} jobs | Green: ${greenCount} | Yellow: ${yellowCount} | Rejected: ${rejectedCount}\n${DASHBOARD_URL}`;
  await sendDiscord(content);
  await sendBotChat(`Scan report: I found ${found} jobs and narrowed them to ${greenCount} Green and ${yellowCount} Yellow. I rejected ${rejectedCount} that did not fit the current criteria.\nDashboard: ${DASHBOARD_URL}`);
}

async function notifyGreenJob(job, score) {
  const content = `Green Light Job Found\n${job.title} at ${job.company}\n${job.salary_text || 'Salary not listed'} | ${job.remote_status || 'Unknown'}\nScore: ${score}/100\n${DASHBOARD_URL}/green-light`;
  await sendDiscord(content);
}

async function notifyPacketCreated(job) {
  const content = `Application Packet Ready\n${job.title} at ${job.company}\nResume draft + cover letter ready for review.\n${DASHBOARD_URL}/packets`;
  await sendDiscord(content);
  await sendBotChat(`Packet ready: ${job.title} at ${job.company}. I prepared this for manual review only. I will never submit applications automatically.`);
}

async function notifyManualApply(job) {
  const content = `Manual Apply Needed\n${job.title} at ${job.company}\nThis job is ready for you to apply manually.\n${DASHBOARD_URL}/manual-apply`;
  await sendDiscord(content);
  await sendBotChat(`Manual apply needed: ${job.title} at ${job.company}. Please review the packet before applying.`);
}

async function notifyError(context, message) {
  const content = `CareerOS Error [${context}]\n${message}`;
  await sendDiscord(content);
  await sendBotChat(`Problem report [${context}]: ${message}\nI logged this and will keep scanning other sources where possible.`);
}

async function notifySystemLearning(summary = {}) {
  const preferences = summary.preferences || {};
  const positive = (preferences.positiveSignals || []).slice(0, 5).map(item => `${item.keyword} (${item.count})`).join(', ') || 'not enough yet';
  const negative = (preferences.negativeSignals || []).slice(0, 5).map(item => `${item.keyword} (${item.count})`).join(', ') || 'not enough yet';
  const question = preferenceQuestion(preferences);

  await sendBotChat([
    'Daily learning check:',
    `Positive signals: ${positive}`,
    `Negative signals: ${negative}`,
    `Stale open jobs: ${summary.staleJobs ?? 0}`,
    question,
    `Dashboard: ${DASHBOARD_URL}`
  ].join('\n'));
}

async function notifyUrlCheck(summary = {}) {
  if (!summary.brokenCount && !summary.errors) return;
  await sendBotChat(`URL check report: ${summary.checked || 0} checked, ${summary.brokenCount || 0} broken, ${summary.errors || 0} errors. I logged the problem links for review.`);
}

module.exports = {
  sendDiscord,
  sendBotChat,
  notifyScanComplete,
  notifyGreenJob,
  notifyPacketCreated,
  notifyManualApply,
  notifyError,
  notifySystemLearning,
  notifyUrlCheck
};
