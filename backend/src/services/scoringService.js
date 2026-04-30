const db = require('../db');
const { logEvent } = require('../routes/logs');
const learningService = require('./learningService');
const {
  TARGET_SALARY_MIN,
  TARGET_SALARY_MAX,
  CORE_SKILLS,
  ADVANCED_TECH_REQUIREMENTS,
  AVOID_TITLE_PATTERNS,
  titleBucket
} = require('./fitCriteria');

const HARD_REJECT_PATTERNS = [
  { pattern: /commission[\s-]only/i, reason: 'Commission-only compensation' },
  { pattern: /must relocate|relocation required/i, reason: 'Relocation required' },
  { pattern: /8[\s\u2013-]+10\+?\s*years.*engineer/i, reason: 'Senior engineering role (8-10+ years specific tech)' },
  { pattern: /phd\s+required|doctorate\s+required/i, reason: 'PhD/Doctorate required' },
  { pattern: /\b(pytorch|tensorflow|llm|cuda|gpu\s+cluster)\b/i, reason: 'Advanced ML/AI engineering skills required' },
  { pattern: /full[\s-]stack\s+engineer|senior\s+software\s+engineer/i, reason: 'Heavy software engineering role' },
  { pattern: /on[\s-]?site\s+only|no\s+remote/i, reason: 'On-site only, no remote option' }
];

function hardFilter(job) {
  const text = `${job.title} ${job.description || ''} ${job.location || ''}`.toLowerCase();

  for (const { pattern, reason } of HARD_REJECT_PATTERNS) {
    if (pattern.test(text)) return { passed: false, reason };
  }

  const titleAvoid = AVOID_TITLE_PATTERNS.find(({ pattern }) => pattern.test(job.title || ''));
  if (titleAvoid) return { passed: false, reason: titleAvoid.reason };

  const bucket = titleBucket(job.title, job.description);
  if (bucket.bucket === 'weak') {
    return { passed: false, reason: bucket.reason };
  }

  if ((job.remote_status || '').toLowerCase() !== 'remote') {
    return { passed: false, reason: 'Not confirmed remote' };
  }

  if (/\b(part[\s-]?time|contract only|temporary|seasonal)\b/i.test(text)) {
    return { passed: false, reason: 'Not confirmed full-time' };
  }

  if (/\b(no us|not available in (the )?us|canada only|uk only|europe only|must be located outside the us)\b/i.test(text)) {
    return { passed: false, reason: 'Not U.S. or California eligible' };
  }

  const location = (job.location || '').toLowerCase();
  const outsideUSLocation = /\b(canada|chile|united arab emirates|uae|india|united kingdom|uk|europe|emea|apac|australia|brazil|mexico|germany|france|ireland|netherlands|singapore)\b/i;
  const usLocation = /\b(united states|usa|u\.s\.|us remote|remote - us|remote, us|california|ca\b|new york|ny\b|denver|co\b|washington|seattle|chicago|illinois)\b/i;
  if (outsideUSLocation.test(location) && !usLocation.test(location)) {
    return { passed: false, reason: 'Location appears outside U.S. eligibility' };
  }

  if (job.posted_date) {
    const posted = new Date(job.posted_date + 'T00:00:00Z');
    const cutoff = new Date(Date.now() - 7 * 86400000);
    if (!Number.isNaN(posted.getTime()) && posted < cutoff) {
      return { passed: false, reason: 'Posted more than 7 days ago' };
    }
  }

  if (job.salary_max && job.salary_max < TARGET_SALARY_MIN) {
    return { passed: false, reason: `Salary too low: max $${job.salary_max.toLocaleString()} < $${TARGET_SALARY_MIN.toLocaleString()}` };
  }

  if (!job.salary_text && !job.salary_min && !job.salary_max) {
    logEvent('missing_salary', `Job #${job.id || '?'} "${job.title}" has no visible salary`, { jobId: job.id, title: job.title });
  }

  return { passed: true, reason: null };
}

function scoreJob(job) {
  const text = `${job.title} ${job.description || ''}`.toLowerCase();

  const titleFit = titleBucket(job.title, job.description);
  const titleScore = titleFit.bucket === 'strong' ? 20
    : titleFit.bucket === 'secondary' ? 14
    : titleFit.bucket === 'weak' ? 6
    : 0;

  let salaryScore = 8;
  if (job.salary_min && job.salary_max) {
    const midpoint = (job.salary_min + job.salary_max) / 2;
    if (midpoint >= TARGET_SALARY_MIN && midpoint <= TARGET_SALARY_MAX) salaryScore = 20;
    else if (midpoint >= TARGET_SALARY_MIN * 0.9) salaryScore = 15;
    else if (midpoint >= TARGET_SALARY_MIN * 0.75) salaryScore = 8;
    else salaryScore = 3;
  } else if (job.salary_text && /\$/.test(job.salary_text)) {
    salaryScore = 12;
  }

  const remoteScore = (job.remote_status || '').toLowerCase() === 'remote' ? 15
    : (job.remote_status || '').toLowerCase() === 'hybrid' ? 8
    : 0;

  const expPatterns = [/3[\s\u2013-]+5\s*years/i, /2[\s\u2013-]+4\s*years/i, /1[\s\u2013-]+3\s*years/i, /entry[\s-]level/i, /associate/i, /mid[\s-]level/i];
  const stretchPatterns = [/5\+\s*years/i, /5[\s\u2013-]+7\s*years/i, /\bii\b/i, /\biii\b/i];
  const seniorPatterns = [/7\+\s*years/i, /8\+\s*years/i, /10\+\s*years/i, /\b(sr\.?|senior)\b/i, /director/i, /principal/i, /staff/i, /head of/i, /vice president|vp/i];
  const expScore = seniorPatterns.some(p => p.test(text)) ? 5
    : stretchPatterns.some(p => p.test(text)) ? 12
    : expPatterns.some(p => p.test(text)) ? 20
    : 14;

  const matchedSkills = CORE_SKILLS.filter(skill => text.includes(skill));
  let skillScore = Math.min(15, Math.round((matchedSkills.length / 7) * 15));
  const advancedTechHits = ADVANCED_TECH_REQUIREMENTS.filter(pattern => pattern.test(text)).length;
  if (advancedTechHits >= 2) skillScore = Math.max(3, skillScore - 7);
  else if (advancedTechHits === 1) skillScore = Math.max(5, skillScore - 3);

  const growthKeywords = ['cross-functional', 'strategy', 'process improvement', 'implementation', 'automation', 'systems', 'reporting', 'dashboard', 'customer operations'];
  const growthCount = growthKeywords.filter(k => text.includes(k)).length;
  const growthScore = Math.min(10, growthCount * 2);

  const totalScore = titleScore + salaryScore + remoteScore + expScore + skillScore + growthScore;
  const label = totalScore >= 80 ? 'green'
    : totalScore >= 65 ? 'yellow'
    : 'red';

  const whyMatches = [];
  if (titleScore >= 14) whyMatches.push(titleFit.reason);
  if (salaryScore >= 15) whyMatches.push('Salary within target range');
  if (remoteScore === 15) whyMatches.push('Fully remote position');
  if (expScore >= 15) whyMatches.push('Experience level appropriate');
  if (skillScore >= 10) whyMatches.push(`Matches ${matchedSkills.length} candidate strengths: ${matchedSkills.slice(0, 5).join(', ')}`);

  const missing = [];
  if (salaryScore < 10) missing.push('Salary missing, unclear, or below target');
  if (skillScore < 8) missing.push('Limited overlap with confirmed skills');
  if (titleScore < 14) missing.push(`${titleFit.reason} - review carefully`);
  if (expScore <= 12) missing.push('Experience level may be a stretch');
  if (advancedTechHits > 0) missing.push('May require analytics/technical tools beyond confirmed profile');

  const skillsGapLevel = matchedSkills.length >= 7 && advancedTechHits === 0 ? 'low'
    : matchedSkills.length >= 4 && advancedTechHits < 2 ? 'moderate'
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

async function scoreAndSaveJob(job) {
  try {
    const filter = hardFilter(job);
    db.prepare('UPDATE jobs SET hard_filter_status = ?, hard_filter_reason = ?, updated_at = ? WHERE id = ?')
      .run(filter.passed ? 'passed' : 'rejected', filter.reason, new Date().toISOString(), job.id);

    if (!filter.passed) {
      db.prepare("UPDATE jobs SET status = 'rejected', label = 'red', score = 0, updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), job.id);
      logEvent('filter_reject', `Job #${job.id} "${job.title}" hard-filtered: ${filter.reason}`, { jobId: job.id, reason: filter.reason });
      return { filtered: true, reason: filter.reason };
    }

    const scores = learningService.applyPreferenceAdjustment(job, scoreJob(job));

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

    db.prepare('UPDATE jobs SET score = ?, label = ?, updated_at = ? WHERE id = ?')
      .run(scores.total_score, scores.label, new Date().toISOString(), job.id);

    logEvent('scored', `Job #${job.id} "${job.title}" scored ${scores.total_score} -> ${scores.label}`, { jobId: job.id, score: scores.total_score, label: scores.label });

    return { filtered: false, ...scores };
  } catch (err) {
    logEvent('error', `Scoring error for job #${job.id}: ${err.message}`, { jobId: job.id });
    throw err;
  }
}

module.exports = { scoreAndSaveJob, scoreJob, hardFilter };
