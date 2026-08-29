/**
 * Skill Bridge Platform - Returning User Role Collision Detector & Resolver
 * File: lib/role-collision.js
 */

/**
 * Detects whether an existing user is attempting to authenticate with a conflicting role intent.
 * Enforces the core system rule: "One Google Account = One Skill Bridge Account = One Role".
 *
 * @param {Object} params
 * @param {string|null} params.existingUserRole - Role assigned to the user in the database
 * @param {string|null} params.intentRole - Role requested during signup / OAuth trigger
 * @returns {Object} Collision status, existing role, attempted role, message, and redirect path
 */
function checkRoleCollision({ existingUserRole, intentRole }) {
  if (!existingUserRole || !intentRole) {
    return { hasCollision: false };
  }

  const normalizedExisting = String(existingUserRole).trim().toUpperCase();
  const normalizedIntent = String(intentRole).trim().toUpperCase();

  // If roles match identically
  if (normalizedExisting === normalizedIntent) {
    return { hasCollision: false };
  }

  // Handle INDUSTRY and ORGANIZATION aliases as equivalent
  const isExistingOrgOrInd = normalizedExisting === 'INDUSTRY' || normalizedExisting === 'ORGANIZATION';
  const isIntentOrgOrInd = normalizedIntent === 'INDUSTRY' || normalizedIntent === 'ORGANIZATION';
  if (isExistingOrgOrInd && isIntentOrgOrInd) {
    return { hasCollision: false };
  }

  // Format human-readable role name according to strict terminology
  let roleName = normalizedExisting.charAt(0) + normalizedExisting.slice(1).toLowerCase();
  if (normalizedExisting === 'STUDENT') roleName = 'Student';
  else if (normalizedExisting === 'INDUSTRY') roleName = 'Industry';
  else if (normalizedExisting === 'ORGANIZATION') roleName = 'Organization';
  else if (normalizedExisting === 'INSTITUTE') roleName = 'Institute';

  return {
    hasCollision: true,
    existingRole: normalizedExisting,
    attemptedRole: normalizedIntent,
    message: `This Google account is already registered as a ${roleName}. One Google account can only map to one role.`,
    redirectPath: `/${normalizedExisting.toLowerCase()}/dashboard`,
  };
}

/**
 * Helper to build standard collision query parameters for frontend redirect
 */
function buildCollisionRedirectUrl(existingRole, attemptedRole) {
  const roleLower = String(existingRole || 'student').toLowerCase();
  const params = new URLSearchParams({
    collision: 'true',
    existingRole: String(existingRole).toUpperCase(),
    attemptedRole: String(attemptedRole).toUpperCase(),
  });
  return `/${roleLower}/dashboard?${params.toString()}`;
}

/**
 * Helper to build auth page collision URL with query parameters
 */
function buildAuthCollisionUrl(existingRole, attemptedRole) {
  const params = new URLSearchParams({
    collision: 'true',
    existingRole: String(existingRole).toUpperCase(),
    attemptedRole: String(attemptedRole).toUpperCase(),
  });
  return `/auth?${params.toString()}`;
}

/**
 * Helper to clear signup intent cookie in browser
 */
function clearSignupIntentCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'sb_signup_intent=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  }
}

module.exports = {
  checkRoleCollision,
  buildCollisionRedirectUrl,
  buildAuthCollisionUrl,
  clearSignupIntentCookie,
};

