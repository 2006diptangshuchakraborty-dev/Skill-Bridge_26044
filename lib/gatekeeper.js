/**
 * Skill Bridge Platform - Capability Gatekeeper & PII Masking Engine
 * File: lib/gatekeeper.js
 */

const KYC_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  INFO_REQUESTED: 'INFO_REQUESTED',
};

const ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
};

const ROLES = {
  STUDENT: 'STUDENT',
  ORGANIZATION: 'ORGANIZATION',
  ADMIN: 'ADMIN',
};

const MASKED_PII_PLACEHOLDER = '[Verification Required]';

/**
 * Checks if an organization is authorized to publish live opportunities.
 *
 * @param {Object} user - User object with accountStatus and role
 * @param {Object} orgProfile - Organization profile object with verificationStatus
 * @returns {{ allowed: boolean, reason?: string, statusCode?: number }}
 */
function checkPublishingCapability(user, orgProfile) {
  if (!user) {
    return { allowed: false, reason: 'Authentication required', statusCode: 401 };
  }

  // Admins are always authorized
  if (user.role === ROLES.ADMIN) {
    return { allowed: true };
  }

  if (user.role !== ROLES.ORGANIZATION) {
    return { allowed: false, reason: 'Only organizations can create or publish opportunities', statusCode: 403 };
  }

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED || user.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
    return { allowed: false, reason: `Account is ${user.accountStatus.toLowerCase()}. Action blocked.`, statusCode: 403 };
  }

  const status = orgProfile?.verificationStatus || KYC_STATUS.PENDING;

  if (status !== KYC_STATUS.APPROVED) {
    return {
      allowed: false,
      reason: 'Action not allowed while organization verification is pending or unapproved',
      statusCode: 403,
    };
  }

  if (user.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
    return {
      allowed: false,
      reason: `Account status is ${user.accountStatus}; action blocked`,
      statusCode: 403,
    };
  }

  return { allowed: true };
}

/**
 * Sanitizes and masks student candidate PII for unverified, pending, or suspended callers.
 *
 * @param {Object|Array} studentData - Single student profile or array of student profiles
 * @param {Object|null} callerUser - Current session user
 * @param {Object|null} callerOrgProfile - Current organization profile (if caller is org)
 * @returns {Object|Array} Sanitized student data with PII masked if verification is incomplete
 */
function maskCandidatePii(studentData, callerUser, callerOrgProfile) {
  if (!studentData) return studentData;

  // If caller is an Admin, never mask PII
  if (callerUser?.role === ROLES.ADMIN) {
    return studentData;
  }

  // If caller is an Approved & Active Organization, never mask PII
  if (
    callerUser?.role === ROLES.ORGANIZATION &&
    callerUser?.accountStatus === ACCOUNT_STATUS.ACTIVE &&
    callerOrgProfile?.verificationStatus === KYC_STATUS.APPROVED
  ) {
    return studentData;
  }

  const maskSingle = (student) => {
    // If student is viewing their own profile, keep unmasked
    if (callerUser?.id && (callerUser.id === student.id || callerUser.id === student.userId)) {
      return student;
    }

    const masked = { ...student };

    // Mask Direct Contact PII
    masked.email = MASKED_PII_PLACEHOLDER;
    if (masked.phone) masked.phone = MASKED_PII_PLACEHOLDER;
    if (masked.contactPhone) masked.contactPhone = MASKED_PII_PLACEHOLDER;
    if (masked.resumeUrl) masked.resumeUrl = MASKED_PII_PLACEHOLDER;
    if (masked.resumeLink) masked.resumeLink = MASKED_PII_PLACEHOLDER;
    if (masked.resume) masked.resume = MASKED_PII_PLACEHOLDER;
    if (masked.linkedinUrl) masked.linkedinUrl = MASKED_PII_PLACEHOLDER;
    if (masked.githubUrl) masked.githubUrl = MASKED_PII_PLACEHOLDER;
    if (masked.portfolioUrl) masked.portfolioUrl = MASKED_PII_PLACEHOLDER;

    // Flag PII state for UI rendering
    masked.isPiiMasked = true;
    masked.piiMaskReason = 'Organization KYC verification required to unlock contact info';

    return masked;
  };

  if (Array.isArray(studentData)) {
    return studentData.map(maskSingle);
  }

  return maskSingle(studentData);
}

module.exports = {
  KYC_STATUS,
  ACCOUNT_STATUS,
  ROLES,
  MASKED_PII_PLACEHOLDER,
  checkPublishingCapability,
  maskCandidatePii,
};
