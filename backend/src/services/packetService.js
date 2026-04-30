const db = require('../db');
const aiDraftService = require('./aiDraftService');
const discordService = require('./discordService');
const { logEvent } = require('../routes/logs');

async function createPacket(job) {
  logEvent('packet_start', `Creating packet for job #${job.id} "${job.title}"`, { jobId: job.id });

  const scoreDetails = db.prepare('SELECT * FROM job_scores WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(job.id);

  // Sequential calls to avoid hitting free-tier rate limits (e.g. Gemini 30 RPM)
  const resumeDraft = await aiDraftService.draftResume(job, scoreDetails);
  const coverLetterDraft = await aiDraftService.draftCoverLetter(job, scoreDetails);
  const appAnswers = await aiDraftService.draftApplicationAnswers(job);

  // Save resume version — node:sqlite returns BigInt for lastInsertRowid
  const resumeResult = db.prepare(`
    INSERT INTO resume_versions (job_id, filename, resume_text, change_summary, keywords_added)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    job.id,
    resumeDraft.suggested_filename || `Resume_${job.id}.docx`,
    resumeDraft.resume_text || '',
    resumeDraft.change_summary || '',
    JSON.stringify(resumeDraft.keywords_added || [])
  );
  const resumeId = Number(resumeResult.lastInsertRowid);

  // Save cover letter
  const coverResult = db.prepare(`
    INSERT INTO cover_letters (job_id, filename, cover_letter_text, angle_summary)
    VALUES (?, ?, ?, ?)
  `).run(
    job.id,
    coverLetterDraft.suggested_filename || `CoverLetter_${job.id}.docx`,
    coverLetterDraft.cover_letter_text || '',
    coverLetterDraft.angle_summary || ''
  );
  const coverId = Number(coverResult.lastInsertRowid);

  // Build full packet JSON
  const packetData = {
    job_title: job.title,
    company: job.company,
    salary_range: job.salary_text || `$${job.salary_min?.toLocaleString() || '?'} - $${job.salary_max?.toLocaleString() || '?'}`,
    remote_status: job.remote_status,
    posted_date: job.posted_date || 'Unknown',
    source_link: job.source_url,
    company_career_url: job.company_career_url || null,
    match_score: scoreDetails?.total_score ?? job.score,
    label: scoreDetails?.label ?? job.label,
    why_it_matches: scoreDetails?.why_it_matches || '',
    missing_or_weak: scoreDetails?.missing_or_weak_requirements || '',
    skills_gap_level: scoreDetails?.skills_gap_level || 'unknown',
    suggested_resume_filename: resumeDraft.suggested_filename,
    resume_draft: resumeDraft.resume_text,
    resume_change_summary: resumeDraft.change_summary,
    keywords_added: resumeDraft.keywords_added || [],
    cover_letter_draft: coverLetterDraft.cover_letter_text,
    cover_letter_angle: coverLetterDraft.angle_summary,
    application_answers: appAnswers.answers || [],
    auto_apply_possible: false,
    manual_apply_link: job.source_url,
    red_flags: job.red_flags || null,
    notes: null,
    created_at: new Date().toISOString()
  };

  const packetResult = db.prepare(`
    INSERT INTO application_packets (job_id, packet_json, manual_apply_link, auto_apply_possible, status)
    VALUES (?, ?, ?, 0, 'draft')
  `).run(job.id, JSON.stringify(packetData), job.source_url);
  const packetId = Number(packetResult.lastInsertRowid);

  db.prepare(`UPDATE jobs SET status = 'packet_ready', updated_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), job.id);

  logEvent('packet_created', `Packet #${packetId} created for job #${job.id} "${job.title}"`, { jobId: job.id, packetId });

  await discordService.notifyPacketCreated(job);
  if (job.label === 'green' || (scoreDetails && scoreDetails.label === 'green')) {
    await discordService.notifyManualApply(job);
  }

  return { packetId, ...packetData };
}

module.exports = { createPacket };
