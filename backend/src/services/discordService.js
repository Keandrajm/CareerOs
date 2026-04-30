const axios = require('axios');

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5173';

async function sendDiscord(content, embeds = []) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Discord] No webhook URL configured — skipping notification');
    return;
  }
  try {
    await axios.post(webhookUrl, { content, embeds }, { timeout: 8000 });
  } catch (err) {
    console.error('[Discord] Failed to send notification:', err.message);
  }
}

async function notifyScanComplete({ found, greenCount, yellowCount, rejectedCount }) {
  const content = `✅ **CareerOS Scan Complete**\n📊 Found: **${found}** jobs | 🟢 Green: **${greenCount}** | 🟡 Yellow: **${yellowCount}** | 🔴 Rejected: **${rejectedCount}**\n🔗 ${DASHBOARD_URL}`;
  await sendDiscord(content);
}

async function notifyGreenJob(job, score) {
  const content = `🟢 **Green Light Job Found!**\n**${job.title}** at **${job.company}**\n💰 ${job.salary_text || 'Salary not listed'} | 🌐 ${job.remote_status || 'Unknown'}\n⭐ Score: **${score}/100**\n🔗 ${DASHBOARD_URL}/green-light`;
  await sendDiscord(content);
}

async function notifyPacketCreated(job) {
  const content = `📦 **Application Packet Ready**\n**${job.title}** at **${job.company}**\nResume draft + cover letter ready for review.\n🔗 ${DASHBOARD_URL}/packets`;
  await sendDiscord(content);
}

async function notifyManualApply(job) {
  const content = `📝 **Manual Apply Needed**\n**${job.title}** at **${job.company}**\nThis job is ready for you to apply manually.\n🔗 ${DASHBOARD_URL}/manual-apply`;
  await sendDiscord(content);
}

async function notifyError(context, message) {
  const content = `⚠️ **CareerOS Error** [${context}]\n${message}`;
  await sendDiscord(content);
}

module.exports = {
  notifyScanComplete,
  notifyGreenJob,
  notifyPacketCreated,
  notifyManualApply,
  notifyError
};
