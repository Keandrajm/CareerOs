const fs = require('fs');
const path = require('path');

const FALLBACK_PROFILE = `
Candidate is an operations, process improvement, training, compliance, reporting, customer operations, and project coordination professional transitioning into remote business operations, implementation, customer operations, systems, workflow automation, and reporting roles.

Use only verified details supplied in the private candidate profile, environment variables, or user-provided resume. Do not invent employers, credentials, tools, degrees, metrics, or certifications.
`;

const FALLBACK_RESUME_SUMMARY = `
Operations and process improvement professional with experience in operational leadership, SOP documentation, training, compliance, vendor coordination, reporting, workflow improvement, and cross-functional project support.
`;

function readPrivateFile(filename) {
  const filePath = path.resolve(__dirname, '..', '..', 'private', filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8').trim();
}

function getCandidateProfile() {
  return (process.env.CANDIDATE_PROFILE_TEXT || readPrivateFile('candidate-profile.md') || FALLBACK_PROFILE).trim();
}

function getResumeSummary() {
  return (process.env.CANDIDATE_RESUME_SUMMARY || readPrivateFile('resume-summary.md') || FALLBACK_RESUME_SUMMARY).trim();
}

function getPortfolioUrl() {
  return (process.env.CANDIDATE_PORTFOLIO_URL || '').trim();
}

module.exports = { getCandidateProfile, getResumeSummary, getPortfolioUrl };
