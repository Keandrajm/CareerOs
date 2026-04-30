/**
 * Lever Job Board Service
 *
 * Public API - no key required.
 * https://api.lever.co/v0/postings/{slug}?mode=json
 */

const axios = require('axios');
const { logEvent } = require('../routes/logs');
const { shouldIngestTitle } = require('./fitCriteria');

const BASE_URL = 'https://api.lever.co/v0/postings';

// Slugs are verified against https://api.lever.co/v0/postings/{slug}?mode=json.
const COMPANY_SLUGS = [
  { slug: 'spotify',        name: 'Spotify' },
  { slug: 'plaid',          name: 'Plaid' },
];

async function fetchJobsFromSlug(slug, companyName) {
  try {
    const url = `${BASE_URL}/${slug}?mode=json&limit=250`;
    const res = await axios.get(url, { timeout: 15000 });
    const postings = Array.isArray(res.data) ? res.data : (res.data.data || []);

    logEvent('source_scan', `Lever ${companyName}: ${postings.length} total jobs`, { source: 'lever', company: companyName });

    return postings
      .filter(p => isTargetRole(p.text))
      .map(p => normalizeLeverJob(p, companyName, slug));
  } catch (err) {
    logEvent('error', `Lever error for ${companyName}: ${err.message}`, { source: 'lever', company: companyName });
    return [];
  }
}

function isTargetRole(title) {
  return shouldIngestTitle(title || '');
}

function normalizeLeverJob(raw, companyName, slug) {
  const descriptionHTML = (raw.descriptionPlain || raw.description || '');
  const isRemote = /remote/i.test(raw.workplaceType || '') || /remote/i.test(raw.categories?.location || '');
  const location = raw.categories?.location || raw.workplaceType || '';

  const salaryMatch = descriptionHTML.match(/\$([0-9,]+)\s*(?:-|to|\u2013)\s*\$([0-9,]+)/i);
  const salaryMin = salaryMatch ? parseInt(salaryMatch[1].replace(/,/g, ''), 10) : null;
  const salaryMax = salaryMatch ? parseInt(salaryMatch[2].replace(/,/g, ''), 10) : null;

  const postedDate = raw.createdAt
    ? new Date(raw.createdAt).toISOString().split('T')[0]
    : null;

  return {
    external_id: `lever-${raw.id}`,
    title: raw.text,
    company: companyName,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_text: salaryMatch ? `$${salaryMatch[1]} - $${salaryMatch[2]}` : null,
    remote_status: isRemote ? 'remote' : 'unknown',
    location,
    posted_date: postedDate,
    source_name: 'Lever',
    source_url: raw.hostedUrl || `https://jobs.lever.co/${slug}/${raw.id}`,
    company_career_url: `https://jobs.lever.co/${slug}`,
    description: descriptionHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    description_snippet: `${raw.text} at ${companyName} - ${location}`.substring(0, 200),
    hard_filter_status: 'pending',
    status: 'new',
    label: 'unscored',
    score: 0,
    red_flags: null
  };
}

async function scanAll() {
  if (COMPANY_SLUGS.length === 0) {
    logEvent('source_scan', 'Lever: No company slugs configured.', {});
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
