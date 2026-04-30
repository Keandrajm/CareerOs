const db = require('../db');
const { insertSampleJobs } = require('../services/sampleJobs');

try {
  const inserted = insertSampleJobs(db);
  console.log(`Sample ingest complete: ${inserted} jobs loaded.`);
} catch (err) {
  console.error('Sample ingest failed:', err.message);
  process.exit(1);
}
