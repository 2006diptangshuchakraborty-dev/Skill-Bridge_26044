/**
 * Skill Bridge Authentication & Role Governance Platform
 * E2E Test Suite Helper & Specification Oracle
 * 
 * Provides:
 * 1. Dynamic module resolution (prefers live `lib/*` and `db/*` when present).
 * 2. Complete specification oracle for standalone, progressive verification.
 * 3. Cryptographic signup intent simulator with TTL validation.
 * 4. In-memory schema & entity validation conforming to Drizzle ORM specifications.
 * 5. Middleware simulator & API security guard (withAuth) simulator.
 * 6. Audit logging engine & tamper-proof validation.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Attempt dynamic loading of project modules
function loadProjectModule(relativePath) {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  if (fs.existsSync(fullPath)) {
    try {
      const mod = require(fullPath);
      if (mod && Object.keys(mod).length > 0) {
        return mod;
      }
    } catch (e) {
      // module in development
    }
  }
  return null;
}

// ============================================================================
// SPECIFICATION CONSTANTS & CONTRACTS
// ============================================================================
const ROLES = {
  STUDENT: 'STUDENT',
  ORGANIZATION: 'ORGANIZATION',
  INDUSTRY: 'INDUSTRY',
  INSTITUTE: 'INSTITUTE',
  ADMIN: 'ADMIN',
};

const ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
};

const ONBOARDING_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

const KYC_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  INFO_REQUESTED: 'INFO_REQUESTED',
};

const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  ACCOUNT_CREATED: 'ACCOUNT_CREATED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  ORGANIZATION_APPROVED: 'ORGANIZATION_APPROVED',
  ORGANIZATION_REJECTED: 'ORGANIZATION_REJECTED',
  ORGANIZATION_INFO_REQUESTED: 'ORGANIZATION_INFO_REQUESTED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  CAPABILITY_VIOLATION_BLOCKED: 'CAPABILITY_VIOLATION_BLOCKED',
  ROLE_COLLISION_BLOCKED: 'ROLE_COLLISION_BLOCKED',
};

// ============================================================================
// DYNAMIC WEIGHTED ONBOARDING COMPLETION CALCULATOR
// ============================================================================
function calculateStudentCompletion(profile) {
  if (!profile) return 0;
  let score = 0;

  // Step 1: Basic Info (15%)
  if (profile.headline && profile.bio) score += 15;
  else if (profile.headline || profile.bio) score += 7.5;

  // Step 2: Academic Info (15%)
  if (profile.instituteName && profile.department && profile.degree && (profile.yearOfStudy || profile.graduationYear)) score += 15;
  else if (profile.instituteName || profile.department) score += 7.5;

  // Step 3: Skills (20%)
  if (Array.isArray(profile.skills) && profile.skills.length >= 3) score += 20;
  else if (Array.isArray(profile.skills) && profile.skills.length > 0) score += 10;

  // Step 4: Projects (15%)
  if (Array.isArray(profile.projects) && profile.projects.length >= 1) score += 15;

  // Step 5: Certifications (10%)
  if (Array.isArray(profile.certifications) && profile.certifications.length >= 1) score += 10;

  // Step 6: Experience / Internships (10%)
  if (Array.isArray(profile.experience) && profile.experience.length >= 1) score += 10;

  // Step 7: Career Preferences (10%)
  if (profile.careerPreferences && typeof profile.careerPreferences === 'object' && Object.keys(profile.careerPreferences).length >= 1) score += 10;

  // Step 8: Review & Finalize (5% bonus or completion normalization)
  if (score >= 95) score = 100;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function calculateOrganizationCompletion(profile) {
  if (!profile) return 0;
  let score = 0;

  // Step 1: Company Basic Info (15%)
  if (profile.companyName && (profile.website || profile.logoUrl)) {
    if (profile.companyName && profile.website && profile.logoUrl) score += 15;
    else score += 10;
  } else if (profile.companyName) score += 7.5;

  // Step 2: Legal & Registration (20%)
  if (profile.registrationNumber && profile.taxIdGstin) score += 20;
  else if (profile.registrationNumber || profile.taxIdGstin) score += 10;

  // Step 3: Primary Contact & Address (15%)
  if (profile.contactPhone && (profile.address && (typeof profile.address === 'string' ? profile.address.length > 0 : Object.keys(profile.address).length > 0))) score += 15;
  else if (profile.contactPhone || (profile.address && (typeof profile.address === 'string' ? profile.address.length > 0 : Object.keys(profile.address).length > 0))) score += 7.5;

  // Step 4: Industry & Size (15%)
  if (profile.industry && profile.companySize) score += 15;
  else if (profile.industry || profile.companySize) score += 7.5;

  // Step 5: Hiring Preferences (15%)
  if (profile.hiringPreferences && typeof profile.hiringPreferences === 'object' && Object.keys(profile.hiringPreferences).length >= 1) score += 15;

  // Step 6: Verification Docs (15%)
  if (Array.isArray(profile.verificationDocs) && profile.verificationDocs.length >= 1) score += 15;
  else if (Array.isArray(profile.documents) && profile.documents.length >= 1) score += 15;

  // Step 7: Review & Finalize (5% bonus)
  if (score >= 95) score = 100;
  return Math.min(100, Math.max(0, Math.round(score)));
}

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

function isProfileComplete(userOrRole, profile, threshold = 70) {
  if (userOrRole && typeof userOrRole === 'object') {
    if (userOrRole.profileCompleted === true) return true;
    if (userOrRole.onboardingStatus === 'COMPLETED') return true;
  }
  const score = calculateProfileCompletion(userOrRole, profile);
  return score >= threshold;
}

// ============================================================================
// IN-MEMORY ORACLE DATABASE & ENGINE
// ============================================================================
class MockDatabase {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = new Map();
    this.sessions = new Map();
    this.accounts = new Map();
    this.signupIntents = new Map();
    this.studentProfiles = new Map();
    this.organizationProfiles = new Map();
    this.instituteProfiles = new Map();
    this.adminProfiles = new Map();
    this.auditLogs = [];
    this.opportunities = new Map();
    this.applications = new Map();
  }

  // User Management
  createUser(userData) {
    const id = userData.id || `usr_${crypto.randomBytes(8).toString('hex')}`;
    const user = {
      id,
      name: userData.name || '',
      email: userData.email.toLowerCase().trim(),
      emailVerified: userData.emailVerified || false,
      image: userData.image || null,
      role: userData.role,
      accountStatus: userData.accountStatus || ACCOUNT_STATUS.ACTIVE,
      onboardingStatus: userData.onboardingStatus || ONBOARDING_STATUS.NOT_STARTED,
      profileCompleted: userData.profileCompleted || false,
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: userData.updatedAt || new Date().toISOString(),
    };
    this.users.set(id, user);
    return JSON.parse(JSON.stringify(user));
  }

  getUserById(id) {
    const u = this.users.get(id);
    return u ? JSON.parse(JSON.stringify(u)) : null;
  }

  getUserByEmail(email) {
    const clean = (email || '').toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email === clean) return JSON.parse(JSON.stringify(u));
    }
    return null;
  }

  updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) throw new Error(`User not found: ${id}`);
    
    // Disallow tampering with immutable fields directly via user updates
    const sanitizedUpdates = { ...updates };
    delete sanitizedUpdates.id;
    delete sanitizedUpdates.role; // Role is immutable!
    
    Object.assign(user, sanitizedUpdates, { updatedAt: new Date().toISOString() });
    this.users.set(id, user);
    return JSON.parse(JSON.stringify(user));
  }

  // Signup Intents
  createSignupIntent(role, email = null, ttlSeconds = 600) {
    if (role === ROLES.ADMIN) {
      const err = new Error('Admin registration prohibited');
      err.statusCode = 403;
      throw err;
    }
    if (![ROLES.STUDENT, ROLES.ORGANIZATION, ROLES.INDUSTRY, ROLES.INSTITUTE].includes(role)) {
      const err = new Error(`Invalid role for signup intent: ${role}`);
      err.statusCode = 400;
      throw err;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    const intent = {
      id: `int_${crypto.randomBytes(6).toString('hex')}`,
      token,
      role,
      email: email ? email.toLowerCase().trim() : null,
      expiresAt,
      usedAt: null,
      createdAt: now.toISOString(),
    };

    this.signupIntents.set(token, intent);
    return JSON.parse(JSON.stringify(intent));
  }

  consumeSignupIntent(token) {
    const intent = this.signupIntents.get(token);
    if (!intent) {
      const err = new Error('Invalid or non-existent signup intent token');
      err.statusCode = 400;
      throw err;
    }
    if (intent.usedAt) {
      const err = new Error('Signup intent token has already been consumed');
      err.statusCode = 409;
      throw err;
    }
    if (new Date(intent.expiresAt).getTime() < Date.now()) {
      const err = new Error('Signup intent token has expired');
      err.statusCode = 410;
      throw err;
    }

    intent.usedAt = new Date().toISOString();
    this.signupIntents.set(token, intent);
    return JSON.parse(JSON.stringify(intent));
  }

  // Sessions
  createSession(userId, ttlSeconds = 86400) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session = {
      id: `ses_${crypto.randomBytes(8).toString('hex')}`,
      sessionToken,
      userId,
      expires: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(sessionToken, session);
    return JSON.parse(JSON.stringify(session));
  }

  getSession(sessionToken) {
    const session = this.sessions.get(sessionToken);
    if (!session) return null;
    if (new Date(session.expires).getTime() < Date.now()) {
      this.sessions.delete(sessionToken);
      return null;
    }
    const user = this.getUserById(session.userId);
    return { session: JSON.parse(JSON.stringify(session)), user };
  }

  // 1:1 Profiles
  upsertStudentProfile(userId, profileData) {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    if (user.role !== ROLES.STUDENT) {
      const err = new Error(`Cannot create student profile for user with role: ${user.role}`);
      err.statusCode = 403;
      throw err;
    }

    const existing = this.studentProfiles.get(userId);
    const id = existing ? existing.id : `stp_${crypto.randomBytes(8).toString('hex')}`;
    
    const profile = {
      id,
      userId,
      headline: profileData.headline || (existing ? existing.headline : ''),
      bio: profileData.bio || (existing ? existing.bio : ''),
      instituteName: profileData.instituteName || (existing ? existing.instituteName : ''),
      department: profileData.department || (existing ? existing.department : ''),
      degree: profileData.degree || (existing ? existing.degree : ''),
      yearOfStudy: profileData.yearOfStudy !== undefined ? profileData.yearOfStudy : (existing ? existing.yearOfStudy : null),
      graduationYear: profileData.graduationYear !== undefined ? profileData.graduationYear : (existing ? existing.graduationYear : null),
      cgpa: profileData.cgpa !== undefined ? profileData.cgpa : (existing ? existing.cgpa : null),
      skills: profileData.skills || (existing ? existing.skills : []),
      projects: profileData.projects || (existing ? existing.projects : []),
      certifications: profileData.certifications || (existing ? existing.certifications : []),
      experience: profileData.experience || (existing ? existing.experience : []),
      careerPreferences: profileData.careerPreferences || (existing ? existing.careerPreferences : {}),
      profileCompletion: 0,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    profile.profileCompletion = calculateStudentCompletion(profile);
    this.studentProfiles.set(userId, profile);

    // Update user onboarding status
    if (profile.profileCompletion === 100) {
      user.onboardingStatus = ONBOARDING_STATUS.COMPLETED;
    } else if (profile.profileCompletion > 0) {
      user.onboardingStatus = ONBOARDING_STATUS.IN_PROGRESS;
    }

    return JSON.parse(JSON.stringify(profile));
  }

  getStudentProfile(userId) {
    const p = this.studentProfiles.get(userId);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  upsertOrganizationProfile(userId, profileData) {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    if (user.role !== ROLES.ORGANIZATION && user.role !== ROLES.INDUSTRY) {
      const err = new Error(`Cannot create organization profile for user with role: ${user.role}`);
      err.statusCode = 403;
      throw err;
    }

    const existing = this.organizationProfiles.get(userId);
    const id = existing ? existing.id : `org_${crypto.randomBytes(8).toString('hex')}`;

    const profile = {
      id,
      userId,
      companyName: profileData.companyName || (existing ? existing.companyName : ''),
      registrationNumber: profileData.registrationNumber || (existing ? existing.registrationNumber : ''),
      taxIdGstin: profileData.taxIdGstin || (existing ? existing.taxIdGstin : ''),
      companyType: profileData.companyType || (existing ? existing.companyType : ''),
      industry: profileData.industry || (existing ? existing.industry : ''),
      companySize: profileData.companySize || (existing ? existing.companySize : ''),
      website: profileData.website || (existing ? existing.website : ''),
      logoUrl: profileData.logoUrl || (existing ? existing.logoUrl : ''),
      contactPhone: profileData.contactPhone || (existing ? existing.contactPhone : ''),
      address: profileData.address || (existing ? existing.address : ''),
      hiringPreferences: profileData.hiringPreferences || (existing ? existing.hiringPreferences : {}),
      verificationStatus: profileData.verificationStatus || (existing ? existing.verificationStatus : KYC_STATUS.PENDING),
      verificationDocs: profileData.verificationDocs || (existing ? existing.verificationDocs : []),
      adminNotes: profileData.adminNotes || (existing ? existing.adminNotes : null),
      profileCompletion: 0,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    profile.profileCompletion = calculateOrganizationCompletion(profile);
    this.organizationProfiles.set(userId, profile);

    // Update user onboarding status
    if (profile.profileCompletion === 100) {
      user.onboardingStatus = ONBOARDING_STATUS.COMPLETED;
    } else if (profile.profileCompletion > 0) {
      user.onboardingStatus = ONBOARDING_STATUS.IN_PROGRESS;
    }

    return JSON.parse(JSON.stringify(profile));
  }

  getOrganizationProfile(userId) {
    const p = this.organizationProfiles.get(userId);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  upsertInstituteProfile(userId, profileData) {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    if (user.role !== ROLES.INSTITUTE) {
      const err = new Error(`Cannot create institute profile for user with role: ${user.role}`);
      err.statusCode = 403;
      throw err;
    }

    const existing = this.instituteProfiles.get(userId);
    const id = existing ? existing.id : `inst_${crypto.randomBytes(8).toString('hex')}`;

    const profile = {
      id,
      userId,
      instituteName: profileData.instituteName || (existing ? existing.instituteName : ''),
      instituteCode: profileData.instituteCode || (existing ? existing.instituteCode : ''),
      instituteType: profileData.instituteType || (existing ? existing.instituteType : ''),
      address: profileData.address || (existing ? existing.address : {}),
      website: profileData.website || (existing ? existing.website : ''),
      logoUrl: profileData.logoUrl || (existing ? existing.logoUrl : ''),
      contactPhone: profileData.contactPhone || (existing ? existing.contactPhone : ''),
      officialEmail: profileData.officialEmail || (existing ? existing.officialEmail : ''),
      departments: profileData.departments || (existing ? existing.departments : []),
      placementContact: profileData.placementContact || (existing ? existing.placementContact : {}),
      verificationStatus: profileData.verificationStatus || (existing ? existing.verificationStatus : KYC_STATUS.PENDING),
      verificationDocs: profileData.verificationDocs || (existing ? existing.verificationDocs : []),
      profileCompletion: 0,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    profile.profileCompletion = calculateInstituteCompletion(profile);
    this.instituteProfiles.set(userId, profile);

    // Update user onboarding status
    if (profile.profileCompletion === 100) {
      user.onboardingStatus = ONBOARDING_STATUS.COMPLETED;
    } else if (profile.profileCompletion > 0) {
      user.onboardingStatus = ONBOARDING_STATUS.IN_PROGRESS;
    }

    return JSON.parse(JSON.stringify(profile));
  }

  getInstituteProfile(userId) {
    const p = this.instituteProfiles.get(userId);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  upsertAdminProfile(userId, profileData) {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    if (user.role !== ROLES.ADMIN) {
      const err = new Error(`Cannot create admin profile for user with role: ${user.role}`);
      err.statusCode = 403;
      throw err;
    }

    const existing = this.adminProfiles.get(userId);
    const id = existing ? existing.id : `adm_${crypto.randomBytes(8).toString('hex')}`;

    const profile = {
      id,
      userId,
      permissions: profileData.permissions || (existing ? existing.permissions : ['ALL']),
      department: profileData.department || (existing ? existing.department : 'Platform Governance'),
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.adminProfiles.set(userId, profile);
    user.onboardingStatus = ONBOARDING_STATUS.COMPLETED;
    return JSON.parse(JSON.stringify(profile));
  }

  // Audit Logs (Append-Only & Immutable)
  recordAuditLog(actorUserId, action, details = {}) {
    const entry = {
      id: `aud_${crypto.randomBytes(8).toString('hex')}`,
      actorUserId,
      action,
      targetUserId: details.targetUserId || null,
      resourceType: details.resourceType || null,
      resourceId: details.resourceId || null,
      metadata: details.metadata || {},
      ipAddress: details.ipAddress || '127.0.0.1',
      userAgent: details.userAgent || 'SkillBridge-E2E-Runner',
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.push(Object.freeze(entry));
    return entry;
  }

  getAuditLogs(filter = {}) {
    let list = [...this.auditLogs];
    if (filter.actorUserId) list = list.filter(l => l.actorUserId === filter.actorUserId);
    if (filter.targetUserId) list = list.filter(l => l.targetUserId === filter.targetUserId);
    if (filter.action) list = list.filter(l => l.action === filter.action);
    return list.map(l => JSON.parse(JSON.stringify(l)));
  }

  // Opportunity publishing with capability check
  publishOpportunity(orgUserId, oppData) {
    const user = this.users.get(orgUserId);
    if (!user) throw new Error('User not found');
    if (user.role !== ROLES.ORGANIZATION && user.role !== ROLES.INDUSTRY) {
      const err = new Error('Only organizations can publish opportunities');
      err.statusCode = 403;
      throw err;
    }
    if (user.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
      const err = new Error(`Account status is ${user.accountStatus}; action blocked`);
      err.statusCode = 403;
      throw err;
    }

    const orgProfile = this.organizationProfiles.get(orgUserId);
    if (!orgProfile || orgProfile.verificationStatus !== KYC_STATUS.APPROVED) {
      const err = new Error('Action not allowed while organization verification is pending or unapproved');
      err.statusCode = 403;
      throw err;
    }

    const id = oppData.id || `opp_${crypto.randomBytes(6).toString('hex')}`;
    const opp = {
      id,
      organizationId: orgUserId,
      title: oppData.title,
      description: oppData.description || '',
      highPrioritySkills: oppData.highPrioritySkills || [],
      lowPrioritySkills: oppData.lowPrioritySkills || [],
      status: 'PUBLISHED',
      createdAt: new Date().toISOString(),
    };

    this.opportunities.set(id, opp);
    return JSON.parse(JSON.stringify(opp));
  }
}

// ============================================================================
// SIMULATED EDGE MIDDLEWARE & ROUTE PROTECTION
// ============================================================================
function simulateEdgeMiddleware(pathname, sessionUser) {
  // Public paths
  const publicPaths = ['/', '/login', '/register', '/api/auth', '/api/auth/signup-intent', '/terms', '/privacy'];
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return { status: 200, allowed: true, action: 'NEXT' };
  }

  // Authenticated paths
  if (!sessionUser) {
    return {
      status: 307,
      allowed: false,
      action: 'REDIRECT',
      redirectUrl: `/login?callbackUrl=${encodeURIComponent(pathname)}`,
      error: 'Unauthenticated',
    };
  }

  // Account status check
  if (sessionUser.accountStatus === ACCOUNT_STATUS.SUSPENDED || sessionUser.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
    return {
      status: 403,
      allowed: false,
      action: 'ERROR_PAGE',
      error: 'Account suspended or deactivated',
    };
  }

  // Role Partitioning
  if (pathname.startsWith('/admin')) {
    if (sessionUser.role !== ROLES.ADMIN) {
      return { status: 403, allowed: false, action: 'ERROR_PAGE', error: 'Forbidden: Admin role required' };
    }
    return { status: 200, allowed: true, action: 'NEXT' };
  }

  if (pathname.startsWith('/student')) {
    if (sessionUser.role !== ROLES.STUDENT) {
      return { status: 403, allowed: false, action: 'ERROR_PAGE', error: 'Forbidden: Student role required' };
    }
    // Check onboarding redirect
    if (sessionUser.onboardingStatus !== ONBOARDING_STATUS.COMPLETED && pathname.startsWith('/student/dashboard')) {
      return {
        status: 307,
        allowed: false,
        action: 'REDIRECT',
        redirectUrl: '/student/onboarding',
        reason: 'Incomplete onboarding',
      };
    }
    return { status: 200, allowed: true, action: 'NEXT' };
  }

  if (pathname.startsWith('/organization') || pathname.startsWith('/recruiter')) {
    if (sessionUser.role !== ROLES.ORGANIZATION && sessionUser.role !== ROLES.INDUSTRY) {
      return { status: 403, allowed: false, action: 'ERROR_PAGE', error: 'Forbidden: Organization role required' };
    }
    // Check onboarding redirect
    if (sessionUser.onboardingStatus !== ONBOARDING_STATUS.COMPLETED && (pathname.startsWith('/organization/dashboard') || pathname.startsWith('/recruiter/dashboard'))) {
      return {
        status: 307,
        allowed: false,
        action: 'REDIRECT',
        redirectUrl: '/organization/onboarding',
        reason: 'Incomplete onboarding',
      };
    }
    return { status: 200, allowed: true, action: 'NEXT' };
  }

  if (pathname.startsWith('/institute') || pathname.startsWith('/faculty')) {
    if (sessionUser.role !== ROLES.INSTITUTE) {
      return { status: 403, allowed: false, action: 'ERROR_PAGE', error: 'Forbidden: Institute role required' };
    }
    // Check onboarding redirect
    if (sessionUser.onboardingStatus !== ONBOARDING_STATUS.COMPLETED && (pathname.startsWith('/institute/dashboard') || pathname.startsWith('/faculty/dashboard'))) {
      return {
        status: 307,
        allowed: false,
        action: 'REDIRECT',
        redirectUrl: '/institute/onboarding',
        reason: 'Incomplete onboarding',
      };
    }
    return { status: 200, allowed: true, action: 'NEXT' };
  }

  return { status: 200, allowed: true, action: 'NEXT' };
}

// ============================================================================
// SIMULATED API GUARD (withAuth)
// ============================================================================
function simulateApiGuard(sessionUser, options = {}, targetResourceOwnerId = null) {
  // 1. Session check
  if (!sessionUser) {
    return { status: 401, error: 'Unauthorized' };
  }

  // 2. Account status check
  if (options.requireActive !== false) {
    if (sessionUser.accountStatus === ACCOUNT_STATUS.SUSPENDED || sessionUser.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
      return { status: 403, error: 'Account suspended or deactivated' };
    }
  }

  // 3. Role check
  if (options.roles && Array.isArray(options.roles) && options.roles.length > 0) {
    if (!options.roles.includes(sessionUser.role)) {
      return { status: 403, error: 'Forbidden: Insufficient role permissions' };
    }
  }

  // 4. Onboarding check
  if (options.requireOnboarded) {
    if (sessionUser.onboardingStatus !== ONBOARDING_STATUS.COMPLETED) {
      return { status: 403, error: 'Forbidden: Onboarding completion required' };
    }
  }

  // 5. IDOR / Ownership Check
  if (options.checkOwnership && targetResourceOwnerId) {
    if (sessionUser.role !== ROLES.ADMIN && sessionUser.id !== targetResourceOwnerId) {
      return { status: 403, error: 'Forbidden: Resource ownership mismatch' };
    }
  }

  return { status: 200, user: sessionUser };
}

module.exports = {
  ROLES,
  ACCOUNT_STATUS,
  ONBOARDING_STATUS,
  KYC_STATUS,
  AUDIT_ACTIONS,
  MockDatabase,
  calculateStudentCompletion,
  calculateOrganizationCompletion,
  calculateInstituteCompletion,
  calculateProfileCompletion,
  isProfileComplete,
  simulateEdgeMiddleware,
  simulateApiGuard,
  loadProjectModule,
};
