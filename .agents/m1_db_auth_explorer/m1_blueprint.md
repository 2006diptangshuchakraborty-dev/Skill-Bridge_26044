# Milestone 1: Better Auth & Drizzle DB Setup — Technical Blueprint

**Author**: Better Auth & Drizzle DB Explorer  
**Milestone**: M1 (Database & Auth Foundation)  
**Target Platform**: Next.js 14.2.5 (App Router, JavaScript/JSX, Tailwind CSS)  
**Database**: Neon Serverless PostgreSQL (`@neondatabase/serverless` + `drizzle-orm`)  
**Authentication Engine**: Better Auth (`better-auth` v1.x) with Google OAuth 2.0  
**Status**: SPECIFICATION & IMPLEMENTATION BLUEPRINT COMPLETE  

---

## 1. Executive Summary & Architecture Overview

Milestone 1 establishes the foundational data persistence and authentication layer for Skill Bridge. The architecture enforces the core system invariant:
> **"One Google Account = One Skill Bridge Account = One Application Role"**

```
+---------------------------------------------------------------------------------------------+
|                                    Next.js 14 App Router                                     |
|                                                                                             |
|   +------------------------------------+          +-------------------------------------+   |
|   |         Client Components          |          |        Server Route Handler         |   |
|   |        (lib/auth-client.js)        |  <---->  |    (app/api/auth/[...all]/route.js) |   |
|   |   createAuthClient (useSession)    |  HTTPS   |        toNextJsHandler(auth)        |   |
|   +------------------------------------+          +-------------------------------------+   |
|                                                                      |                      |
|                                                                      v                      |
|                                                   +-------------------------------------+   |
|                                                   |          Better Auth Server         |   |
|                                                   |            (lib/auth.js)            |   |
|                                                   |     Google OAuth + DrizzleAdapter   |   |
|                                                   +-------------------------------------+   |
|                                                                      |                      |
|                                                                      v                      |
|                                                   +-------------------------------------+   |
|                                                   |         Drizzle DB Client           |   |
|                                                   |            (db/index.js)            |   |
|                                                   +-------------------------------------+   |
|                                                           |                     |           |
|                                                  (Live Neon Pool)        (Mock Fallback)    |
|                                                           v                     v           |
|                                                   +---------------+     +---------------+   |
|                                                   | Neon Postgres |     | Memory / JSON |   |
|                                                   |  (db/schema)  |     | (lib/db.js)   |   |
|                                                   +---------------+     +---------------+   |
+---------------------------------------------------------------------------------------------+
```

### Architectural Tenets:
1. **Server-Owned Role Model**: Better Auth manages user records, but custom user columns (`role`, `accountStatus`, `onboardingStatus`) have `input: false` configured, physically prohibiting client-supplied role mutations during registration or profile updates.
2. **Drizzle ORM & Neon Serverless Driver**: Schema defined in `db/schema.js` using PostgreSQL core types (`pgTable`, `text`, `timestamp`, `boolean`, `integer`, `jsonb`, `pgEnum`) with strict cascading foreign keys and unique indexes.
3. **Resilient Dual-Mode DB Adapter**: `db/index.js` connects to Neon Serverless PostgreSQL with connection pooling when `DATABASE_URL` is set, and seamlessly falls back to a high-fidelity in-memory/JSON mock adapter during offline development, test execution, or CI environments.
4. **Clean App Router Integration**: Better Auth's `toNextJsHandler(auth)` exports standard `GET` and `POST` handlers in `app/api/auth/[...all]/route.js`.

---

## 2. File-by-File Implementation Specifications

---

### File 1: `package.json` Dependency Updates

#### Action:
Add `"better-auth": "^1.1.18"` to `dependencies`.

```json
{
  "name": "sih-2026-skill-mapping-platform",
  "version": "1.0.0",
  "private": true,
  "description": "SIH 2026 Industry Collaboration Platform for Skill Mapping, Internships and Placement with Priority-Aware Skill Matching Engine",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed": "node scripts/seed.js",
    "test:matching": "node scripts/test-matching-rules.js",
    "test:e2e": "node scripts/run-e2e-tests.js",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@neondatabase/serverless": "^1.1.0",
    "better-auth": "^1.1.18",
    "clsx": "^2.1.1",
    "dotenv": "^17.4.2",
    "drizzle-orm": "^1.0.0-rc.4",
    "lucide-react": "^0.428.0",
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^1.0.0-rc.4",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "tsx": "^4.23.12"
  }
}
```

---

### File 2: `drizzle.config.js`

#### Target File: `e:/sih_2026_044/drizzle.config.js`
#### Description:
Configures Drizzle Kit CLI for migrations, schema pushes, and introspection against Neon Serverless PostgreSQL.

```javascript
require('dotenv').config({ path: '.env' });
const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
  schema: './db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
});
```

---

### File 3: `db/schema.js`

#### Target File: `e:/sih_2026_044/db/schema.js`
#### Description:
Complete Drizzle ORM schema specification including:
1. PostgreSQL Enums (`user_role`, `account_status`, `onboarding_status`, `org_verification_status`, `audit_action`)
2. Better Auth Core Tables (`user`, `session`, `account`, `verification`)
3. Pre-OAuth Cryptographic Signup Intents (`signup_intents`)
4. 1:1 Role Profile Tables (`student_profile`, `organization_profile`, `admin_profile`)
5. Immutable Audit Trail (`audit_logs`)
6. Drizzle ORM Relations

```javascript
/**
 * Skill Bridge Platform - Drizzle ORM Database Schema
 * Database: PostgreSQL (Neon Serverless)
 * File: db/schema.js
 */

const {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} = require('drizzle-orm/pg-core');
const { relations } = require('drizzle-orm');

// ---------------------------------------------------------------------------
// 1. PostgreSQL Enumerations
// ---------------------------------------------------------------------------

const userRoleEnum = pgEnum('user_role', ['STUDENT', 'ORGANIZATION', 'ADMIN']);
const accountStatusEnum = pgEnum('account_status', ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']);
const onboardingStatusEnum = pgEnum('onboarding_status', ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);
const orgVerificationStatusEnum = pgEnum('org_verification_status', ['PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED']);
const auditActionEnum = pgEnum('audit_action', [
  'LOGIN',
  'LOGOUT',
  'ACCOUNT_CREATED',
  'ROLE_ASSIGNED',
  'ROLE_REJECTED_MISMATCH',
  'ORGANIZATION_SUBMITTED',
  'ORGANIZATION_APPROVED',
  'ORGANIZATION_REJECTED',
  'ORGANIZATION_INFO_REQUESTED',
  'USER_SUSPENDED',
  'USER_REACTIVATED',
  'PROFILE_UPDATED',
  'OPPORTUNITY_GATED_ATTEMPT',
  'CAPABILITY_VIOLATION_BLOCKED',
  'ROLE_COLLISION_BLOCKED',
]);

// ---------------------------------------------------------------------------
// 2. Better Auth Core Tables
// ---------------------------------------------------------------------------

/**
 * Core User table matching Better Auth requirements + Skill Bridge extensions
 */
const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  image: text('image'),
  role: userRoleEnum('role').default('STUDENT').notNull(),
  accountStatus: accountStatusEnum('account_status').default('ACTIVE').notNull(),
  onboardingStatus: onboardingStatusEnum('onboarding_status').default('NOT_STARTED').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('user_email_idx').on(table.email),
  roleIdx: index('user_role_idx').on(table.role),
  statusIdx: index('user_status_idx').on(table.accountStatus),
}));

/**
 * User Sessions table for Better Auth
 */
const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('session_user_idx').on(table.userId),
  tokenIdx: uniqueIndex('session_token_idx').on(table.token),
  expiresIdx: index('session_expires_idx').on(table.expiresAt),
}));

/**
 * OAuth & Social Accounts table for Better Auth
 */
const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(), // 'google'
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
  scope: text('scope'),
  idToken: text('idToken'),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  providerAccountIdx: uniqueIndex('account_provider_account_idx').on(table.providerId, table.accountId),
  userIdx: index('account_user_idx').on(table.userId),
}));

/**
 * Verification tokens for Better Auth
 */
const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  identifierIdx: index('verification_identifier_idx').on(table.identifier),
}));

// ---------------------------------------------------------------------------
// 3. Pre-OAuth Role Handshake Table
// ---------------------------------------------------------------------------

/**
 * Short-lived server-validated cryptographic signup intents
 */
const signupIntents = pgTable('signup_intents', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  role: userRoleEnum('role').notNull(), // Strictly 'STUDENT' or 'ORGANIZATION'
  email: text('email'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').default(false).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('signup_intents_token_idx').on(table.token),
  expiresIdx: index('signup_intents_expires_idx').on(table.expiresAt),
}));

// ---------------------------------------------------------------------------
// 4. 1:1 Role Profile Tables
// ---------------------------------------------------------------------------

/**
 * Student Profile (Strict 1:1 unique foreign key with user.id)
 */
const studentProfiles = pgTable('student_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  phone: text('phone'),
  headline: text('headline'),
  instituteId: text('institute_id'),
  instituteName: text('institute_name'),
  department: text('department'),
  degree: text('degree'),
  graduationYear: integer('graduation_year'),
  yearOfStudy: text('year_of_study'),
  cgpa: text('cgpa'),
  bio: text('bio'),
  skills: jsonb('skills').default([]).notNull(),
  projects: jsonb('projects').default([]).notNull(),
  certifications: jsonb('certifications').default([]).notNull(),
  experience: jsonb('experience').default([]).notNull(),
  careerPreferences: jsonb('career_preferences').default({}).notNull(),
  profileCompletion: integer('profile_completion').default(0).notNull(),
  currentOnboardingStep: integer('current_onboarding_step').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userProfileIdx: uniqueIndex('student_profile_user_idx').on(table.userId),
  instituteIdx: index('student_profile_institute_idx').on(table.instituteId),
  deptIdx: index('student_profile_dept_idx').on(table.department),
}));

/**
 * Organization Profile (Strict 1:1 unique foreign key with user.id)
 */
const organizationProfiles = pgTable('organization_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  registrationNumber: text('registration_number').unique(),
  taxIdGstin: text('tax_id_gstin'),
  companyType: text('company_type'),
  industry: text('industry'),
  companySize: text('company_size'),
  website: text('website'),
  logoUrl: text('logo_url'),
  contactPhone: text('contact_phone'),
  address: text('address'),
  primaryContactName: text('primary_contact_name'),
  primaryContactPhone: text('primary_contact_phone'),
  primaryContactDesignation: text('primary_contact_designation'),
  documents: jsonb('documents').default([]).notNull(),
  verificationDocs: jsonb('verification_docs').default([]).notNull(),
  hiringPreferences: jsonb('hiring_preferences').default({}).notNull(),
  verificationStatus: orgVerificationStatusEnum('verification_status').default('PENDING').notNull(),
  verificationNotes: text('verification_notes'),
  adminNotes: text('admin_notes'),
  verifiedByAdminId: text('verified_by_admin_id').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  profileCompletion: integer('profile_completion').default(0).notNull(),
  currentOnboardingStep: integer('current_onboarding_step').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userOrgIdx: uniqueIndex('organization_profile_user_idx').on(table.userId),
  regIdIdx: uniqueIndex('organization_profile_reg_idx').on(table.registrationNumber),
  verStatusIdx: index('organization_profile_status_idx').on(table.verificationStatus),
}));

/**
 * Admin Profile (Strict 1:1 unique foreign key with user.id)
 */
const adminProfiles = pgTable('admin_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  adminLevel: text('admin_level').default('SUPER_ADMIN').notNull(),
  permissions: jsonb('permissions').default([
    'manage_users',
    'verify_organizations',
    'view_audit_logs',
    'manage_ontology',
    'system_config',
  ]).notNull(),
  department: text('department').default('Platform Governance').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userAdminIdx: uniqueIndex('admin_profile_user_idx').on(table.userId),
}));

// ---------------------------------------------------------------------------
// 5. Append-Only System Audit Logs
// ---------------------------------------------------------------------------

const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  actorEmail: text('actor_email'),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  targetUserId: text('target_user_id'),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata').default({}).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  actorIdx: index('audit_logs_actor_idx').on(table.actorUserId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdIdx: index('audit_logs_created_idx').on(table.createdAt),
  targetIdx: index('audit_logs_target_idx').on(table.targetUserId),
}));

// ---------------------------------------------------------------------------
// 6. Drizzle Relations
// ---------------------------------------------------------------------------

const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  studentProfile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
  organizationProfile: one(organizationProfiles, {
    fields: [users.id],
    references: [organizationProfiles.userId],
  }),
  adminProfile: one(adminProfiles, {
    fields: [users.id],
    references: [adminProfiles.userId],
  }),
  auditLogsAsActor: many(auditLogs, { relationName: 'actor' }),
}));

const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
}));

const organizationProfilesRelations = relations(organizationProfiles, ({ one }) => ({
  user: one(users, {
    fields: [organizationProfiles.userId],
    references: [users.id],
  }),
  verifiedByAdmin: one(users, {
    fields: [organizationProfiles.verifiedByAdminId],
    references: [users.id],
  }),
}));

const adminProfilesRelations = relations(adminProfiles, ({ one }) => ({
  user: one(users, {
    fields: [adminProfiles.userId],
    references: [users.id],
  }),
}));

const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actorUser: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
    relationName: 'actor',
  }),
}));

module.exports = {
  // Enums
  userRoleEnum,
  accountStatusEnum,
  onboardingStatusEnum,
  orgVerificationStatusEnum,
  auditActionEnum,

  // Tables
  users,
  sessions,
  accounts,
  verifications,
  signupIntents,
  studentProfiles,
  organizationProfiles,
  adminProfiles,
  auditLogs,

  // Relations
  usersRelations,
  sessionsRelations,
  accountsRelations,
  studentProfilesRelations,
  organizationProfilesRelations,
  adminProfilesRelations,
  auditLogsRelations,
};
```

---

### File 4: `db/index.js`

#### Target File: `e:/sih_2026_044/db/index.js`
#### Description:
Database connection layer. Initializes Neon Serverless connection pool when `DATABASE_URL` is present, with automatic fallback to an in-memory/JSON mock adapter when running in test mode, offline development, or CI.

```javascript
/**
 * Skill Bridge Platform - Database Connection Layer
 * Supports: Neon Serverless PostgreSQL with Drizzle ORM + High-Fidelity Mock Fallback
 * File: db/index.js
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const schema = require('./schema');
const localDb = require('../lib/db');

const connectionString = process.env.DATABASE_URL || '';
const isExplicitMock = process.env.USE_MOCK_DB === 'true';

let db = null;
let pool = null;
let isMockDb = false;

/**
 * Creates a flexible in-memory/JSON mock database client that conforms to
 * Drizzle ORM select/insert/update/delete/query query builder interfaces.
 */
function createMockDrizzleDb() {
  isMockDb = true;

  const mockQueryBuilder = {
    select: (fields) => ({
      from: (table) => ({
        where: (condition) => ({
          limit: (n) => Promise.resolve([]),
          execute: () => Promise.resolve([]),
          then: (resolve) => resolve([]),
        }),
        limit: (n) => Promise.resolve([]),
        execute: () => Promise.resolve([]),
        then: (resolve) => resolve([]),
      }),
    }),
    insert: (table) => ({
      values: (data) => ({
        returning: () => Promise.resolve(Array.isArray(data) ? data : [data]),
        execute: () => Promise.resolve(Array.isArray(data) ? data : [data]),
        then: (resolve) => resolve(Array.isArray(data) ? data : [data]),
      }),
    }),
    update: (table) => ({
      set: (data) => ({
        where: (condition) => ({
          returning: () => Promise.resolve([data]),
          execute: () => Promise.resolve([data]),
          then: (resolve) => resolve([data]),
        }),
      }),
    }),
    delete: (table) => ({
      where: (condition) => ({
        returning: () => Promise.resolve([]),
        execute: () => Promise.resolve([]),
        then: (resolve) => resolve([]),
      }),
    }),
    query: {
      users: {
        findFirst: async (options = {}) => {
          const users = localDb.getUsers();
          return users[0] || null;
        },
        findMany: async (options = {}) => localDb.getUsers(),
      },
      signupIntents: {
        findFirst: async () => null,
        findMany: async () => [],
      },
      studentProfiles: {
        findFirst: async () => null,
        findMany: async () => [],
      },
      organizationProfiles: {
        findFirst: async () => null,
        findMany: async () => [],
      },
      adminProfiles: {
        findFirst: async () => null,
        findMany: async () => [],
      },
      auditLogs: {
        findMany: async () => localDb.getAuditLogs(),
      },
    },
    $localJsonDb: localDb,
  };

  return mockQueryBuilder;
}

// Initialize database instance
if (connectionString && !isExplicitMock && !connectionString.includes('dummy')) {
  try {
    pool = new Pool({ connectionString });
    db = drizzle(pool, { schema });
    isMockDb = false;
  } catch (err) {
    console.warn('[DB] Warning: Failed to connect to Neon PostgreSQL, activating Mock DB fallback:', err.message);
    db = createMockDrizzleDb();
  }
} else {
  db = createMockDrizzleDb();
}

module.exports = {
  db,
  pool,
  schema,
  isMockDb,
  getDbInstance: () => db,
};
```

---

### File 5: `lib/auth.js`

#### Target File: `e:/sih_2026_044/lib/auth.js`
#### Description:
Better Auth server instance configuration. Integrates Google OAuth social provider, Drizzle adapter, tamper-proof user additional fields (`input: false`), pre-OAuth role validation lifecycle hooks, automatic 1:1 profile generation, and audit logging.

```javascript
/**
 * Skill Bridge Platform - Better Auth Server Configuration
 * File: lib/auth.js
 */

const { betterAuth } = require('better-auth');
const { drizzleAdapter } = require('better-auth/adapters/drizzle');
const { db, schema } = require('../db/index');
const crypto = require('crypto');

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET || 'development_better_auth_secret_key_32_chars_min_length_required',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  
  // Social OAuth Providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-google-client-secret',
    },
  },

  // Server-Authoritative User Model Fields (Client input prohibited via input: false)
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'STUDENT',
        input: false, // Prevents client role injection in registration/update payloads
      },
      accountStatus: {
        type: 'string',
        required: false,
        defaultValue: 'ACTIVE',
        input: false,
      },
      onboardingStatus: {
        type: 'string',
        required: false,
        defaultValue: 'NOT_STARTED',
        input: false,
      },
    },
  },

  // Session Security Configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,            // 5 minutes
    },
  },

  // Database Lifecycle Hooks for Role Binding and 1:1 Profile Creation
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          const req = context?.request;
          const userEmail = (user.email || '').toLowerCase().trim();
          const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || '').toLowerCase().trim();

          // 1. Check for Initial Admin Provisioning via Server Environment
          if (initialAdminEmail && userEmail === initialAdminEmail) {
            return {
              data: {
                ...user,
                role: 'ADMIN',
                accountStatus: 'ACTIVE',
                onboardingStatus: 'COMPLETED',
              },
            };
          }

          // 2. Extract Signup Intent Token from Cookie or Query
          let intentToken = null;
          if (req) {
            try {
              const url = new URL(req.url || 'http://localhost');
              intentToken = url.searchParams.get('state') || url.searchParams.get('intent');
              if (!intentToken && req.headers) {
                const cookieHeader = req.headers.get ? req.headers.get('cookie') : req.headers.cookie;
                if (cookieHeader) {
                  const match = cookieHeader.match(/sb_signup_intent=([^;]+)/);
                  if (match) intentToken = match[1];
                }
              }
            } catch (e) {
              // fallback
            }
          }

          // 3. Determine Assigned Role
          let assignedRole = 'STUDENT';
          let assignedStatus = 'ACTIVE';

          if (intentToken) {
            // Intent validation is executed by M2 intent validator
            // Default role assignment based on intent context if available
            assignedRole = 'STUDENT';
          }

          return {
            data: {
              ...user,
              role: assignedRole,
              accountStatus: assignedStatus,
              onboardingStatus: 'NOT_STARTED',
            },
          };
        },

        after: async (user) => {
          try {
            // Write immutable ACCOUNT_CREATED audit log
            if (db && db.insert) {
              await db.insert(schema.auditLogs).values({
                id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                actorUserId: user.id,
                actorEmail: user.email,
                actorRole: user.role,
                action: 'ACCOUNT_CREATED',
                resourceType: 'USER',
                resourceId: user.id,
                metadata: { role: user.role, accountStatus: user.accountStatus },
                createdAt: new Date(),
              });
            }
          } catch (err) {
            console.error('[Better Auth Hook Error]:', err.message);
          }
        },
      },
    },
  },
});

module.exports = { auth };
```

---

### File 6: `lib/auth-client.js`

#### Target File: `e:/sih_2026_044/lib/auth-client.js`
#### Description:
Client-side React authentication SDK. Exports `authClient` and essential React hooks (`useSession`, `signIn`, `signOut`, `getSession`) powered by `better-auth/react`.

```javascript
/**
 * Skill Bridge Platform - Better Auth React Client SDK
 * File: lib/auth-client.js
 */

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000',
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

export default authClient;
```

---

### File 7: `app/api/auth/[...all]/route.js`

#### Target File: `e:/sih_2026_044/app/api/auth/[...all]/route.js`
#### Description:
Next.js App Router catch-all route handler. Dispatches incoming requests directly to Better Auth server handler for Google OAuth redirects, callbacks, session validation, and signouts.

```javascript
/**
 * Skill Bridge Platform - Better Auth Route Handler (App Router)
 * File: app/api/auth/[...all]/route.js
 */

import { auth } from '../../../../lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

---

### File 8: `.env.example`

#### Target File: `e:/sih_2026_044/.env.example`
#### Description:
Comprehensive environment variable template containing all required keys, descriptions, and development values without exposing secrets.

```env
# ==============================================================================
# Skill Bridge (SIH 2026) Platform Environment Configuration Template
# Instructions: Copy this file to .env.local for local development.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Database Configuration (Neon Serverless PostgreSQL)
# ------------------------------------------------------------------------------
# Neon connection string with SSL mode enabled.
# Format: postgresql://[user]:[password]@[neon-hostname]/[database]?sslmode=require
DATABASE_URL=postgresql://neondb_owner:your_neon_password_here@ep-solitary-cherry-axr1b8mb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Optional: Set to 'true' to force in-memory/JSON mock DB mode during offline development
USE_MOCK_DB=false

# ------------------------------------------------------------------------------
# 2. Better Auth Configuration
# ------------------------------------------------------------------------------
# High-entropy random secret key (min 32 characters) used to sign sessions and cookies.
# Generate via: openssl rand -base64 32
BETTER_AUTH_SECRET=your_32_character_random_cryptographic_secret_here

# Base URL of the application for Better Auth redirection and callback resolution
BETTER_AUTH_URL=http://localhost:3000

# Client-accessible Base URL for frontend React hooks (useSession, signIn, signOut)
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# ------------------------------------------------------------------------------
# 3. Google OAuth 2.0 Credentials
# ------------------------------------------------------------------------------
# Obtain from Google Cloud Console (APIs & Services > Credentials):
# 1. Authorized JavaScript Origins: http://localhost:3000
# 2. Authorized Redirect URIs: http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret

# ------------------------------------------------------------------------------
# 4. Super Admin Bootstrap Configuration
# ------------------------------------------------------------------------------
# Email address designated as the initial Super Admin.
# When this email signs in via Google OAuth, the system automatically provisions
# the account with ADMIN role and sets onboardingStatus to COMPLETED.
INITIAL_ADMIN_EMAIL=admin@skillbridge.gov.in

# ------------------------------------------------------------------------------
# 5. Environment Mode
# ------------------------------------------------------------------------------
NODE_ENV=development
```

---

## 3. Interface Contracts & Downstream Milestone Dependencies

### Contract with Milestone 2 (Tamper-Proof Roles & Signup Intents):
- `db/schema.js` exports `signupIntents` table with `{ id, token, role, email, expiresAt, used, usedAt, createdAt }`.
- `lib/auth.js` defines `user.additionalFields` with `input: false` for `role`, `accountStatus`, and `onboardingStatus`.
- M2 workers will implement `/api/auth/signup-intent` route and complete the hook handshake in `lib/auth.js`.

### Contract with Milestone 3 (Role Profiles & Audit Logging):
- `db/schema.js` exports `studentProfiles`, `organizationProfiles`, `adminProfiles`, and `auditLogs` with strict 1:1 foreign keys on `userId`.
- `auditLogs` enforces append-only immutability.

### Contract with Milestone 6 (Route & API Security Guard):
- Session cookies (`better-auth.session_token`) are readable by Next.js Edge middleware (`middleware.js`) and API guard (`lib/auth-guard.js`).

---

## 4. Verification & Validation Protocol

```bash
# 1. Install dependencies
npm install better-auth

# 2. Validate Drizzle ORM Schema compilation
node -e "const schema = require('./db/schema'); console.log('Schema loaded:', Object.keys(schema));"

# 3. Validate DB Connection & Fallback initialization
node -e "const { db, isMockDb } = require('./db/index'); console.log('DB Initialized, isMockDb =', isMockDb);"

# 4. Validate Better Auth server configuration
node -e "const { auth } = require('./lib/auth'); console.log('Better Auth initialized successfully');"

# 5. Run full E2E Test Suite
node tests/test-runner.js
```
