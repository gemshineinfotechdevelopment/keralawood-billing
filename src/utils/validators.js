// Centralized Validation Helpers for Kerala Wood Furniture Web Application

/**
 * Validates Indian Mobile / Phone Number
 * Accepts 10-digit number optionally prefixed with +91 or 0
 * e.g., 9847123456, +91 9847123456, 09847123456
 */
export function validatePhone(phone, required = false) {
  if (!phone || !String(phone).trim()) {
    if (required) return { isValid: false, error: 'Phone number is required' }
    return { isValid: true, error: '' }
  }
  const clean = String(phone).replace(/[\s\-()]/g, '')
  const digitsOnly = clean.replace(/^\+91/, '').replace(/^0/, '')
  if (!/^[6-9]\d{9}$/.test(digitsOnly) && !/^\d{8,11}$/.test(digitsOnly)) {
    return { isValid: false, error: 'Enter a valid 10-digit mobile or phone number' }
  }
  return { isValid: true, error: '', clean: digitsOnly }
}

/**
 * Validates Email Address
 */
export function validateEmail(email, required = false) {
  if (!email || !String(email).trim()) {
    if (required) return { isValid: false, error: 'Email address is required' }
    return { isValid: true, error: '' }
  }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!re.test(String(email).trim())) {
    return { isValid: false, error: 'Enter a valid email address (e.g. name@company.in)' }
  }
  return { isValid: true, error: '' }
}

/**
 * Validates Indian GSTIN (Goods and Services Tax Identification Number)
 * Format: 2 digits (State code) + 5 letters (PAN) + 4 digits + 1 letter + 1 char + Z + 1 char
 * Total 15 alphanumeric characters
 */
export function validateGSTIN(gstin, required = false) {
  if (!gstin || !String(gstin).trim() || String(gstin).trim().toLowerCase() === 'unregistered / personal') {
    if (required) return { isValid: false, error: 'GSTIN is required' }
    return { isValid: true, error: '' }
  }
  const clean = String(gstin).trim().toUpperCase()
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  if (!gstRegex.test(clean)) {
    return { isValid: false, error: 'GSTIN must be 15 alphanumeric characters (e.g. 33AABCT1234F1Z5)' }
  }
  return { isValid: true, error: '' }
}

/**
 * Validates Indian IFSC Code
 * Format: 4 letters + 0 + 6 alphanumeric (11 characters)
 */
export function validateIFSC(ifsc, required = false) {
  if (!ifsc || !String(ifsc).trim()) {
    if (required) return { isValid: false, error: 'IFSC Code is required' }
    return { isValid: true, error: '' }
  }
  const clean = String(ifsc).trim().toUpperCase()
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
  if (!ifscRegex.test(clean)) {
    return { isValid: false, error: 'IFSC must be 11 characters (e.g. SBIN0008839)' }
  }
  return { isValid: true, error: '' }
}

/**
 * Validates UPI ID (VPA)
 * e.g. user@okhdfcbank, keralawood@sbi
 */
export function validateUPI(upi, required = false) {
  if (!upi || !String(upi).trim()) {
    if (required) return { isValid: false, error: 'UPI ID is required' }
    return { isValid: true, error: '' }
  }
  const clean = String(upi).trim().toLowerCase()
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/
  if (!upiRegex.test(clean)) {
    return { isValid: false, error: 'Enter a valid UPI ID (e.g. merchant@sbi)' }
  }
  return { isValid: true, error: '' }
}

/**
 * Validates Bank Account Number
 * 9 to 18 digits
 */
export function validateBankAccount(account, required = false) {
  if (!account || !String(account).trim()) {
    if (required) return { isValid: false, error: 'Bank account number is required' }
    return { isValid: true, error: '' }
  }
  const clean = String(account).trim().replace(/[\s-]/g, '')
  if (!/^\d{9,18}$/.test(clean)) {
    return { isValid: false, error: 'Bank account must be 9 to 18 digits' }
  }
  return { isValid: true, error: '' }
}

/**
 * Validates HSN Code (Harmonized System of Nomenclature)
 * 4, 6, or 8 digits
 */
export function validateHSN(hsn, required = false) {
  if (!hsn || !String(hsn).trim()) {
    if (required) return { isValid: false, error: 'HSN code is required' }
    return { isValid: true, error: '' }
  }
  const clean = String(hsn).trim()
  if (!/^\d{4,8}$/.test(clean)) {
    return { isValid: false, error: 'HSN code must be 4, 6, or 8 digits (e.g. 9403)' }
  }
  return { isValid: true, error: '' }
}

/**
 * Validates Required Text Field (Name, Species, Title, Address)
 */
export function validateRequired(val, fieldName = 'Field', minLength = 2) {
  if (!val || !String(val).trim()) {
    return { isValid: false, error: `${fieldName} is required` }
  }
  if (String(val).trim().length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` }
  }
  return { isValid: true, error: '' }
}

/**
 * Validates Positive Numeric Value (Price, Amount, Quantity)
 */
export function validatePositiveNumber(val, fieldName = 'Amount', allowZero = false) {
  if (val === '' || val === null || val === undefined) {
    return { isValid: false, error: `${fieldName} is required` }
  }
  const num = Number(val)
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` }
  }
  if (allowZero ? num < 0 : num <= 0) {
    return { isValid: false, error: allowZero ? `${fieldName} cannot be negative` : `${fieldName} must be greater than 0` }
  }
  return { isValid: true, error: '' }
}
