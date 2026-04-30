const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { logEvent } = require('../routes/logs');
const { getCandidateProfile, getResumeSummary, getPortfolioUrl } = require('./candidateProfile');

async function callAI(systemPrompt, userPrompt) {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();

  if (provider === 'anthropic' || provider === 'claude') return callAnthropic(systemPrompt, userPrompt);
  if (provider === 'gemini' || provider === 'google') return callGemini(systemPrompt, userPrompt);
  return callOpenAI(systemPrompt, userPrompt);
}

async function callOpenAI(systemPrompt, userPrompt) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const res = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
  }, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 30000
  });
  return res.data.choices[0].message.content.trim();
}

async function callAnthropic(systemPrompt, userPrompt) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  }, {
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  return res.data.content[0].text.trim();
}

async function callGemini(systemPrompt, userPrompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    systemInstruction: systemPrompt
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text().trim();
}

async function draftResume(job, scoreDetails) {
  const system = `You are a professional resume writer helping a job seeker tailor their resume.
RULES:
- Keep ALL claims 100% truthful. Never invent tools, certifications, degrees, employers, metrics, or technical experience.
- Use keywords from the job description naturally. No keyword stuffing.
- Use ATS-readable formatting: clean headings, bullet points, no tables or columns.
- Show exact changes from the master resume.
- Tone: professional and human.
- Output JSON with keys: resume_text, change_summary, keywords_added (array), suggested_filename.`;

  const user = `CANDIDATE PROFILE:
${getCandidateProfile()}

MASTER RESUME SUMMARY:
${getResumeSummary()}

JOB TITLE: ${job.title}
COMPANY: ${job.company}
JOB DESCRIPTION:
${(job.description || '').substring(0, 3000)}

MATCH SCORE: ${scoreDetails ? scoreDetails.total_score : job.score}/100
WHY IT MATCHES: ${scoreDetails ? scoreDetails.why_it_matches : ''}
MISSING/WEAK: ${scoreDetails ? scoreDetails.missing_or_weak_requirements : ''}

Please produce a tailored resume draft for this role. Focus on operations, process improvement, and transferable skills. Do not invent anything. Output valid JSON only.`;

  try {
    const raw = await callAI(system, user);
    const json = extractJSON(raw);
    logEvent('draft_resume', `Resume drafted for job #${job.id} "${job.title}"`, { jobId: job.id });
    return json;
  } catch (err) {
    logEvent('ai_error', `Resume draft failed for job #${job.id}: ${err.message}`, { jobId: job.id });
    return {
      resume_text: `[AI draft unavailable - ${err.message}. Please write resume manually using the private candidate profile.]`,
      change_summary: 'AI draft failed',
      keywords_added: [],
      suggested_filename: `Resume_${job.company.replace(/\s+/g, '_')}_${job.title.replace(/\s+/g, '_')}.docx`
    };
  }
}

async function draftCoverLetter(job, scoreDetails) {
  const portfolioUrl = getPortfolioUrl();
  const system = `You are a professional cover letter writer.
RULES:
- Professional but natural tone. No generic filler. No over-explaining career transition.
- Mention the portfolio${portfolioUrl ? ` (${portfolioUrl})` : ''} only when relevant and only if provided.
- Frame candidate as an operations/systems improvement professional moving into business ops, BI, PM, customer success, or process automation.
- Keep it concise: 3-4 short paragraphs.
- Output JSON with keys: cover_letter_text, angle_summary, suggested_filename.`;

  const user = `CANDIDATE PROFILE:
${getCandidateProfile()}

JOB TITLE: ${job.title}
COMPANY: ${job.company}
JOB DESCRIPTION:
${(job.description || '').substring(0, 2500)}

WHY IT MATCHES: ${scoreDetails ? scoreDetails.why_it_matches : ''}

Write a tailored cover letter. Output valid JSON only.`;

  try {
    const raw = await callAI(system, user);
    const json = extractJSON(raw);
    logEvent('draft_cover', `Cover letter drafted for job #${job.id} "${job.title}"`, { jobId: job.id });
    return json;
  } catch (err) {
    logEvent('ai_error', `Cover letter draft failed for job #${job.id}: ${err.message}`, { jobId: job.id });
    return {
      cover_letter_text: `[AI draft unavailable - ${err.message}. Please write cover letter manually.]`,
      angle_summary: 'AI draft failed',
      suggested_filename: `CoverLetter_${job.company.replace(/\s+/g, '_')}_${job.title.replace(/\s+/g, '_')}.docx`
    };
  }
}

async function draftApplicationAnswers(job) {
  const system = `You produce suggested answers for common job application questions.
Rules: truthful, based on the provided candidate profile only. Concise, specific, professional.
Output JSON with an array key "answers" where each item has: question, answer.`;

  const user = `CANDIDATE PROFILE:
${getCandidateProfile()}

JOB TITLE: ${job.title}
COMPANY: ${job.company}

Generate suggested answers for:
1. Why are you interested in this role?
2. Why are you a good fit?
3. Tell us about yourself.
4. What are your salary expectations?
5. Work authorization.
6. Describe your remote work experience.
7. Describe your project management experience.
8. Describe your data/reporting experience.
9. Describe your customer success or operations experience.

Output valid JSON only.`;

  try {
    const raw = await callAI(system, user);
    return extractJSON(raw);
  } catch (err) {
    logEvent('ai_error', `App answers failed for job #${job.id}: ${err.message}`, { jobId: job.id });
    return { answers: [] };
  }
}

function extractJSON(raw) {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { draftResume, draftCoverLetter, draftApplicationAnswers };
