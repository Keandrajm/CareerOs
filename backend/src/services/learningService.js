const db = require('../db');
const { logEvent } = require('../routes/logs');

const POSITIVE_STATUSES = new Set(['approved', 'self_applied', 'packet_ready']);
const NEGATIVE_STATUSES = new Set(['rejected']);

const KEYWORD_POOL = [
  'operations', 'project manager', 'program manager', 'implementation',
  'customer success', 'business operations', 'data analyst', 'reporting',
  'power bi', 'excel', 'process improvement', 'sop', 'training',
  'compliance', 'vendor', 'workflow', 'automation', 'revenue operations',
  'customer operations', 'onboarding', 'enablement', 'quality',
  'procurement', 'inventory', 'business analyst', 'systems analyst'
];

function countKeywordHits(jobs) {
  const counts = {};
  for (const job of jobs) {
    const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();
    for (const keyword of KEYWORD_POOL) {
      if (text.includes(keyword)) counts[keyword] = (counts[keyword] || 0) + 1;
    }
  }
  return counts;
}

function topEntries(counts, limit = 10) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword, count]) => ({ keyword, count }));
}

function learnPreferences() {
  const rows = db.prepare(`
    SELECT j.*, ua.action AS approval_action
    FROM jobs j
    LEFT JOIN user_approvals ua ON ua.job_id = j.id
    WHERE j.status IN ('approved', 'self_applied', 'packet_ready', 'rejected')
       OR ua.action IN ('approved', 'self_applied', 'rejected')
    ORDER BY j.updated_at DESC
    LIMIT 500
  `).all();

  const positiveJobs = rows.filter(job => POSITIVE_STATUSES.has(job.status) || ['approved', 'self_applied'].includes(job.approval_action));
  const negativeJobs = rows.filter(job => NEGATIVE_STATUSES.has(job.status) || job.approval_action === 'rejected');

  const positiveKeywords = topEntries(countKeywordHits(positiveJobs));
  const negativeKeywords = topEntries(countKeywordHits(negativeJobs));

  const positiveCompanies = topEntries(
    positiveJobs.reduce((acc, job) => {
      if (job.company) acc[job.company] = (acc[job.company] || 0) + 1;
      return acc;
    }, {}),
    8
  );

  const preferredSources = topEntries(
    positiveJobs.reduce((acc, job) => {
      if (job.source_name) acc[job.source_name] = (acc[job.source_name] || 0) + 1;
      return acc;
    }, {}),
    5
  );

  const insight = {
    positiveSignals: positiveKeywords,
    negativeSignals: negativeKeywords,
    preferredCompanies: positiveCompanies,
    preferredSources,
    sampleSize: rows.length,
    positiveCount: positiveJobs.length,
    negativeCount: negativeJobs.length,
    updatedAt: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO system_insights (insight_key, insight_json, updated_at)
    VALUES ('active_preferences', ?, ?)
    ON CONFLICT(insight_key) DO UPDATE SET
      insight_json = excluded.insight_json,
      updated_at = excluded.updated_at
  `).run(JSON.stringify(insight), insight.updatedAt);

  logEvent('system_learning', 'Daily preference learning completed', insight);
  return insight;
}

function getActivePreferences() {
  const row = db.prepare(`SELECT insight_json FROM system_insights WHERE insight_key = 'active_preferences'`).get();
  if (!row?.insight_json) return null;
  try {
    return JSON.parse(row.insight_json);
  } catch {
    return null;
  }
}

function getManualPreferences() {
  const row = db.prepare(`SELECT insight_json FROM system_insights WHERE insight_key = 'manual_discord_preferences'`).get();
  if (!row?.insight_json) return { prefer: [], avoid: [], notes: [], updatedAt: null };
  try {
    const parsed = JSON.parse(row.insight_json);
    return {
      prefer: Array.isArray(parsed.prefer) ? parsed.prefer : [],
      avoid: Array.isArray(parsed.avoid) ? parsed.avoid : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      updatedAt: parsed.updatedAt || null
    };
  } catch {
    return { prefer: [], avoid: [], notes: [], updatedAt: null };
  }
}

function saveManualPreferences(preferences) {
  const payload = {
    prefer: [...new Set((preferences.prefer || []).map(item => String(item).toLowerCase().trim()).filter(Boolean))].slice(0, 50),
    avoid: [...new Set((preferences.avoid || []).map(item => String(item).toLowerCase().trim()).filter(Boolean))].slice(0, 50),
    notes: (preferences.notes || []).slice(-50),
    updatedAt: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO system_insights (insight_key, insight_json, updated_at)
    VALUES ('manual_discord_preferences', ?, ?)
    ON CONFLICT(insight_key) DO UPDATE SET
      insight_json = excluded.insight_json,
      updated_at = excluded.updated_at
  `).run(JSON.stringify(payload), payload.updatedAt);

  logEvent('system_learning', 'Discord manual preferences updated', payload);
  return payload;
}

function addManualPreference(type, phrase, source = 'discord') {
  const cleanPhrase = String(phrase || '').toLowerCase().trim().replace(/^["']|["']$/g, '');
  if (!cleanPhrase || cleanPhrase.length < 2) throw new Error('Preference phrase is too short');

  const preferences = getManualPreferences();
  const note = { type, phrase: cleanPhrase, source, createdAt: new Date().toISOString() };
  if (type === 'prefer') preferences.prefer.push(cleanPhrase);
  else if (type === 'avoid') preferences.avoid.push(cleanPhrase);
  preferences.notes.push(note);
  return saveManualPreferences(preferences);
}

function applyPreferenceAdjustment(job, scores) {
  const preferences = getActivePreferences();
  const manualPreferences = getManualPreferences();
  if ((!preferences || preferences.sampleSize < 3) && manualPreferences.prefer.length === 0 && manualPreferences.avoid.length === 0) {
    return { ...scores, preference_adjustment: 0 };
  }

  const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();
  let adjustment = 0;
  const reasons = [];

  for (const phrase of manualPreferences.prefer || []) {
    if (text.includes(phrase)) {
      adjustment += 2;
      reasons.push(`manual prefer: ${phrase}`);
    }
  }

  for (const phrase of manualPreferences.avoid || []) {
    if (text.includes(phrase)) {
      adjustment -= 3;
      reasons.push(`manual avoid: ${phrase}`);
    }
  }

  for (const signal of preferences?.positiveSignals || []) {
    if (signal.count >= 2 && text.includes(signal.keyword)) {
      adjustment += 1;
      reasons.push(`positive signal: ${signal.keyword}`);
    }
  }

  for (const signal of preferences?.negativeSignals || []) {
    if (signal.count >= 2 && text.includes(signal.keyword)) {
      adjustment -= 1;
      reasons.push(`negative signal: ${signal.keyword}`);
    }
  }

  if ((preferences?.preferredCompanies || []).some(item => item.keyword === job.company && item.count >= 2)) {
    adjustment += 2;
    reasons.push(`preferred company: ${job.company}`);
  }

  adjustment = Math.max(-6, Math.min(6, adjustment));
  if (adjustment === 0) return { ...scores, preference_adjustment: 0 };

  const total = Math.max(0, Math.min(100, scores.total_score + adjustment));
  const label = total >= 80 ? 'green' : total >= 65 ? 'yellow' : 'red';

  return {
    ...scores,
    total_score: total,
    label,
    preference_adjustment: adjustment,
    why_it_matches: [scores.why_it_matches, `Preference learning adjusted score by ${adjustment}: ${reasons.slice(0, 3).join(', ')}`]
      .filter(Boolean)
      .join('; ')
  };
}

module.exports = { learnPreferences, getActivePreferences, getManualPreferences, addManualPreference, applyPreferenceAdjustment };
