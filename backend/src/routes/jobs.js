const express = require('express');
const router = express.Router();
const db = require('../db');
const scoringService = require('../services/scoringService');
const packetService = require('../services/packetService');
const { logEvent } = require('./logs');
const { runScan } = require('../scheduler');

router.get('/', (req, res) => {
  try {
    const {
      status,
      label,
      minScore,
      source,
      company,
      search,
      title,
      remoteStatus,
      salaryMin,
      salaryMax,
      postedAfter,
      postedBefore
    } = req.query;
    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];
    if (status)   { query += ' AND status = ?';              params.push(status); }
    if (label)    { query += ' AND label = ?';               params.push(label); }
    if (source)   { query += ' AND source_name = ?';         params.push(source); }
    if (company)  { query += ' AND company LIKE ?';          params.push('%'+company+'%'); }
    if (title)    { query += ' AND title LIKE ?';            params.push('%'+title+'%'); }
    if (remoteStatus) { query += ' AND remote_status = ?';   params.push(remoteStatus); }
    if (minScore) { query += ' AND score >= ?';              params.push(parseFloat(minScore)); }
    if (salaryMin) { query += ' AND COALESCE(salary_max, salary_min, 0) >= ?'; params.push(parseFloat(salaryMin)); }
    if (salaryMax) { query += ' AND COALESCE(salary_min, salary_max, 999999999) <= ?'; params.push(parseFloat(salaryMax)); }
    if (postedAfter) { query += ' AND posted_date IS NOT NULL AND posted_date >= ?'; params.push(postedAfter); }
    if (postedBefore) { query += ' AND posted_date IS NOT NULL AND posted_date <= ?'; params.push(postedBefore); }
    if (search) {
      query += ' AND (title LIKE ? OR company LIKE ? OR description_snippet LIKE ?)';
      const s = '%'+search+'%';
      params.push(s, s, s);
    }
    query += ' ORDER BY created_at DESC';
    const jobs = db.prepare(query).all(...params);
    const enriched = jobs.map(job => {
      const scoreRow = db.prepare('SELECT * FROM job_scores WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(job.id);
      return Object.assign({}, job, { scoreDetails: scoreRow || null });
    });
    res.json({ count: enriched.length, jobs: enriched });
  } catch (err) {
    console.error('[jobs] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const scoreRow    = db.prepare('SELECT * FROM job_scores WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(job.id);
    const packet      = db.prepare('SELECT * FROM application_packets WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(job.id);
    const resume      = db.prepare('SELECT * FROM resume_versions WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(job.id);
    const coverLetter = db.prepare('SELECT * FROM cover_letters WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(job.id);
    const approval    = db.prepare('SELECT * FROM user_approvals WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(job.id);
    res.json(Object.assign({}, job, { scoreDetails: scoreRow, packet, resume, coverLetter, latestApproval: approval }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ingest/sample', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sampleJobs = [
      {
        external_id: 'sample-001',
        title: 'Business Operations Analyst',
        company: 'Acme Health Tech',
        salary_min: 85000, salary_max: 105000,
        salary_text: '$85,000 - $105,000/yr',
        remote_status: 'remote', location: 'Remote - US',
        posted_date: today, source_name: 'Greenhouse',
        source_url: 'https://boards.greenhouse.io/acmehealthtech/jobs/123456',
        company_career_url: 'https://acmehealthtech.com/careers',
        description: 'Seeking a Business Operations Analyst to analyze workflows, build Excel and Power BI reports, coordinate cross-functional projects, and implement process improvements. SOP documentation and stakeholder management preferred. Remote, full-time.',
        description_snippet: 'Analyze workflows, build Power BI reports, coordinate projects, implement process improvements.',
        hard_filter_status: 'passed', hard_filter_reason: null,
        status: 'new', label: 'green', score: 88, red_flags: null
      },
      {
        external_id: 'sample-002',
        title: 'Customer Success Manager',
        company: 'CloudFlow SaaS',
        salary_min: 90000, salary_max: 115000,
        salary_text: '$90,000 - $115,000/yr',
        remote_status: 'remote', location: 'Remote - US',
        posted_date: today, source_name: 'Lever',
        source_url: 'https://jobs.lever.co/cloudflow/789abc',
        company_career_url: 'https://cloudflow.com/jobs',
        description: 'Customer Success Manager to manage SMB and mid-market clients, onboard customers, drive adoption, analyze usage data, and partner with ops teams. Strong communication, data analysis, and project coordination required. Fully remote.',
        description_snippet: 'Manage client portfolio, drive onboarding and adoption, analyze usage data, coordinate with ops.',
        hard_filter_status: 'passed', hard_filter_reason: null,
        status: 'new', label: 'green', score: 83, red_flags: null
      },
      {
        external_id: 'sample-003',
        title: 'Operations Project Manager',
        company: 'RetailEdge Corp',
        salary_min: 75000, salary_max: 92000,
        salary_text: '$75,000 - $92,000/yr',
        remote_status: 'remote', location: 'Remote - US',
        posted_date: today, source_name: 'Ashby',
        source_url: 'https://jobs.ashbyhq.com/retailedge/456def',
        company_career_url: 'https://retailedge.com/careers',
        description: 'Manage cross-functional operational projects from planning through execution. Coordinate vendors, finance, and leadership. Develop project timelines, SOPs, and performance metrics. 3-5 years ops or PM experience required. Remote, full-time.',
        description_snippet: 'Manage operational projects, coordinate vendors and finance, develop SOPs and metrics.',
        hard_filter_status: 'passed', hard_filter_reason: null,
        status: 'new', label: 'yellow', score: 72, red_flags: null
      },
      {
        external_id: 'sample-004',
        title: 'Data Analyst - Operations',
        company: 'Horizon Logistics',
        salary_min: 78000, salary_max: 98000,
        salary_text: '$78,000 - $98,000/yr',
        remote_status: 'remote', location: 'Remote - US',
        posted_date: today, source_name: 'Greenhouse',
        source_url: 'https://boards.greenhouse.io/horizonlogistics/jobs/654321',
        company_career_url: 'https://horizonlogistics.com/jobs',
        description: 'Analyze operational data to identify trends and improvement opportunities. Build dashboards in Power BI or Tableau. Present findings to leadership. Excel, SQL basics, and data visualization required. Operations background a plus. Remote.',
        description_snippet: 'Analyze ops data, build Power BI dashboards, present to leadership, identify efficiencies.',
        hard_filter_status: 'passed', hard_filter_reason: null,
        status: 'new', label: 'yellow', score: 70, red_flags: null
      },
      {
        external_id: 'sample-005',
        title: 'Senior Machine Learning Engineer',
        company: 'DeepStack AI',
        salary_min: 180000, salary_max: 220000,
        salary_text: '$180,000 - $220,000/yr',
        remote_status: 'remote', location: 'Remote - US',
        posted_date: today, source_name: 'Lever',
        source_url: 'https://jobs.lever.co/deepstack/999xyz',
        company_career_url: 'https://deepstack.ai/jobs',
        description: 'Senior ML Engineer with 8+ years of Python, PyTorch, and distributed systems experience. PhD preferred. Strong coding background required.',
        description_snippet: 'Senior ML engineer, 8+ years Python/PyTorch, distributed systems, PhD preferred.',
        hard_filter_status: 'rejected',
        hard_filter_reason: 'Heavy ML engineering role; requires advanced coding; PhD preferred.',
        status: 'rejected', label: 'red', score: 10,
        red_flags: 'Requires 8+ years ML engineering; PhD preferred; advanced coding required'
      }
    ];

    const insert = db.prepare(
      'INSERT OR IGNORE INTO jobs ' +
      '(external_id, title, company, salary_min, salary_max, salary_text,' +
      ' remote_status, location, posted_date, source_name, source_url,' +
      ' company_career_url, description, description_snippet,' +
      ' hard_filter_status, hard_filter_reason, status, label, score, red_flags)' +
      ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );

    let inserted = 0;
    db.exec('BEGIN');
    try {
      for (const j of sampleJobs) {
        const r = insert.run(
          j.external_id, j.title, j.company, j.salary_min, j.salary_max, j.salary_text,
          j.remote_status, j.location, j.posted_date, j.source_name, j.source_url,
          j.company_career_url, j.description, j.description_snippet,
          j.hard_filter_status, j.hard_filter_reason, j.status, j.label, j.score, j.red_flags
        );
        if (r.changes > 0) inserted++;
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    logEvent('ingest', 'Sample ingest: ' + inserted + ' jobs loaded', { count: inserted });
    res.json({ message: inserted + ' sample jobs loaded', inserted });
  } catch (err) {
    console.error('[jobs] ingest/sample error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/scan', async (req, res) => {
  try {
    res.json({ status: 'started', message: 'Job scan triggered. Check /api/logs for progress.' });
    runScan().catch(err => console.error('[scan] Error:', err));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rescore/open', async (req, res) => {
  try {
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
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/score', async (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const result = await scoringService.scoreAndSaveJob(job);
    res.json({ message: 'Job scored', score: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/packet', async (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const packet = await packetService.createPacket(job);
    res.json({ message: 'Packet created', packet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
