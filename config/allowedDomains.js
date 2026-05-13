const ALLOWED_DOMAINS = [
  'school.edu',
  'university.edu',
  'college.edu',
  'institute.edu',
  'academy.edu',
  'highschool.edu',
  'polytechnic.edu'
];

const isAllowedEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const domain = email.split('@')[1];
  if (!domain) return false;
  return ALLOWED_DOMAINS.some(allowed => 
    domain === allowed || domain.endsWith('.' + allowed)
  );
};

module.exports = { ALLOWED_DOMAINS, isAllowedEmail };