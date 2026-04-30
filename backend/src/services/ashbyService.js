/**
 * Ashby Job Board Service
 *
 * Public API - no key required.
 * https://api.ashbyhq.com/posting-api/job-board/{slug}
 */

const axios = require('axios');
const { logEvent } = require('../routes/logs');

const BASE_URL = 'https://api.ashbyhq.com/posting-api/job-board';

// Slugs are verified against https://api.ashbyhq.com/posting-api/job-board/{slug}.
const COMPANY_SLUGS = [
  { slug: 'ramp',           name: 'Ramp' },
  { slug: 'retool',         name: 'Retool' },
  { slug: 'linear',         name: 'Linear' },
  { slug: 'loom',           name: 'Loom' },
  { slug: 'mercury',        name: 'Mercury' },
  { slug: 'deel',           name: 'Deel' },
  { slug: 'replit',         name: 'Replit' },
  { slug: 'openai',         name: 'OpenAI' },
  { slug: 'cohere',         name: 'Cohere' },
  { slug: 'frontcareers',   name: 'Front' },
  { slug: 'cursor',         name: 'Cursor' },
  { slug: 'clickup',        name: 'ClickUp' },
  { slug: 'perplexity',     name: 'Perplexity' },
  { slug: 'sentry',         name: 'Sentry' },
  { slug: 'vercel',         name: 'Vercel' },
  { slug: 'zapier',         name: 'Zapier' },
  { slug: 'mistral',        name: 'Mistral AI' },
  { slug: 'notion',         name: 'Notion' },
  { slug: '1password',      name: '1Password' },
  { slug: 'writer',         name: 'Writer' },
  { slug: 'supabase',       name: 'Supabase' },
  { slug: 'betterup',       name: 'BetterUp' },
  { slug: 'modal',          name: 'Modal' },
  { slug: 'incident',       name: 'incident.io' },
  { slug: 'posthog',        name: 'PostHog' },
  { slug: 'hightouch',      name: 'Hightouch' },
  { slug: 'airtable',       name: 'Airtable' },
];

const TARGET_KEYWORDS = [
  'operations', 'analyst', 'project manager', 'program manager',
  'customer success', 'business operations', 'implementation',
  'data analyst', 'process improvement', 'onboarding specialist',
  'operations manager', 'biz ops', 'revenue operations', 'revops',
  'ops specialist', 'ops coordinator', 'client success', 'account manager',
  'business analyst', 'enablement', 'customer education', 'support operations'
];

async function fetchJobsFromSlug(slug, companyName) {
  try {
    const url = `${BASE_URL}/${slug}`;
    const res = await axios.get(url, { timeout: 15000 });
    const jobs = res.data.jobs || [];

    logEvent('source_scan', `Ashby ${companyName}: ${jobs.length} total jobs`, { source: 'ashby', company: companyName });

    return jobs
      .filter(j => isTargetRole(j.title))
      .map(j => normalizeAshbyJob(j, companyName, slug));
  } catch (err) {
    logEvent('error', `Ashby error for ${companyName}: ${err.message}`, { source: 'ashby', company: companyName });
    return [];
  }
}

function isTargetRole(title) {
  const t = (title || '').toLowerCase();
  return TARGET_KEYWORDS.some(kw => t.includes(kw));
}

function normalizeAshbyJob(raw, companyName, slug) {
  const isRemote = raw.isRemote === true || /remote/i.test(raw.location || '');
  const descText = (raw.descriptionPlain || raw.jobDescription || '')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const salaryMatch = descText.match(/\$([0-9,]+)\s*(?:-|to|\u2013)\s*\$([0-9,]+)/i);
  const salaryMin = salaryMatch ? parseInt(salaryMatch[1].replace(/,/g, ''), 10) : null;
  const salaryMax = salaryMatch ? parseInt(salaryMatch[2].replace(/,/g, ''), 10) : null;

  const postedDate = raw.publishedAt
    ? new Date(raw.publishedAt).toISOString().split('T')[0]
    : null;

  return {
    external_id: `ashby-${raw.id}`,
    title: raw.title,
    company: companyName,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_text: salaryMatch ? `$${salaryMatch[1]} - $${salaryMatch[2]}` : null,
    remote_status: isRemote ? 'remote' : 'unknown',
    location: raw.location || '',
    posted_date: postedDate,
    source_name: 'Ashby',
    source_url: raw.jobUrl || `https://jobs.ashbyhq.com/${slug}/${raw.id}`,
    company_career_url: `https://jobs.ashbyhq.com/${slug}`,
    description: descText,
    description_snippet: `${raw.title} at ${companyName} - ${raw.location || ''}`.substring(0, 200),
    hard_filter_status: 'pending',
    status: 'new',
    label: 'unscored',
    score: 0,
    red_flags: null
  };
}

async function scanAll() {
  if (COMPANY_SLUGS.length === 0) {
    logEvent('source_scan', 'Ashby: No company slugs configured.', {});
    return [];
  }

  const allJobs = [];
  for (const co of COMPANY_SLUGS) {
    const jobs = await fetchJobsFromSlug(co.slug, co.name);
    allJobs.push(...jobs);
    await new Promise(r => setTimeout(r, 600));
  }
  return allJobs;
}

module.exports = { scanAll, fetchJobsFromSlug, COMPANY_SLUGS };
