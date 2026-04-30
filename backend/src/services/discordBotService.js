const { Client, GatewayIntentBits, Partials } = require('discord.js');
const db = require('../db');
const learningService = require('./learningService');
const { logEvent } = require('../routes/logs');

let client = null;

function summarizeJobs() {
  const labels = db.prepare('SELECT label, COUNT(*) AS count FROM jobs GROUP BY label').all()
    .reduce((acc, row) => ({ ...acc, [row.label || 'unknown']: row.count }), {});
  const statuses = db.prepare('SELECT status, COUNT(*) AS count FROM jobs GROUP BY status').all()
    .reduce((acc, row) => ({ ...acc, [row.status || 'unknown']: row.count }), {});
  return `Green: ${labels.green || 0} | Yellow: ${labels.yellow || 0} | Red: ${labels.red || 0} | New/open: ${statuses.new || 0}`;
}

function helpText() {
  return [
    'CareerOS bot commands:',
    '`status` - show current job counts',
    '`prefer <phrase>` - boost jobs containing a phrase',
    '`avoid <phrase>` - lower jobs containing a phrase',
    '`preferences` - show current manual preferences',
    '`help` - show this menu',
    'Use dashboard buttons for strongest learning: approve, save, reject, self-applied.',
    'Safety: I can discuss, learn, report problems, and guide review. I will not auto-apply.'
  ].join('\n');
}

async function handleMessage(message) {
  if (message.author?.bot) return;
  const isDm = message.channel?.type === 1;
  const mentioned = client.user && message.mentions.users.has(client.user.id);
  if (!isDm && !mentioned) return;

  const content = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
  const lower = content.toLowerCase();

  try {
    if (!content || lower === 'help') return message.reply(helpText());
    if (lower === 'status') return message.reply(`CareerOS status: ${summarizeJobs()}`);
    if (lower === 'preferences') {
      const prefs = learningService.getManualPreferences();
      return message.reply([
        `Prefer: ${prefs.prefer.length ? prefs.prefer.join(', ') : 'none yet'}`,
        `Avoid: ${prefs.avoid.length ? prefs.avoid.join(', ') : 'none yet'}`
      ].join('\n'));
    }

    const preferMatch = content.match(/^prefer\s+(.+)/i);
    if (preferMatch) {
      learningService.addManualPreference('prefer', preferMatch[1], `discord:${message.author.id}`);
      return message.reply(`Got it. I will give extra weight to jobs mentioning: "${preferMatch[1].trim()}".`);
    }

    const avoidMatch = content.match(/^avoid\s+(.+)/i);
    if (avoidMatch) {
      learningService.addManualPreference('avoid', avoidMatch[1], `discord:${message.author.id}`);
      return message.reply(`Got it. I will be more cautious with jobs mentioning: "${avoidMatch[1].trim()}".`);
    }

    return message.reply('I can help with `status`, `prefer <phrase>`, `avoid <phrase>`, and `preferences`. For exact job decisions, use the dashboard so I can learn from the right records.');
  } catch (err) {
    logEvent('error', `Discord bot message error: ${err.message}`, { authorId: message.author?.id });
    return message.reply('I hit an error while processing that. I logged it and will keep running.');
  }
}

function init() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log('[DiscordBot] No DISCORD_BOT_TOKEN configured - bot listener disabled');
    return null;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
  });

  client.once('ready', () => {
    console.log(`[DiscordBot] Logged in as ${client.user.tag}`);
    logEvent('system_check', 'Discord bot listener connected', { bot: client.user.tag });
  });

  client.on('messageCreate', handleMessage);
  client.login(token).catch(err => {
    console.error('[DiscordBot] Login failed:', err.message);
    logEvent('error', `Discord bot login failed: ${err.message}`, {});
  });

  return client;
}

module.exports = { init };
