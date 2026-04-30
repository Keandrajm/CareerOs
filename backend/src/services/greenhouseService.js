/**
 * Greenhouse Job Board Service
 *
 * Public API — no key required.
 * https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
 */

const axios = require('axios');
const { logEvent } = require('../routes/logs');

const BASE_URL = 'https://boards-api.greenhouse.io/v1/boards';

// Remote-friendly companies with ops/CS/analyst/PM roles on Greenhouse
const COMPANY_BOARDS = [
  { token: 'stripe',       name: 'Stripe' },
  { token: 'hubspot',      name: 'HubSpot' },
  { token: 'asana',        name: 'Asana' },
  { token: 'intercom',     name: 'Intercom' },
  { token: 'gusto',        name: 'Gusto' },
  { token: 'twilio',       name: 'Twilio' },
  { token: 'coursera',     name: 'Coursera' },
  { token: 'okta',         name: 'Okta' },
  { token: 'gitlab',       name: 'GitLab' },
  { token: 'zendesk',      name: 'Zendesk' },
  { token: 'dropbox',      name: 'Dropbox' },
  { token: 'canva',        name: 'Canva' },
  { token: 'miro',         name: 'Miro' },
  { token: 'klaviyo',      name: 'Klaviyo' },
  { token: 'typeform',     name: 'Typeform' },
  // ── 5 new additions (confirmed from live boards) ──────────────────────────
  { token: 'gongio',       name: 'Gong' },
  { token: 'pagerduty',    name: 'PagerDuty' },
  { token: 'checkr',       name: 'Checkr' },
  { token: 'zapier',       name: 'Zapier' },
  { token: 'remotecom',    name: 'Remote.com' },
];

const TARGET_KEYWORDS = [
  'operations', 'analyst', 'project manager', 'program manager',
  'customer success', 'business operations', 'implementation',
  'data analyst', 'process improvement', 'onboarding specialist',
  'operations manager', 'biz ops', 'revenue operations', 'revops',
  'ops specialist', 'ops coordinator', 'client success', 'account manager'
];

async function fetchJobsFromBoard(companyToken, companyName) {
  try {
    const url = `${BASE_URL}/${companyToken}/jobs?content=true`;
    const res = await axios.get(url, { timeout: 15000 });
    const jobs = res.data.jobs || [];

    logEvent('source_scan', `Greenhouse ${companyName}: ${jobs.length} total jobs`, { source: 'greenhouse', company: companyName });

    return jobs
      .filter(j => isTargetRole(j.title))
      .map(j => normalizeGreenhouseJob(j, companyName, companyToken));
  } catch (err) {
    logEvent('error', `Greenhouse error for ${companyName}: ${err.message}`, { source: 'greenhouse', company: companyName });
    return [];
  }
}

function isTargetRole(title) {
  const t = (title || '').toLowerCase();
  return TARGET_KEYWORDS.some(kw => t.includes(kw));
}

function normalizeGreenhouseJob(raw, companyName, token) {
  const content = raw.content || '';
  const location = raw.location?.name || '';
  const isRemote = /remote/i.test(location) || /remote/i.test(content);

  const salaryMatch = content.match(/\$([0-9,]+)\s*[–\-to]+\s*\$([0-9,]+)/i);
  const salaryMin = salaryMatch ? parseInt(salaryMatch[1].replace(/,/g, '')) : null;
  const salaryMax = salaryMatch ? parseInt(salaryMatch[2].replace(/,/g, '')) : null;
  const salaryText = salaryMatch ? `$${salaryMatch[1]} - $${salaryMatch[2]}` : null;

  return {
    external_id: `gh-${raw.id}`,
    title: raw.title,
    company: companyName,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_text: salaryText,
    remote_status: isRemote ? 'remote' : 'unknown',
    location,
    posted_date: raw.updated_at ? raw.updated_at.split('T')[0] : null,
    source_name: 'Greenhouse',
    source_url: raw.absolute_url,
    company_career_url: `https://boards.greenhouse.io/${token}/jobs`,
    description: content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    description_snippet: (raw.title + ' at ' + companyName + ' — ' + location).substring(0, 200),
    hard_filter_status: 'pending',
    status: 'new',
    label: 'unscored',
    score: 0,
    red_flags: null
  };
}

async function scanAll() {
  if (COMPANY_BOARDS.length === 0) {
    logEvent('source_scan', 'Greenhouse: No company boards configured.', {});
    return [];
  }

  const allJobs = [];
  for (const board of COMPANY_BOARDS) {
    const jobs = await fetchJobsFromBoard(board.token, board.name);
    allJobs.push(...jobs);
    await new Promise(r => setTimeout(r, 600));
  }
  return allJobs;
}

module.exports = { scanAll, fetchJobsFromBoard };
