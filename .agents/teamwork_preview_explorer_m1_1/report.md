# Milestone M1 Implementation Blueprint: Database Schema, Better Auth Hooks & Role Alignment

**Explorer**: Explorer M1  
**Working Directory**: `e:\sih_2026_044\.agents\teamwork_preview_explorer_m1_1\`  
**Date**: 2026-08-24  
**Target Modules**: `db/schema.js`, `lib/signup-intent.js`, `lib/auth.js`, `lib/onboarding-calc.js`, `tests/auth-test-helper.js`, `tests/e2e/tier1-feature-coverage.test.js`

---

## 1. Executive Summary & Milestone Scope

Milestone M1 establishes the foundational data schemas, server authentication lifecycle hooks, role governance boundaries, and profile completion calculation engines required for the Skill Bridge platform.

### Objectives:
1. **Drizzle ORM Schema (`db/schema.js`)**:
   - Resolve Webpack ESM bundling issue (remove invalid `better-auth` import at line 8).
   - Add `INSTITUTE` and `INDUSTRY` to `userRoleEnum` alongside `STUDENT`, `ORGANIZATION`, `ADMIN`.
   - Add `profileCompleted: boolean('profile_completed').default(false).notNull()` to `users` table.
   - Create 1:1 `instituteProfiles` (`institute_profile`) table with strict cascade FK to `users.id` and unique index on `userId`.
   - Export canonical tables and relations: `instituteProfiles`, `instituteProfilesRelations`, alias `industryProfiles = organizationProfiles`, `industry_profile = organization_profile`, `institute_profile = instituteProfiles`.
2. **Pre-OAuth Signup Intent Engine (`lib/signup-intent.js`)**:
   - Update `ALLOWED_SIGNUP_ROLES = ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']`.
   - Preserve strict public admin registration prohibition (403 Forbidden).
   - Preserve 256-bit cryptographic token generation and 15-minute TTL validation.
3. **Better Auth Server Engine (`lib/auth.js`)**:
   - Add `profileCompleted: { type: "boolean", defaultValue: false, input: false }` to `user.additionalFields`.
   - In `databaseHooks.user.create.before`, set initial `profileCompleted = false` (or `true` for initial admin).
   - In `databaseHooks.user.create.after`, auto-provision 1:1 `institute_profile` record for `INSTITUTE` role and emit `ACCOUNT_CREATED` and `ROLE_ASSIGNED` audit logs.
   - Preserve role immutability in `databaseHooks.user.update.before`.
4. **Dynamic Profile Completion Scoring (`lib/onboarding-calc.js`)**:
   - Implement `calculateInstituteCompletion(profile)` and `getInstituteCompletionDetails(profile)`.
   - Implement and export `calculateProfileCompletion(userOrRole, profile)` and `isProfileComplete(userOrRole, profile, threshold = 70)`.
5. **Test Infrastructure & Verification (`tests/auth-test-helper.js` & Test Suites)**:
   - Extend `MockDatabase` with `instituteProfiles` storage, `upsertInstituteProfile`, and `getInstituteProfile`.
   - Update `createSignupIntent` whitelist and middleware simulator.
   - Maintain 100% pass rate across all 30 auth tests, 13 matching engine tests, and 8 skill verification tests.

---

## 2. Component Blueprint: `db/schema.js`

### 2.1 Critical Bug Identified & Fix
In `db/schema.js:8`, `const { email, github, linkedin } = require('better-auth');` caused `next build` to fail (`Module not found: ESM packages (better-auth) need to be imported`). This line is completely unused and must be removed.

### 2.2 Detailed Schema Changes
1. **`userRoleEnum`**:
   ```javascript
   const userRoleEnum = pgEnum('user_role', ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION', 'ADMIN']);
   ```
2. **`users` Table**:
   ```javascript
   const users = pgTable('user', {
     id: text('id').primaryKey(),
     name: text('name').notNull(),
     email: text('email').notNull().unique(),
     emailVerified: boolean('emailVerified').default(false).notNull(),
     image: text('image'),
     role: userRoleEnum('role').default('STUDENT').notNull(),
     accountStatus: accountStatusEnum('account_status').default('ACTIVE').notNull(),
     onboardingStatus: onboardingStatusEnum('onboarding_status').default('NOT_STARTED').notNull(),
     profileCompleted: boolean('profile_completed').default(false).notNull(),
     createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
     updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
   }, (table) => ({
     emailIdx: index('user_email_idx').on(table.email),
     roleIdx: index('user_role_idx').on(table.role),
     statusIdx: index('user_status_idx').on(table.accountStatus),
   }));
   ```
3. **`instituteProfiles` Table (`institute_profile`)**:
   ```javascript
   /**
    * Institute Profile (Strict 1:1 unique foreign key with user.id)
    */
   const instituteProfiles = pgTable('institute_profile', {
     id: text('id').primaryKey(),
     userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
     instituteName: text('institute_name').notNull(),
     instituteCode: text('institute_code').unique(),
     instituteType: text('institute_type'),
     address: jsonb('address').default({}).notNull(),
     website: text('website'),
     logoUrl: text('logo_url'),
     contactPhone: text('contact_phone'),
     officialEmail: text('official_email'),
     departments: jsonb('departments').default([]).notNull(),
     placementContact: jsonb('placement_contact').default({}).notNull(),
     verificationStatus: orgVerificationStatusEnum('verification_status').default('PENDING').notNull(),
     verificationDocs: jsonb('verification_docs').default([]).notNull(),
     profileCompletion: integer('profile_completion').default(0).notNull(),
     currentOnboardingStep: integer('current_onboarding_step').default(1).notNull(),
     createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
     updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
   }, (table) => ({
     userInstIdx: uniqueIndex('institute_profile_user_idx').on(table.userId),
     codeIdx: uniqueIndex('institute_profile_code_idx').on(table.instituteCode),
     statusIdx: index('institute_profile_status_idx').on(table.verificationStatus),
   }));
   ```
4. **Relations**:
   ```javascript
   // In usersRelations:
   instituteProfile: one(instituteProfiles, {
     fields: [users.id],
     references: [instituteProfiles.userId],
   }),

   // Top-level instituteProfilesRelations:
   const instituteProfilesRelations = relations(instituteProfiles, ({ one }) => ({
     user: one(users, {
       fields: [instituteProfiles.userId],
       references: [users.id],
     }),
   }));
   ```
5. **Exports & Aliases**:
   ```javascript
   module.exports = {
     // Enums
     userRoleEnum,
     accountStatusEnum,
     onboardingStatusEnum,
     orgVerificationStatusEnum,
     auditActionEnum,

     // Canonical Table Names
     users,
     sessions,
     accounts,
     verifications,
     signupIntents,
     studentProfiles,
     organizationProfiles,
     instituteProfiles,
     adminProfiles,
     auditLogs,

     // Aliases for compatibility
     user: users,
     session: sessions,
     account: accounts,
     verification: verifications,
     signup_intents: signupIntents,
     student_profile: studentProfiles,
     organization_profile: organizationProfiles,
     industry_profile: organizationProfiles,
     industryProfiles: organizationProfiles,
     institute_profile: instituteProfiles,
     admin_profile: adminProfiles,
     audit_logs: auditLogs,

     // Relations
     usersRelations,
     sessionsRelations,
     accountsRelations,
     studentProfilesRelations,
     organizationProfilesRelations,
     instituteProfilesRelations,
     adminProfilesRelations,
     auditLogsRelations,
   };
   ```

---

## 3. Component Blueprint: `lib/signup-intent.js`

### 3.1 Role Whitelist & Governance
```javascript
const ALLOWED_SIGNUP_ROLES = ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION'];
```

### 3.2 Immutability & Ban Enforcement
- `createSignupIntent({ role, email })`:
  1. If `!role || typeof role !== 'string'` -> Throws 400 Bad Request (`ROLE_REQUIRED`).
  2. If `normalizedRole === 'ADMIN'` -> Throws 403 Forbidden (`ADMIN_REGISTRATION_FORBIDDEN`).
  3. If `!ALLOWED_SIGNUP_ROLES.includes(normalizedRole)` -> Throws 400 Bad Request (`INVALID_ROLE`).
  4. Generates 32-byte entropy token, 15-minute expiration, returns `{ id, token, role, expiresAt }`.
- `resolveValidIntent(token)`: Validates token expiration, consumed status (`usedAt`), returns clean intent payload.
- `markIntentUsed(token)`: Atomically sets `used = true`, `usedAt = new Date()`.

---

## 4. Component Blueprint: `lib/auth.js`

### 4.1 Additional User Fields Configuration
```javascript
user: {
  additionalFields: {
    role: {
      type: "string",
      required: true,
      defaultValue: "STUDENT",
      input: false, // Prevents client role injection in registration/update payloads
    },
    accountStatus: {
      type: "string",
      required: true,
      defaultValue: "PENDING",
      input: false,
    },
    onboardingStatus: {
      type: "string",
      required: true,
      defaultValue: "NOT_STARTED",
      input: false,
    },
    profileCompleted: {
      type: "boolean",
      defaultValue: false,
      input: false,
    },
  },
},
```

### 4.2 Database Lifecycle Hooks
1. **`user.create.before`**:
   - Validates initial admin email match -> sets `role = 'ADMIN'`, `accountStatus = 'ACTIVE'`, `onboardingStatus = 'COMPLETED'`, `profileCompleted = true`.
   - Extracts intent token from search params or cookie `sb_signup_intent`.
   - Resolves intent against `ALLOWED_SIGNUP_ROLES = ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']`.
   - Assigns `accountStatus`: `'ACTIVE'` for `STUDENT`, `'PENDING'` for `INDUSTRY`, `INSTITUTE`, `ORGANIZATION`.
   - Initializes `profileCompleted: false`.

2. **`user.create.after`**:
   - Auto-provisions 1:1 role profile:
     - `STUDENT` -> `studentProfiles`
     - `INSTITUTE` -> `instituteProfiles`:
       ```javascript
       const profileData = {
         id: `prof_inst_${user.id}`,
         userId: user.id,
         instituteName: user.name || "New Institute",
         address: {},
         departments: [],
         placementContact: {},
         verificationDocs: [],
         verificationStatus: "PENDING",
         profileCompletion: 0,
         currentOnboardingStep: 1,
         createdAt: now,
         updatedAt: now,
       };
       if (db && typeof db.insert === "function") {
         try {
           await db.insert(schema.instituteProfiles).values(profileData);
         } catch (err) {}
       }
       try {
         const dbInstance = localDb.getDb();
         dbInstance.instituteProfiles = dbInstance.instituteProfiles || [];
         if (!dbInstance.instituteProfiles.some((p) => p.userId === user.id)) {
           dbInstance.instituteProfiles.push(profileData);
           localDb.saveDb(dbInstance);
         }
       } catch (err) {}
       ```
     - `ORGANIZATION` / `INDUSTRY` -> `organizationProfiles`
     - `ADMIN` -> `adminProfiles`
   - Records audit logs:
     - `ACCOUNT_CREATED`
     - `ROLE_ASSIGNED` with `assignedRole` and `assignedStatus`

3. **`user.update.before`**:
   - Sanitizes user updates by deleting `role`, `accountStatus`, and `id` to enforce role immutability.

---

## 5. Component Blueprint: `lib/onboarding-calc.js`

### 5.1 Institute Completion Scoring (`calculateInstituteCompletion`)
```javascript
/**
 * Calculates dynamic profile completion percentage for an Institute profile.
 * Returns integer 0-100.
 *
 * Scoring Breakdown (Total: 100%):
 * 1. Basic Info (15%): instituteName + (website || logoUrl || officialEmail) = 15% (7.5% partial)
 * 2. Identification (20%): instituteCode + instituteType = 20% (10% partial)
 * 3. Campus Contact (15%): contactPhone + address = 15% (7.5% partial)
 * 4. Departments (15%): departments array length >= 1 = 15%
 * 5. Placement Cell (15%): placementContact details present = 15%
 * 6. Verification Docs (15%): verificationDocs array length >= 1 = 15%
 * 7. Review & Normalization: score >= 95 rounded to 100%
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
```

### 5.2 Unified Interface Methods
```javascript
/**
 * Universal profile completion calculator supporting all roles (STUDENT, INDUSTRY/ORGANIZATION, INSTITUTE, ADMIN).
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
 */
function isProfileComplete(userOrRole, profile, threshold = 70) {
  if (userOrRole && typeof userOrRole === 'object') {
    if (userOrRole.profileCompleted === true) return true;
    if (userOrRole.onboardingStatus === 'COMPLETED') return true;
  }
  const score = calculateProfileCompletion(userOrRole, profile);
  return score >= threshold;
}
```

---

## 6. Component Blueprint: Test Infrastructure & Helper (`tests/auth-test-helper.js`)

### 6.1 `ROLES` Specification Constants
```javascript
const ROLES = {
  STUDENT: 'STUDENT',
  ORGANIZATION: 'ORGANIZATION',
  INDUSTRY: 'INDUSTRY',
  INSTITUTE: 'INSTITUTE',
  ADMIN: 'ADMIN',
};
```

### 6.2 `MockDatabase` Enhancements
1. Add `this.instituteProfiles = new Map();` to constructor/reset.
2. In `createSignupIntent(role, email, ttlSeconds)`:
   ```javascript
   if (![ROLES.STUDENT, ROLES.ORGANIZATION, ROLES.INDUSTRY, ROLES.INSTITUTE].includes(role)) {
     const err = new Error(`Invalid role for signup intent: ${role}`);
     err.statusCode = 400;
     throw err;
   }
   ```
3. Add `upsertInstituteProfile(userId, profileData)`:
   ```javascript
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

     if (profile.profileCompletion === 100) {
       user.onboardingStatus = ONBOARDING_STATUS.COMPLETED;
     } else if (profile.profileCompletion > 0) {
       user.onboardingStatus = ONBOARDING_STATUS.IN_PROGRESS;
     }

     return JSON.parse(JSON.stringify(profile));
   }
   ```
4. Add `getInstituteProfile(userId)`:
   ```javascript
   getInstituteProfile(userId) {
     const p = this.instituteProfiles.get(userId);
     return p ? JSON.parse(JSON.stringify(p)) : null;
   }
   ```

### 6.3 Additional Unit & Integration Tests in `tests/e2e/tier1-feature-coverage.test.js`
1. Intent generation for `INSTITUTE` and `INDUSTRY`.
2. Strict 1:1 `institute_profile` schema constraint verification.
3. Dynamic multi-step institute completion scoring and breakdown.
4. Universal `calculateProfileCompletion` & `isProfileComplete` threshold assertions.

---

## 7. Build and Verification Matrix

| Verification Target | Command | Expected Output | Critical Check |
|---|---|---|---|
| Master Auth Test Suite | `node tests/test-auth-suite.js` | 30/30 Passed (100%) | Covers Tiers 1-4 |
| Matching Engine Rules | `node scripts/test-matching-rules.js` | 13/13 Passed (100%) | Mandatory & Priority rules |
| Skill Verification System | `node tests/test-verification-system.js` | 8/8 Passed (100%) | Taxonomies, Questions & Scoring |
| Full E2E Test Suite | `npm run test:e2e` | 51/51 Passed (100%) | Zero failures |
| Next.js Production Build | `npm run build` | Zero compilation errors | ESM import bug resolved in `db/schema.js` |

---

## 8. Milestone M1 Implementation Sequence

1. **Step 1: Fix `db/schema.js`**:
   - Delete line 8 ESM `better-auth` import.
   - Update `userRoleEnum` to `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION', 'ADMIN']`.
   - Add `profileCompleted` column to `users`.
   - Define `instituteProfiles` table and relations.
   - Export `institute_profile`, `industryProfiles`, `industry_profile`, and relations.
2. **Step 2: Update `lib/signup-intent.js`**:
   - Ensure `ALLOWED_SIGNUP_ROLES = ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']`.
3. **Step 3: Update `lib/auth.js`**:
   - Ensure `profileCompleted` in `user.additionalFields`.
   - In `user.create.after`, add auto-provisioning for `INSTITUTE`.
4. **Step 4: Update `lib/onboarding-calc.js`**:
   - Ensure `calculateInstituteCompletion`, `getInstituteCompletionDetails`, `calculateProfileCompletion`, `isProfileComplete` are exported.
5. **Step 5: Update `tests/auth-test-helper.js` & `tests/e2e/tier1-feature-coverage.test.js`**:
   - Update `ROLES` and `MockDatabase` with `instituteProfiles`.
   - Add explicit tests for `INSTITUTE` & `INDUSTRY`.
6. **Step 6: Run Tests & Build Verification**:
   - Run `npm run test:e2e` (all 51 tests pass).
   - Run `npm run build` (Next.js build succeeds with 0 errors).
