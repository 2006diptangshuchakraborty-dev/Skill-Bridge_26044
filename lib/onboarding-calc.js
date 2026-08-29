/**
 * Skill Bridge Platform - Dynamic Profile Completion & Onboarding Scoring Engine
 * File: lib/onboarding-calc.js
 */

/**
 * Calculates dynamic profile completion percentage for a Student profile (8 Categories).
 * Returns integer 0-100.
 *
 * @param {Object} profile - Student profile data
 * @returns {number} Completion percentage (0 to 100)
 */
function calculateStudentCompletion(profile) {
  if (!profile) return 0;
  let score = 0;

  // Step 1: Basic Info (15%)
  if (profile.headline && profile.bio) {
    score += 15;
  } else if (profile.headline || profile.bio) {
    score += 7.5;
  }

  // Step 2: Academic Info (15%)
  if (profile.instituteName && profile.department && profile.degree && (profile.yearOfStudy || profile.graduationYear)) {
    score += 15;
  } else if (profile.instituteName || profile.department) {
    score += 7.5;
  }

  // Step 3: Skills (20%)
  if (Array.isArray(profile.skills) && profile.skills.length >= 3) {
    score += 20;
  } else if (Array.isArray(profile.skills) && profile.skills.length > 0) {
    score += 10;
  }

  // Step 4: Projects (15%)
  if (Array.isArray(profile.projects) && profile.projects.length >= 1) {
    score += 15;
  }

  // Step 5: Certifications (10%)
  if (Array.isArray(profile.certifications) && profile.certifications.length >= 1) {
    score += 10;
  }

  // Step 6: Experience / Internships (10%)
  if (Array.isArray(profile.experience) && profile.experience.length >= 1) {
    score += 10;
  }

  // Step 7: Career Preferences (10%)
  if (profile.careerPreferences && typeof profile.careerPreferences === 'object' && Object.keys(profile.careerPreferences).length >= 1) {
    score += 10;
  }

  // Step 8: Review & Finalize (Normalization / threshold bump)
  if (score >= 95) {
    score = 100;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculates dynamic profile completion percentage for an Organization profile (7 Categories).
 * Returns integer 0-100.
 *
 * @param {Object} profile - Organization profile data
 * @returns {number} Completion percentage (0 to 100)
 */
function calculateOrganizationCompletion(profile) {
  if (!profile) return 0;
  let score = 0;

  // Step 1: Company Basic Info (15%)
  if (profile.companyName && (profile.website || profile.logoUrl)) {
    if (profile.companyName && profile.website && profile.logoUrl) {
      score += 15;
    } else {
      score += 10;
    }
  } else if (profile.companyName) {
    score += 7.5;
  }

  // Step 2: Legal & Registration (20%)
  if (profile.registrationNumber && profile.taxIdGstin) {
    score += 20;
  } else if (profile.registrationNumber || profile.taxIdGstin) {
    score += 10;
  }

  // Step 3: Primary Contact & Address (15%)
  if (profile.contactPhone && (profile.address && (typeof profile.address === 'string' ? profile.address.length > 0 : Object.keys(profile.address).length > 0))) {
    score += 15;
  } else if (profile.contactPhone || (profile.address && (typeof profile.address === 'string' ? profile.address.length > 0 : Object.keys(profile.address).length > 0))) {
    score += 7.5;
  }

  // Step 4: Industry & Size (15%)
  if (profile.industry && profile.companySize) {
    score += 15;
  } else if (profile.industry || profile.companySize) {
    score += 7.5;
  }

  // Step 5: Hiring Preferences (15%)
  if (profile.hiringPreferences && typeof profile.hiringPreferences === 'object' && Object.keys(profile.hiringPreferences).length >= 1) {
    score += 15;
  }

  // Step 6: Verification Docs (15%)
  if (Array.isArray(profile.verificationDocs) && profile.verificationDocs.length >= 1) {
    score += 15;
  } else if (Array.isArray(profile.documents) && profile.documents.length >= 1) {
    score += 15;
  }

  // Step 7: Review & Finalize (5% bonus / normalization)
  if (score >= 95) {
    score = 100;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Returns granular breakdown and missing fields for a student profile
 */
function getStudentCompletionDetails(profile = {}) {
  const completion = calculateStudentCompletion(profile);
  const breakdown = {
    basicInfo: (profile?.headline && profile?.bio) ? 15 : ((profile?.headline || profile?.bio) ? 7.5 : 0),
    academic: (profile?.instituteName && profile?.department && profile?.degree && (profile?.yearOfStudy || profile?.graduationYear)) ? 15 : ((profile?.instituteName || profile?.department) ? 7.5 : 0),
    skills: Array.isArray(profile?.skills) && profile.skills.length >= 3 ? 20 : (Array.isArray(profile?.skills) && profile.skills.length > 0 ? 10 : 0),
    projects: Array.isArray(profile?.projects) && profile.projects.length >= 1 ? 15 : 0,
    certifications: Array.isArray(profile?.certifications) && profile.certifications.length >= 1 ? 10 : 0,
    experience: Array.isArray(profile?.experience) && profile.experience.length >= 1 ? 10 : 0,
    careerPreferences: profile?.careerPreferences && Object.keys(profile.careerPreferences).length >= 1 ? 10 : 0,
  };

  const missingFields = [];
  if (!profile?.headline) missingFields.push('Professional Headline');
  if (!profile?.bio) missingFields.push('Personal Bio / Summary');
  if (!profile?.instituteName) missingFields.push('Institute Name');
  if (!profile?.department) missingFields.push('Department');
  if (!profile?.degree) missingFields.push('Degree');
  if (!profile?.yearOfStudy && !profile?.graduationYear) missingFields.push('Year of Study');
  if (!Array.isArray(profile?.skills) || profile.skills.length < 3) missingFields.push('Add at least 3 skills');
  if (!Array.isArray(profile?.projects) || profile.projects.length === 0) missingFields.push('Add at least 1 project');
  if (!profile?.careerPreferences || Object.keys(profile.careerPreferences).length === 0) missingFields.push('Career Preferences');

  return { completion, breakdown, missingFields };
}

/**
 * Returns granular breakdown and missing fields for an organization profile
 */
function getOrgCompletionDetails(profile = {}) {
  const completion = calculateOrganizationCompletion(profile);
  const breakdown = {
    companyInfo: (profile?.companyName && profile?.website && profile?.logoUrl) ? 15 : (profile?.companyName ? 7.5 : 0),
    registration: (profile?.registrationNumber && profile?.taxIdGstin) ? 20 : ((profile?.registrationNumber || profile?.taxIdGstin) ? 10 : 0),
    contact: (profile?.contactPhone && profile?.address) ? 15 : ((profile?.contactPhone || profile?.address) ? 7.5 : 0),
    industry: (profile?.industry && profile?.companySize) ? 15 : ((profile?.industry || profile?.companySize) ? 7.5 : 0),
    hiring: profile?.hiringPreferences && Object.keys(profile.hiringPreferences).length >= 1 ? 15 : 0,
    docs: (Array.isArray(profile?.verificationDocs) && profile.verificationDocs.length >= 1) || (Array.isArray(profile?.documents) && profile.documents.length >= 1) ? 15 : 0,
  };

  const missingFields = [];
  if (!profile?.companyName) missingFields.push('Company Name');
  if (!profile?.registrationNumber) missingFields.push('Registration Number (CIN/LLPIN)');
  if (!profile?.taxIdGstin) missingFields.push('Tax ID (GSTIN)');
  if (!profile?.contactPhone) missingFields.push('Contact Phone');
  if (!profile?.address) missingFields.push('Headquarters Address');
  if (!profile?.industry) missingFields.push('Industry Sector');
  if (!profile?.companySize) missingFields.push('Company Size');
  if (!profile?.hiringPreferences) missingFields.push('Hiring Preferences');
  if ((!Array.isArray(profile?.verificationDocs) || profile.verificationDocs.length === 0) && (!Array.isArray(profile?.documents) || profile.documents.length === 0)) {
    missingFields.push('Statutory Verification Documents (COI/GSTIN)');
  }

  return { completion, breakdown, missingFields };
}

/**
 * Calculates dynamic profile completion percentage for an Institute profile (6-7 Categories).
 * Returns integer 0-100.
 *
 * @param {Object} profile - Institute profile data
 * @returns {number} Completion percentage (0 to 100)
 */
function calculateInstituteCompletion(profile) {
  if (!profile) return 0;
  let score = 0;

  // Step 1: Basic Info (15%)
  if (profile.instituteName && (profile.website || profile.logoUrl || profile.officialEmail)) {
    score += 15;
  } else if (profile.instituteName) {
    score += 7.5;
  }

  // Step 2: Identification & Accreditation (20%)
  if (profile.instituteCode && profile.instituteType) {
    score += 20;
  } else if (profile.instituteCode || profile.instituteType) {
    score += 10;
  }

  // Step 3: Contact & Campus Address (15%)
  const hasAddress = profile.address && (typeof profile.address === 'string' ? profile.address.length > 0 : Object.keys(profile.address).length > 0);
  if (profile.contactPhone && hasAddress) {
    score += 15;
  } else if (profile.contactPhone || hasAddress) {
    score += 7.5;
  }

  // Step 4: Departments & Academic Programs (15%)
  if (Array.isArray(profile.departments) && profile.departments.length >= 1) {
    score += 15;
  }

  // Step 5: Placement & Industry Cell Contact (15%)
  const hasPlacementContact = profile.placementContact && (typeof profile.placementContact === 'string' ? profile.placementContact.length > 0 : Object.keys(profile.placementContact).length > 0);
  if (hasPlacementContact) {
    score += 15;
  }

  // Step 6: Verification & Accreditation Docs (15%)
  if (Array.isArray(profile.verificationDocs) && profile.verificationDocs.length >= 1) {
    score += 15;
  } else if (Array.isArray(profile.documents) && profile.documents.length >= 1) {
    score += 15;
  }

  // Step 7: Review & Finalize (Normalization / 5% bump)
  if (score >= 95) {
    score = 100;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Returns granular breakdown and missing fields for an institute profile
 */
function getInstituteCompletionDetails(profile = {}) {
  const completion = calculateInstituteCompletion(profile);
  const hasAddress = profile?.address && (typeof profile.address === 'string' ? profile.address.length > 0 : Object.keys(profile.address).length > 0);
  const hasPlacementContact = profile?.placementContact && (typeof profile.placementContact === 'string' ? profile.placementContact.length > 0 : Object.keys(profile.placementContact).length > 0);

  const breakdown = {
    basicInfo: (profile?.instituteName && (profile?.website || profile?.logoUrl || profile?.officialEmail)) ? 15 : (profile?.instituteName ? 7.5 : 0),
    identification: (profile?.instituteCode && profile?.instituteType) ? 20 : ((profile?.instituteCode || profile?.instituteType) ? 10 : 0),
    contact: (profile?.contactPhone && hasAddress) ? 15 : ((profile?.contactPhone || hasAddress) ? 7.5 : 0),
    departments: (Array.isArray(profile?.departments) && profile.departments.length >= 1) ? 15 : 0,
    placementContact: hasPlacementContact ? 15 : 0,
    docs: (Array.isArray(profile?.verificationDocs) && profile.verificationDocs.length >= 1) || (Array.isArray(profile?.documents) && profile.documents.length >= 1) ? 15 : 0,
  };

  const missingFields = [];
  if (!profile?.instituteName) missingFields.push('Institute Name');
  if (!profile?.instituteCode) missingFields.push('Institute Code / AISHE Code');
  if (!profile?.instituteType) missingFields.push('Institute Type');
  if (!profile?.contactPhone) missingFields.push('Contact Phone');
  if (!hasAddress) missingFields.push('Campus Address');
  if (!Array.isArray(profile?.departments) || profile.departments.length === 0) missingFields.push('Departments / Academic Programs');
  if (!hasPlacementContact) missingFields.push('Placement Cell Contact Information');
  if ((!Array.isArray(profile?.verificationDocs) || profile.verificationDocs.length === 0) && (!Array.isArray(profile?.documents) || profile.documents.length === 0)) {
    missingFields.push('Statutory Accreditation / Verification Documents');
  }

  return { completion, breakdown, missingFields };
}

/**
 * Universal profile completion calculator supporting all roles (STUDENT, INDUSTRY/ORGANIZATION, INSTITUTE, ADMIN).
 *
 * @param {string|Object} userOrRole - User object (with .role) or role string
 * @param {Object} [profile] - Profile data (optional if userOrRole contains profile data)
 * @returns {number} Completion score 0-100
 */
function calculateProfileCompletion(userOrRole, profile) {
  let role = 'STUDENT';
  let profileData = profile;

  if (typeof userOrRole === 'string') {
    role = userOrRole.toUpperCase();
  } else if (userOrRole && typeof userOrRole === 'object') {
    if (userOrRole.role) {
      role = String(userOrRole.role).toUpperCase();
    }
    if (!profileData) {
      profileData = userOrRole.profile || userOrRole.studentProfile || userOrRole.organizationProfile || userOrRole.instituteProfile || userOrRole;
    }
  }

  if (!profileData) return 0;

  if (role === 'STUDENT') {
    return calculateStudentCompletion(profileData);
  }
  if (role === 'ORGANIZATION' || role === 'INDUSTRY') {
    return calculateOrganizationCompletion(profileData);
  }
  if (role === 'INSTITUTE') {
    return calculateInstituteCompletion(profileData);
  }
  if (role === 'ADMIN') {
    return 100;
  }

  return calculateStudentCompletion(profileData);
}

/**
 * Checks whether a user's profile meets the completion threshold.
 *
 * @param {string|Object} userOrRole - User object or role string
 * @param {Object} [profile] - Profile data
 * @param {number} [threshold=70] - Minimum completion percentage (default 70)
 * @returns {boolean} True if profile completion >= threshold
 */
function isProfileComplete(userOrRole, profile, threshold = 70) {
  if (userOrRole && typeof userOrRole === 'object') {
    if (userOrRole.profileCompleted === true) return true;
    if (userOrRole.onboardingStatus === 'COMPLETED') return true;
  }
  const score = calculateProfileCompletion(userOrRole, profile);
  return score >= threshold;
}

const calculateOrgCompletion = calculateOrganizationCompletion;
const calculateInstCompletion = calculateInstituteCompletion;

module.exports = {
  calculateStudentCompletion,
  calculateOrganizationCompletion,
  calculateOrgCompletion,
  calculateInstituteCompletion,
  calculateInstCompletion,
  calculateProfileCompletion,
  isProfileComplete,
  getStudentCompletionDetails,
  getOrgCompletionDetails,
  getInstituteCompletionDetails,
};

