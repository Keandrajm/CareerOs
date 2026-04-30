const TARGET_SALARY_MIN = 80000;
const TARGET_SALARY_MAX = 130000;

const STRONG_TITLE_PATTERNS = [
  /\bbusiness operations\b/i,
  /\bstrategy (and|&)? operations\b/i,
  /\boperations analyst\b/i,
  /\boperations manager\b/i,
  /\bbusiness process\b/i,
  /\bprocess improvement\b/i,
  /\bcontinuous improvement\b/i,
  /\boperational excellence\b/i,
  /\boperations project\b/i,
  /\bimplementation (project )?(manager|specialist|consultant|coordinator)\b/i,
  /\bprogram (manager|coordinator|analyst)\b/i,
  /\bproject (manager|coordinator|analyst)\b/i,
  /\bpmo analyst\b/i,
  /\bcustomer (success )?operations\b/i,
  /\bclient operations\b/i,
  /\bonboarding (specialist|manager|coordinator)\b/i,
  /\b(enablement|training) (operations|specialist|manager|coordinator)\b/i,
  /\bbusiness systems\b/i,
  /\bworkflow automation\b/i,
  /\boperations systems\b/i,
  /\bprocess automation\b/i,
  /\bno-code automation\b/i,
  /\breporting analyst\b/i,
  /\bkpi analyst\b/i,
  /\bperformance analyst\b/i,
  /\boperations data analyst\b/i,
  /\bdigital operations\b/i,
  /\becommerce operations\b/i,
  /\bsop documentation\b/i,
  /\bquality operations\b/i
];

const SECONDARY_TITLE_PATTERNS = [
  /\bbusiness analyst\b/i,
  /\bbi analyst\b/i,
  /\bbusiness intelligence\b/i,
  /\bdata analyst\b/i,
  /\binsights analyst\b/i,
  /\bcustomer success manager\b/i,
  /\bclient success manager\b/i,
  /\brevenue operations\b/i,
  /\bsales operations\b/i,
  /\bcrm operations\b/i,
  /\bproduct operations\b/i,
  /\bmarketplace operations\b/i,
  /\bcontent operations\b/i,
  /\bsupply chain analyst\b/i,
  /\bprocurement analyst\b/i,
  /\binventory analyst\b/i,
  /\bdemand planning\b/i,
  /\bvendor management\b/i,
  /\bcompliance analyst\b/i,
  /\blearning (and|&)? development\b/i,
  /\bworkforce operations\b/i,
  /\bquality assurance analyst\b/i
];

const SECONDARY_REQUIRED_CONTEXT = [
  /operations?/i,
  /process/i,
  /workflow/i,
  /implementation/i,
  /project/i,
  /reporting/i,
  /dashboard/i,
  /\bexcel\b/i,
  /\bpower bi\b/i,
  /\bkpi\b/i,
  /sop/i,
  /training/i,
  /compliance/i,
  /vendor/i,
  /customer feedback/i,
  /onboarding/i,
  /cross-functional/i
];

const INGEST_TITLE_PATTERNS = [
  ...STRONG_TITLE_PATTERNS,
  ...SECONDARY_TITLE_PATTERNS
];

const AVOID_TITLE_PATTERNS = [
  { pattern: /\b(sr\.?|senior)\b/i, reason: 'Senior-level role, too high for this transition search' },
  { pattern: /\b(account executive|sales development|business development|sdr|bdr)\b/i, reason: 'Sales quota role, not an operations fit' },
  { pattern: /\baccount manager\b/i, reason: 'Account management role, not operations-focused' },
  { pattern: /\b(customer support|support representative|technical support|help desk)\b/i, reason: 'Support desk role, not operations/process-focused' },
  { pattern: /\b(recruiter|talent acquisition)\b/i, reason: 'Recruiting role, outside target path' },
  { pattern: /\b(counsel|legal)\b/i, reason: 'Legal role, outside target path' },
  { pattern: /\b(software|frontend|front-end|backend|back-end|full[-\s]?stack|platform|site reliability|devops|security) engineer\b/i, reason: 'Engineering role, outside target path' },
  { pattern: /\b(machine learning|ml|ai) engineer\b/i, reason: 'Advanced ML/AI engineering role' },
  { pattern: /\b(data scientist|analytics engineer|data engineer|bi engineer)\b/i, reason: 'Advanced analytics/engineering role' },
  { pattern: /\bsolutions? (engineer|architect|consultant)\b/i, reason: 'Technical solutions role likely requires deep platform expertise' },
  { pattern: /\btechnical (project|program) manager\b/i, reason: 'Technical PM role likely requires deeper engineering delivery experience' },
  { pattern: /\bproduct manager\b/i, reason: 'Product manager role; target product operations instead' },
  { pattern: /\b(flight test|mission autonomy|mission operations)\b/i, reason: 'Specialized defense/technical operations role, outside target path' },
  { pattern: /\b(financial analyst|accountant|controller|tax|audit)\b/i, reason: 'Finance/accounting role, outside target path' },
  { pattern: /\b(director|vp|vice president|head of|principal|staff)\b/i, reason: 'Leadership/seniority level too high for this transition search' }
];

const CORE_SKILLS = [
  'operations',
  'process improvement',
  'workflow',
  'workflow digitization',
  'sop',
  'standard operating procedure',
  'training',
  'enablement',
  'compliance',
  'quality assurance',
  'budget',
  'vendor',
  'procurement',
  'cross-functional',
  'stakeholder',
  'excel',
  'power bi',
  'dashboard',
  'reporting',
  'kpi',
  'data visualization',
  'customer feedback',
  'implementation',
  'project coordination',
  'project management',
  'onboarding',
  'team leadership',
  'documentation'
];

const ADVANCED_TECH_REQUIREMENTS = [
  /\badvanced sql\b/i,
  /\bexpert sql\b/i,
  /\bpython required\b/i,
  /\bdbt\b/i,
  /\bsnowflake\b/i,
  /\bdata warehouse\b/i,
  /\blooker\b/i,
  /\btableau\b/i,
  /\bworkday\b/i,
  /\bsalesforce administrator\b/i,
  /\bstatistics\b/i,
  /\bpredictive model/i
];

function titleBucket(title = '', description = '') {
  const titleText = title || '';
  const fullText = `${title || ''} ${description || ''}`;
  const avoid = AVOID_TITLE_PATTERNS.find(({ pattern }) => pattern.test(titleText));
  if (avoid) return { bucket: 'avoid', reason: avoid.reason };
  if (STRONG_TITLE_PATTERNS.some(pattern => pattern.test(titleText))) {
    return { bucket: 'strong', reason: 'Strong match to Keandra operations/process/project target titles' };
  }
  if (SECONDARY_TITLE_PATTERNS.some(pattern => pattern.test(titleText))) {
    const hasContext = SECONDARY_REQUIRED_CONTEXT.some(pattern => pattern.test(fullText));
    return hasContext
      ? { bucket: 'secondary', reason: 'Secondary target with operations/process/data context' }
      : { bucket: 'weak', reason: 'Secondary title without enough operations/process context' };
  }
  return { bucket: 'weak', reason: 'Title is outside the narrowed target list' };
}

function shouldIngestTitle(title = '') {
  const avoid = AVOID_TITLE_PATTERNS.find(({ pattern }) => pattern.test(title));
  if (avoid) return false;
  return INGEST_TITLE_PATTERNS.some(pattern => pattern.test(title));
}

module.exports = {
  TARGET_SALARY_MIN,
  TARGET_SALARY_MAX,
  STRONG_TITLE_PATTERNS,
  SECONDARY_TITLE_PATTERNS,
  AVOID_TITLE_PATTERNS,
  CORE_SKILLS,
  ADVANCED_TECH_REQUIREMENTS,
  titleBucket,
  shouldIngestTitle
};
