const db = require('../db');
const { logEvent } = require('../routes/logs');

// ── Candidate profile constants ───────────────────────────────────────────────
const TARGET_SALARY_MIN = 80000;
const TARGET_SALARY_MAX = 130000;

const TARGET_TITLES = [
  'business operations', 'operations analyst', 'operations manager',
  'strategy & operations', 'process improvement', 'continuous improvement',
  'operational excellence', 'business performance', 'project manager',
  'program manager', 'pmo analyst', 'implementation manager',
  'implementation specialist', 'implementation consultant',
  'business intelligence', 'bi analyst', 'data analyst', 'reporting analyst',
  'kpi analyst', 'performance analyst', 'insights analyst', 'business analyst',
  'customer success', 'customer operations', 'client success',
  'onboarding specialist', 'onboarding manager', 'customer enablement',
  'training & enablement', 'business systems', 'systems analyst',
  'workflow automation', 'operations systems', 'no-code automation',
  'process automation', 'crm operations', 'revenue operations',
  'sales operations', 'ecommerce', 'digital operations', 'marketplace operations',
  'content operations', 'product operations', 'supply chain analyst',
  'procurement analyst', 'inventory analyst', 'demand planning',
  'vendor management', 'compliance analyst', 'training program',
  'learning & development', 'workforce operations', 'sop documentation',
  'quality assurance', 'quality operations'
];

const CANDIDATE_SKILLS = [
  'operations', 'process improvement', 'sop', 'training', 'compliance',
  'budget management', 'vendor coordination', 'cross-functional', 'excel',
  'power bi', 'data visualization', 'project coordination', 'implementation',
  'team leadership', 'customer success', 'business operations', 'workflow',
  'digitization', 'reporting', 'documentation', 'analysis', 'stakeholder',
  'procurement', 'inventory', 'scheduling', 'food safety', 'quality assurance'
];

const HARD_REJECT_PATTERNS = [
  { pattern: /commission[\s-]only/i,               reason: 'Commission-only compensation' },
  { pattern: /must relocate|relocation required/i, reason: 'Relocation required' },
  { pattern: /8[\s–-]+10\+?\s*years.*engineer/i,   reason: 'Senior engineering role (8-10+ years specific tech)' },
  { pattern: /phd\s+required|doctorate\s+required/i, reason: 'PhD/Doctorate required' },
  { pattern: /\b(pytorch|tensorflow|llm|cuda|gpu\s+cluster)\b/i, reason: 'Advanced ML/AI engineering skills required' },
  { pattern: /full[\s-]stack\s+engineer|senior\s+software\s+engineer/i, reason: 'Heavy software engineering role' },
  { pattern: /on[\s-]?site\s+only|no\s+remote/i,   reason: 'On-site only, no remote option' },
];

// ── Hard filter check ─────────────────────────────────────────────────────────
function hardFilter(job) {
  const text = `${job.title} ${job.description || ''} ${job.location || ''}`.toLowerCase();

  for (const { pattern, reason } of HARD_REJECT_PATTERNS) {
    if (pattern.test(text)) return { passed: false, reason };
  }

  if (job.remote_status && !['remote', 'hybrid'].includes(job.remote_status.toLowerCase())) {
    return { passed: false, reason: 'Not remote or hybrid' };
  }

  if (job.salary_max && job.salary_max < TARGET_SALARY_MIN) {
    return { passed: false, reason: `Salary too low: max $${job.salary_max.toLocaleString()} < $${TARGET_SALARY_MIN.toLocaleString()}` };
  }

  return { passed: true, reason: null };
}

// ── Scoring ───────────────────────────────────────────────────────────────────
function scoreJob(job) {
  const text = `${job.title} ${job.description || ''}`.toLowerCase();

  // 1. Title alignment (0-20)
  const titleLower = (job.title || '').toLowerCase();
  const titleScore = TARGET_TITLES.some(t => titleLower.includes(t)) ? 20
    : TARGET_TITLES.some(t => text.includes(t)) ? 12
    : 5;

  // 2. Salary alignment (0-20)
  let salaryScore = 10; // default if no salary info
  if (job.salary_min && job.salary_max) {
    const midpoint = (job.salary_min + job.salary_max) / 2;
    if (midpoint >= TARGET_SALARY_MIN && midpoint <= TARGET_SALARY_MAX) salaryScore = 20;
    else if (midpoint >= TARGET_SALARY_MIN * 0.9) salaryScore = 15;
    else if (midpoint >= TARGET_SALARY_MIN * 0.75) salaryScore = 8;
    else salaryScore = 3;
  } else if (job.salary_text && /\$/.test(job.salary_text)) {
    salaryScore = 12; // salary listed but not parsed
  }

  // 3. Remote eligibility (0-15)
  const remoteScore = (job.remote_status || '').toLowerCase() === 'remote' ? 15
    : (job.remote_status || '').toLowerCase() === 'hybrid' ? 8
    : 0;

  // 4. Experience match (0-20)
  const expPatterns = [/3[\s–-]+5\s*years/i, /2[\s–-]+4\s*years/i, /1[\s–-]+3\s*years/i, /entry[\s-]level/i, /mid[\s-]level/i];
  const seniorPatterns = [/8\+\s*years/i, /10\+\s*years/i, /senior.*engineer/i, /principal/i, /staff\s+engineer/i];
  const expScore = seniorPatterns.some(p => p.test(text)) ? 5
    : expPatterns.some(p => p.test(text)) ? 20
    : 13; // unspecified gets moderate score

  // 5. Skill match (0-15)
  const matchedSkills = CANDIDATE_SKILLS.filter(skill => text.includes(skill));
  const skillScore = Math.min(15, Math.round((matchedSkills.length / 5) * 15));

  // 6. Growth/path value (0-10)
  const growthKeywords = ['growth', 'leadership', 'career', 'advancement', 'learning', 'mentorship', 'cross-functional', 'strategy'];
  const growthCount = growthKeywords.filter(k => text.includes(k)).length;
  const growthScore = Math.min(10, growthCount * 2 + 2);

  const totalScore = titleScore + salaryScore + remoteScore + expScore + skillScore + growthScore;

  const label = totalScore >= 80 ? 'green'
    : totalScore >= 65 ? 'yellow'
    : 'red';

  // Why it matches
  const whyMatches = [];
  if (titleScore >= 15) whyMatches.push('Title aligns with target role types');
  if (salaryScore >= 15) whyMatches.push('Salary within target range');
  if (remoteScore === 15) whyMatches.push('Fully remote position');
  if (expScore >= 15) whyMatches.push('Experience level appropriate');
  if (skillScore >= 10) whyMatches.push(`Matches ${matchedSkills.length} candidate skills: ${matchedSkills.slice(0, 4).join(', ')}`);

  // Missing/weak
  const missing = [];
  if (salaryScore < 10) missing.push('Salary unclear or below target');
  if (skillScore < 8) missing.push('Limited skill keyword overlap in description');
  if (titleScore < 12) missing.push('Title partially aligned — review description carefully');

  const skillsGapLevel = matchedSkills.length >= 6 ? 'low'
    : matchedSkills.length >= 3 ? 'moderate'
    : 'high';

  return {
    title_alignment: titleScore,
    salary_alignment: salaryScore,
    remote_eligibility: remoteScore,
    experience_match: expScore,
    skill_match: skillScore,
    growth_value: growthScore,
    total_score: totalScore,
    label,
    why_it_matches: whyMatches.join('; '),
    missing_or_weak_requirements: missing.join('; ') || 'None identified',
    skills_gap_level: skillsGapLevel
  };
}

// ── Main export: score a job and save results ─────────────────────────────────
async function scoreAndSaveJob(job) {
  try {
    // Run hard filter
    const filter = hardFilter(job);
    db.prepare(`UPDATE jobs SET hard_filter_status = ?, hard_filter_reason = ?, updated_at = ? WHERE id = ?`)
      .run(filter.passed ? 'passed' : 'rejected', filter.reason, new Date().toISOString(), job.id);

    if (!filter.passed) {
      db.prepare(`UPDATE jobs SET status = 'rejected', label = 'red', score = 0, updated_at = ? WHERE id = ?`)
        .run(new Date().toISOString(), job.id);
      logEvent('filter_reject', `Job #${job.id} "${job.title}" hard-filtered: ${filter.reason}`, { jobId: job.id, reason: filter.reason });
      return { filtered: true, reason: filter.reason };
    }

    // Score the job
    const scores = scoreJob(job);

    // Persist score
    db.prepare(`
      INSERT INTO job_scores
        (job_id, title_alignment, salary_alignment, remote_eligibility,
         experience_match, skill_match, growth_value, total_score, label,
         why_it_matches, missing_or_weak_requirements, skills_gap_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.id, scores.title_alignment, scores.salary_alignment, scores.remote_eligibility,
      scores.experience_match, scores.skill_match, scores.growth_value, scores.total_score,
      scores.label, scores.why_it_matches, scores.missing_or_weak_requirements, scores.skills_gap_level
    );

    // Update job record
    db.prepare(`UPDATE jobs SET score = ?, label = ?, updated_at = ? WHERE id = ?`)
      .run(scores.total_score, scores.label, new Date().toISOString(), job.id);

    logEvent('scored', `Job #${job.id} "${job.title}" scored ${scores.total_score} → ${scores.label}`, { jobId: job.id, score: scores.total_score, label: scores.label });

    return { filtered: false, ...scores };
  } catch (err) {
    logEvent('error', `Scoring error for job #${job.id}: ${err.message}`, { jobId: job.id });
    throw err;
  }
}

module.exports = { scoreAndSaveJob, scoreJob, hardFilter };
