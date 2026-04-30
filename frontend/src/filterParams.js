export function toJobQuery(filters = {}, base = {}) {
  const params = { ...base };
  [
    'search',
    'label',
    'status',
    'source',
    'company',
    'title',
    'remoteStatus',
    'minScore',
    'salaryMin',
    'salaryMax',
    'postedAfter',
    'postedBefore'
  ].forEach((key) => {
    if (filters[key] !== undefined && filters[key] !== '') {
      params[key] = filters[key];
    }
  });
  return params;
}
