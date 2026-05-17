// Allowed institutional email domains
const ALLOWED_DOMAINS = [
  'itu.edu.pk',
  'uet.edu.pk', 
  'nust.edu.pk',
  'lums.edu.pk',
  'pu.edu.pk',
  'ku.edu.pk',
  'university.edu',
  'school.edu',
  'college.edu',
  'institute.edu',
];

// Roll number patterns — optional validation
const ROLL_NUMBER_PATTERNS = [
  /^bscs\d{5}$/i,    // bscs23093
  /^bsse\d{5}$/i,    // bsse23001
  /^mscs\d{5}$/i,    // mscs23001
  /^\d{4}-[a-z]+-\d{4}$/i, // 2023-cs-001
  /^[a-z]{2,6}\d{4,6}$/i,  // general pattern
];

const isAllowedEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const emailLower = email.toLowerCase().trim();
  
  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) return false;
  
  const domain = emailLower.split('@')[1];
  if (!domain) return false;
  
  // Check if domain or its parent domain is in allowed list
  return ALLOWED_DOMAINS.some(allowed => 
    domain === allowed || 
    domain.endsWith('.' + allowed)
  );
};

const isStrongPassword = (password) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  const passed = Object.values(checks).filter(Boolean).length;
  const messages = [];
  
  if (!checks.length) messages.push('At least 8 characters required');
  if (!checks.uppercase) messages.push('At least one uppercase letter required');
  if (!checks.lowercase) messages.push('At least one lowercase letter required');
  if (!checks.number) messages.push('At least one number required');
  if (!checks.special) messages.push('At least one special character required');
  
  return {
    isValid: passed === 5,
    messages,
    strength: passed <= 2 ? 'weak' : passed <= 4 ? 'medium' : 'strong'
  };
};

module.exports = { ALLOWED_DOMAINS, isAllowedEmail, isStrongPassword };