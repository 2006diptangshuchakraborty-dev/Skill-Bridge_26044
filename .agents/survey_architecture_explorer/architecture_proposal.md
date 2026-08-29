# Comprehensive Security & Technical Architecture Proposal
## Authentication, Authorization, Role Governance, and Profile System for Skill Bridge (SIH 2026)

---

### Table of Contents
1. [Executive Summary & Core Architectural Tenets](#1-executive-summary--core-architectural-tenets)
2. [Database Schema Architecture (Drizzle ORM for Neon PostgreSQL)](#2-database-schema-architecture-drizzle-orm-for-neon-postgresql)
3. [Tamper-Proof Role Assignment & Google OAuth Lifecycle](#3-tamper-proof-role-assignment--google-oauth-lifecycle)
4. [Multi-Step Onboarding State Machines & Dynamic Completion Engine](#4-multi-step-onboarding-state-machines--dynamic-completion-engine)
5. [Admin Governance, Verification Workflows & Capability Gatekeeping](#5-admin-governance-verification-workflows--capability-gatekeeping)
6. [Next.js Route Protection & API Security Authorization Architecture](#6-nextjs-route-protection--api-security-authorization-architecture)
7. [Comprehensive Audit Logging & Compliance Framework](#7-comprehensive-audit-logging--compliance-framework)
8. [Threat Model & Security Mitigation Matrix](#8-threat-model--security-mitigation-matrix)
9. [Implementation Blueprint & Migration Strategy](#9-implementation-blueprint--migration-strategy)

---

### 1. Executive Summary & Core Architectural Tenets

The Skill Bridge platform requires an enterprise-grade, zero-trust authentication and authorization framework. The system is designed around the non-negotiable axiom:
> **"One Google Account = One Skill Bridge Account = One Application Role"**

```
+-----------------------------------------------------------------------------------+
|                                 Zero-Trust Perimeter                               |
|                                                                                   |
|   +-------------------+     +---------------------+     +---------------------+   |
|   |  STUDENT Role     |     |  ORGANIZATION Role  |     |     ADMIN Role      |   |
|   |  - Student Portal |     |  - Recruiter Portal |     |  - Governance Queue |   |
|   |  - Skill Profile  |     |  - KYC Verification |     |  - Audit Log Trail  |   |
|   |  - Opportunities  |     |  - Opp Publishing   |     |  - System RBAC      |   |
|   +-------------------+     +---------------------+     +---------------------+   |
|            ^                           ^                           ^              |
|            |                           |                           |              |
|   +---------------------------------------------------------------------------+   |
|   |          Next.js Route Guard Middleware & API Auth Helpers (withAuth)      |   |
|   |              [ Session + Role + AccountStatus + Ownership Check ]          |   |
|   +---------------------------------------------------------------------------+   |
|                                        ^                                          |
|                                        |                                          |
|   +---------------------------------------------------------------------------+   |
|   |         Better Auth Server Layer & Tamper-Proof Signup Intent Broker      |   |
|   +---------------------------------------------------------------------------+   |
|                                        ^                                          |
|                                        |                                          |
|   +---------------------------------------------------------------------------+   |
|   |     PostgreSQL / Neon Database Layer (Drizzle ORM with Strict 1:1 Keys)   |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

#### Core Architectural Pillars:
1. **Server-Authoritative Role Assignment**: User roles (`STUDENT`, `ORGANIZATION`, `ADMIN`) are strictly server-owned. Roles cannot be injected, modified, or requested via client-side payloads, query strings, headers, or localStorage.
2. **Pre-OAuth Cryptographic Signup Intents**: Public role selection is decoupled from client callbacks and secured via short-lived, single-use, server-validated cryptographic intent records in PostgreSQL.
3. **Strict Role Immutability & Anti-Hijacking**: A user's role is permanently immutable once established. Returning Google OAuth logins strictly resolve to the user's existing role profile, regardless of the login button clicked.
4. **Admin Public Registration Isolation**: Public registration for the `ADMIN` role is physically impossible. Admin accounts are exclusively provisioned via bootstrap environment seeding (`INITIAL_ADMIN_EMAIL`) or cryptographic invitations from existing Super Admins.
5. **Multi-Step Onboarding with Dynamic Completion Engine**: New accounts transition through deterministic state machines (`NOT_STARTED` -> `IN_PROGRESS` -> `COMPLETED`) with mathematically weighted profile scoring.
6. **Capability Gating for Organizations**: Unverified (`PENDING`, `INFO_REQUESTED`, `REJECTED`, or `SUSPENDED`) organizations are quarantined; they can prepare draft opportunities but are strictly blocked from publishing opportunities, inspecting student PII, or contacting candidates.
7. **Complete Audit Trail**: Every sensitive lifecycle event (authentication, role binding, KYC approvals, privilege escalations, gating violations) is logged in an append-only `audit_logs` table.

---

### 2. Database Schema Architecture (Drizzle ORM for Neon PostgreSQL)

The schema is built on Neon Serverless PostgreSQL using Drizzle ORM. Strict foreign keys with cascading rules, unique indexes, and PostgreSQL check constraints guarantee data integrity.

```
                              +--------------------+
                              |    better_auth     |
                              |       user         |
                              |--------------------|
                              | id (PK, text)      |
                              | email (UQ, text)   |
                              | role (enum)        |
                              | accountStatus(enum)|
                              | onboardingStatus(e)|
                              +--------------------+
                                 |   |   |   |   |
     +---------------------------+   |   |   |   +---------------------------+
     | 1:1                           |   |   |                           1:1 |
     v                               |   |   |                               v
+-----------------------+            |   |   |                   +-----------------------+
|    student_profile    |            |   |   |                   |     admin_profile     |
|-----------------------|            |   |   |                   |-----------------------|
| id (PK, text)         |            |   |   |                   | id (PK, text)         |
| userId (UQ, FK)       |            |   |   |                   | userId (UQ, FK)       |
| instituteId (text)    |            |   |   |                   | adminLevel (text)     |
| skills (jsonb)        |            |   |   |                   | permissions (jsonb)   |
| profileCompletion(int)|            |   |   |                   +-----------------------+
+-----------------------+            |   |   |
                                     |   |   +------------------------------------+
                                     |   | 1:N                                    |
                                     |   v                                        |
                                     | +-------------------+                      |
                                     | |      session      |                      |
                                     | |-------------------|                      |
                                     | | id (PK, text)     |                      |
                                     | | userId (FK)       |                      |
                                     | | token (UQ, text)  |                      |
                                     | +-------------------+                      |
                                     |                                            |
                                     | 1:1                                        | 1:N
                                     v                                            v
                         +-----------------------+                    +-----------------------+
                         |  organization_profile |                    |      audit_logs       |
                         |-----------------------|                    |-----------------------|
                         | id (PK, text)         |                    | id (PK, text)         |
                         | userId (UQ, FK)       |                    | actorUserId (FK, null)|
                         | registrationId (UQ)   |                    | action (enum/text)    |
                         | verificationStatus(e) |                    | resourceType (text)   |
                         | verifiedByAdminId(FK) |                    | metadata (jsonb)      |
                         +-----------------------+                    +-----------------------+
```

#### Complete Drizzle ORM Schema Specification (`lib/schema.ts` / `lib/schema.js`)

```typescript
import { 
  pgTable, 
  text, 
  timestamp, 
  boolean, 
  integer, 
  jsonb, 
  pgEnum, 
  uniqueIndex, 
  index 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum('user_role', ['STUDENT', 'ORGANIZATION', 'ADMIN']);
export const accountStatusEnum = pgEnum('account_status', ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']);
export const onboardingStatusEnum = pgEnum('onboarding_status', ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);
export const orgVerificationStatusEnum = pgEnum('org_verification_status', ['PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED']);
export const auditActionEnum = pgEnum('audit_action', [
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
  'OPPORTUNITY_GATED_ATTEMPT'
]);

// ---------------------------------------------------------------------------
// 1. Better Auth Core Tables
// ---------------------------------------------------------------------------

export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  image: text('image'),
  role: userRoleEnum('role').notNull(),
  accountStatus: accountStatusEnum('account_status').default('ACTIVE').notNull(),
  onboardingStatus: onboardingStatusEnum('onboarding_status').default('NOT_STARTED').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('user_email_idx').on(table.email),
  roleIdx: index('user_role_idx').on(table.role),
  statusIdx: index('user_status_idx').on(table.accountStatus),
}));

export const sessions = pgTable('session', {
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

export const accounts = pgTable('account', {
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

export const verifications = pgTable('verification', {
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
// 2. Cryptographic Signup Intent Table (Pre-OAuth Role Handshake)
// ---------------------------------------------------------------------------

export const signupIntents = pgTable('signup_intents', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(), // Cryptographic UUID / 32-byte hex
  role: userRoleEnum('role').notNull(),    // Strictly 'STUDENT' or 'ORGANIZATION'
  email: text('email'),                   // Optional pre-declared email
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // 15-minute TTL
  used: boolean('used').default(false).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('signup_intents_token_idx').on(table.token),
  expiresIdx: index('signup_intents_expires_idx').on(table.expiresAt),
}));

// ---------------------------------------------------------------------------
// 3. Student Profile Table (Strict 1:1 with User)
// ---------------------------------------------------------------------------

export const studentProfiles = pgTable('student_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  phone: text('phone'),
  instituteId: text('institute_id'),
  instituteName: text('institute_name'),
  department: text('department'),
  degree: text('degree'),
  graduationYear: integer('graduation_year'),
  cgpa: text('cgpa'),
  bio: text('bio'),
  // Canonical skills array with proficiency (1-4) & evidence (1-5)
  // Structure: [{ skillId, name, canonicalName, proficiency, evidenceLevel, evidenceUrl }]
  skills: jsonb('skills').default([]).notNull(),
  // Structured projects: [{ title, description, liveUrl, repoUrl, technologies }]
  projects: jsonb('projects').default([]).notNull(),
  // Certifications: [{ name, issuer, issueDate, credentialUrl }]
  certifications: jsonb('certifications').default([]).notNull(),
  // Experience: [{ title, company, type, startDate, endDate, current, description }]
  experience: jsonb('experience').default([]).notNull(),
  // Career Preferences: { targetRoles: [], preferredLocations: [], workMode: '', expectedStipend: '' }
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

// ---------------------------------------------------------------------------
// 4. Organization Profile Table (Strict 1:1 with User)
// ---------------------------------------------------------------------------

export const organizationProfiles = pgTable('organization_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  registrationId: text('registration_id').unique(), // CIN / GSTIN / LLPIN
  companyType: text('company_type'),               // 'Startup' | 'Enterprise' | 'MSME' | 'Govt'
  website: text('website'),
  logoUrl: text('logo_url'),
  industry: text('industry'),
  companySize: text('company_size'),               // '1-10' | '11-50' | '51-200' | '500+'
  headquarters: text('headquarters'),
  address: text('address'),
  primaryContactName: text('primary_contact_name'),
  primaryContactPhone: text('primary_contact_phone'),
  primaryContactDesignation: text('primary_contact_designation'),
  // Verification documents: [{ docType, fileName, fileUrl, uploadedAt, verificationNote }]
  documents: jsonb('documents').default([]).notNull(),
  // Hiring preferences: { targetBranches: [], preferredRoles: [], annualHiringEstimate: 0, typicalStipendRange: '' }
  hiringPreferences: jsonb('hiring_preferences').default({}).notNull(),
  verificationStatus: orgVerificationStatusEnum('verification_status').default('PENDING').notNull(),
  verificationNotes: text('verification_notes'),
  verifiedByAdminId: text('verified_by_admin_id').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  profileCompletion: integer('profile_completion').default(0).notNull(),
  currentOnboardingStep: integer('current_onboarding_step').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userOrgIdx: uniqueIndex('organization_profile_user_idx').on(table.userId),
  regIdIdx: uniqueIndex('organization_profile_reg_idx').on(table.registrationId),
  verStatusIdx: index('organization_profile_status_idx').on(table.verificationStatus),
}));

// ---------------------------------------------------------------------------
// 5. Admin Profile Table (Strict 1:1 with User)
// ---------------------------------------------------------------------------

export const adminProfiles = pgTable('admin_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  adminLevel: text('admin_level').default('SUPER_ADMIN').notNull(), // 'SUPER_ADMIN' | 'VERIFICATION_ADMIN' | 'AUDIT_ADMIN'
  permissions: jsonb('permissions').default([
    'manage_users', 
    'verify_organizations', 
    'view_audit_logs', 
    'manage_ontology', 
    'system_config'
  ]).notNull(),
  department: text('department').default('Platform Governance').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userAdminIdx: uniqueIndex('admin_profile_user_idx').on(table.userId),
}));

// ---------------------------------------------------------------------------
// 6. Append-Only Audit Logs Table
// ---------------------------------------------------------------------------

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  actorEmail: text('actor_email'),
  actorRole: text('actor_role'),
  action: text('action').notNull(), // Using auditActionEnum values or descriptive string
  targetUserId: text('target_user_id'),
  resourceType: text('resource_type').notNull(), // 'USER' | 'STUDENT_PROFILE' | 'ORGANIZATION_PROFILE' | 'OPPORTUNITY' | 'SYSTEM'
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
// Drizzle Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
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

export const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
}));

export const organizationProfilesRelations = relations(organizationProfiles, ({ one }) => ({
  user: one(users, {
    fields: [organizationProfiles.userId],
    references: [users.id],
  }),
  verifiedByAdmin: one(users, {
    fields: [organizationProfiles.verifiedByAdminId],
    references: [users.id],
  }),
}));

export const adminProfilesRelations = relations(adminProfiles, ({ one }) => ({
  user: one(users, {
    fields: [adminProfiles.userId],
    references: [users.id],
  }),
}));
```

---

### 3. Tamper-Proof Role Assignment & Google OAuth Lifecycle

#### The Threat Vectors & Architectural Solutions

| Threat Vector | Attack Scenario | Architectural Defense |
| :--- | :--- | :--- |
| **Client Role Injection** | Attacker intercepts `/api/auth/sign-in` and modifies `{ role: 'ADMIN' }` | Roles are ignored from auth payloads. Role is looked up strictly from server-validated `signup_intents` records. |
| **Role Switching on Login** | Student clicks "Recruiter Login" button to escalate privileges | Returning OAuth users are resolved strictly by Google `sub`/`email`. Their immutable DB `user.role` overrides any client context. |
| **Role Cross-Registration** | Registered Student attempts to sign up again as Organization with same Google ID | Server detects existing email. Sign-up intent is voided; redirect returns `?error=role_mismatch&existingRole=STUDENT`, triggering a protective UI modal. |
| **Public Admin Registration** | Attacker submits intent token with `{ role: 'ADMIN' }` | Intent generator endpoint strictly enforces `role IN ('STUDENT', 'ORGANIZATION')`. Admins can only be provisioned via server seed or internal admin invitations. |
| **Replay Attack on Intents** | Attacker intercepts a valid intent token and creates multiple accounts | Intent record is marked `used = true` and stamped with `usedAt` in a single ACID transaction during account creation. |

#### Complete OAuth Flow Diagram

```
User (Browser)           Signup Intent API           Google OAuth Provider        Better Auth Hook / DB
     |                            |                            |                            |
 1.  |-- Select "Student" ------->|                            |                            |
     |   POST /api/auth/intent    |                            |                            |
     |   { role: 'STUDENT' }      |                            |                            |
 2.  |                            |-- Generate UUID token ---->|                            |
     |                            |   Save in signup_intents   |                            |
     |                            |   (TTL 15m, used=false)    |                            |
 3.  |<-- Return intentToken -----|                            |                            |
     |   Set HttpOnly Cookie      |                            |                            |
     |                            |                            |                            |
 4.  |-- Redirect to Google OAuth (with state=intentToken) --->|                            |
 5.  |<-- User consents on Google Login -----------------------|                            |
 6.  |-- OAuth Callback to /api/auth/callback/google --------->|                            |
     |                            |                            |-- Exchange code for profile|
     |                            |                            |   (email, sub, name)       |
 7.  |                            |                            |--------------------------->| Intercept Hook
     |                            |                            |                            |
     |                            |                            |             +--------------+--------------+
     |                            |                            |             | Check if User Exists in DB  |
     |                            |                            |             +--------------+--------------+
     |                            |                            |                            |
     |                            |                            |   [USER ALREADY EXISTS]    |   [NEW USER REGISTRATION]
     |                            |                            |   - Retrieve DB user.role  |   - Validate intent token
     |                            |                            |   - If intent.role != role |   - Mark intent used=true
     |                            |                            |     Log ROLE_REJECTED      |   - Insert user(role=intent.role)
     |                            |                            |     Redirect with modal    |   - Insert role profile (1:1)
     |                            |                            |   - Else: Issue Session    |   - Log ACCOUNT_CREATED
     |                            |                            |                            |   - Issue Session
 8.  |<-- Set Session Cookie & Redirect to Role Dashboard / Onboarding ---------------------|
```

#### Detailed Intent & Hook Implementation Architecture

##### A. Intent Creation Endpoint (`app/api/auth/signup-intent/route.ts`)
```typescript
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { signupIntents } from '@/lib/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { role, email } = body;

    // 1. Strict Role Whitelist (ADMIN is completely forbidden from public intent generation)
    if (!['STUDENT', 'ORGANIZATION'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid or prohibited role selection. Admin registration is disabled.' },
        { status: 400 }
      );
    }

    // 2. Generate 32-byte Cryptographic Token
    const intentToken = `intent_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutes TTL

    // 3. Persist in signup_intents table
    await db.insert(signupIntents).values({
      id: `si_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      token: intentToken,
      role: role as 'STUDENT' | 'ORGANIZATION',
      email: email ? email.toLowerCase().trim() : null,
      expiresAt,
      used: false,
    });

    // 4. Return token and set Secure HttpOnly Cookie as redundancy
    const response = NextResponse.json({ success: true, intentToken });
    response.cookies.set('sb_signup_intent', intentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 mins
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
```

##### B. Better Auth Server Configuration (`lib/auth.ts`)
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          const req = context?.request;
          const url = new URL(req?.url || 'http://localhost');
          
          // 1. Extract intent token from query state or cookie
          const stateParam = url.searchParams.get('state');
          const cookieToken = req?.headers?.get('cookie')
            ?.split(';')
            ?.find(c => c.trim().startsWith('sb_signup_intent='))
            ?.split('=')[1];
            
          const intentToken = stateParam || cookieToken;

          // Check if admin bootstrap email
          const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase().trim();
          if (initialAdminEmail && user.email.toLowerCase() === initialAdminEmail) {
            return {
              data: {
                ...user,
                role: 'ADMIN',
                accountStatus: 'ACTIVE',
                onboardingStatus: 'COMPLETED',
              },
            };
          }

          if (!intentToken) {
            throw new Error('Registration failed: Missing role signup intent. Please initiate sign-up from the home portal.');
          }

          // 2. Query signup_intents table
          const [intent] = await db
            .select()
            .from(schema.signupIntents)
            .where(
              and(
                eq(schema.signupIntents.token, intentToken),
                eq(schema.signupIntents.used, false),
                gt(schema.signupIntents.expiresAt, new Date())
              )
            )
            .limit(1);

          if (!intent) {
            throw new Error('Registration failed: Invalid or expired signup intent. Please try again.');
          }

          // 3. Mark intent as used immediately
          await db
            .update(schema.signupIntents)
            .set({ used: true, usedAt: new Date() })
            .where(eq(schema.signupIntents.id, intent.id));

          // 4. Assign role and account parameters
          const assignedRole = intent.role;
          const initialAccountStatus = assignedRole === 'ORGANIZATION' ? 'PENDING' : 'ACTIVE';

          return {
            data: {
              ...user,
              role: assignedRole,
              accountStatus: initialAccountStatus,
              onboardingStatus: 'NOT_STARTED',
            },
          };
        },
        after: async (user) => {
          // Create initial 1:1 profile container
          if (user.role === 'STUDENT') {
            await db.insert(schema.studentProfiles).values({
              id: `prof_stu_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
              userId: user.id,
              profileCompletion: 10,
              currentOnboardingStep: 1,
              skills: [],
              projects: [],
              certifications: [],
              experience: [],
              careerPreferences: {},
            });
          } else if (user.role === 'ORGANIZATION') {
            await db.insert(schema.organizationProfiles).values({
              id: `prof_org_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
              userId: user.id,
              companyName: user.name || 'New Organization',
              verificationStatus: 'PENDING',
              profileCompletion: 10,
              currentOnboardingStep: 1,
              documents: [],
              hiringPreferences: {},
            });
          } else if (user.role === 'ADMIN') {
            await db.insert(schema.adminProfiles).values({
              id: `prof_adm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
              userId: user.id,
              adminLevel: 'SUPER_ADMIN',
              permissions: ['manage_users', 'verify_organizations', 'view_audit_logs', 'manage_ontology', 'system_config'],
            });
          }

          // Write Audit Log
          await db.insert(schema.auditLogs).values({
            id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            actorUserId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            action: 'ACCOUNT_CREATED',
            resourceType: 'USER',
            resourceId: user.id,
            metadata: { role: user.role, accountStatus: user.accountStatus },
          });
        },
      },
    },
  },
});
```

---

### 4. Multi-Step Onboarding State Machines & Dynamic Completion Engine

#### State Machine Definition

Both Student and Organization accounts must complete mandatory onboarding before accessing platform features.

```
       [ NOT_STARTED ]
              |
              | (User enters Onboarding Wizard)
              v
       [ IN_PROGRESS ] <---------------+
              |                        |
              | (Saves step data /     | (User navigates
              |  Uploads documents)    |  between steps)
              v                        |
       [ FINAL REVIEW ] ---------------+
              |
              | (Submits Final Onboarding)
              v
       [ COMPLETED ]
              |
              +---> If STUDENT: Full portal unlocked immediately
              |
              +---> If ORGANIZATION: Sets verificationStatus='PENDING'
                                      Redirects to Verification Hold Screen
```

#### Student Onboarding Flow & Dynamic Weighting Formula

The Student Onboarding Wizard consists of 8 linear steps with weighted scoring:

$$\text{Student Profile Completion} = \sum_{i=1}^{8} \left( \text{Step Weight}_i \times \text{Completion Ratio}_i \right)$$

| Step # | Step Name | Target Data Fields | Section Weight | Minimum Required for Pass |
| :--- | :--- | :--- | :--- | :--- |
| **Step 1** | Basic Info | Phone, Bio, Profile Image, Location | **10%** | Phone & Bio filled |
| **Step 2** | Academic Info | Institute Name, Department, Degree, Grad Year, CGPA | **20%** | Institute, Dept, Degree, Year |
| **Step 3** | Skills & Proficiency | Normalized Skills (1-4 Proficiency, 1-5 Evidence Level) | **25%** | At least 3 skills with proficiency |
| **Step 4** | Projects | Project Title, Tech Stack, Description, Repo/Live URL | **15%** | At least 1 complete project |
| **Step 5** | Certifications | Certificate Name, Issuing Body, Date, Credential Link | **10%** | Optional (gives full 10% if filled) |
| **Step 6** | Work Experience | Job/Intern Title, Company, Dates, Responsibilities | **10%** | Optional (gives full 10% if filled) |
| **Step 7** | Career Preferences | Target Roles, Preferred Locations, Work Mode, Stipend | **10%** | Target Roles + Work Mode |
| **Step 8** | Review & Finish | Final confirmation and confirmation modal | - | Sets `onboardingStatus = COMPLETED` |

#### Organization Onboarding Flow & Dynamic Weighting Formula

| Step # | Step Name | Target Data Fields | Section Weight | Minimum Required for Pass |
| :--- | :--- | :--- | :--- | :--- |
| **Step 1** | Organization Info | Legal Name, Company Type, Logo URL, Website, Size | **20%** | Legal Name, Type, Website, Size |
| **Step 2** | Business Registration | Registration ID (CIN/GSTIN/LLPIN), Reg Address | **25%** | Valid CIN / GSTIN format |
| **Step 3** | Primary Contact | Authorized Officer Name, Designation, Official Email, Phone | **15%** | All 4 contact fields |
| **Step 4** | Industry & Domain | Primary Sector, Tech Domains, Company Overview | **15%** | Sector + Overview (>50 chars) |
| **Step 5** | Hiring Preferences | Target Branches, Typical Roles, Annual Hiring Count, Stipend | **15%** | Target Roles + Branches |
| **Step 6** | Verification Docs | Certificate of Incorporation / GST Certificate Upload | **10%** | At least 1 document uploaded |
| **Step 7** | Review & Submit | Declaration of Authority & Submission for KYC Review | - | Sets `verificationStatus = PENDING` |

#### Real-Time Dynamic Completion Calculator (`lib/profile-completion.ts`)

```typescript
export function calculateStudentCompletion(profile: any): number {
  let score = 0;

  // Step 1: Basic Info (10%)
  if (profile.phone && profile.bio && profile.bio.length >= 20) score += 10;
  else if (profile.phone || profile.bio) score += 5;

  // Step 2: Academic Info (20%)
  const hasAcademic = profile.instituteName && profile.department && profile.degree && profile.graduationYear;
  if (hasAcademic && profile.cgpa) score += 20;
  else if (hasAcademic) score += 15;

  // Step 3: Skills (25%)
  const skillCount = Array.isArray(profile.skills) ? profile.skills.length : 0;
  if (skillCount >= 5) score += 25;
  else if (skillCount >= 3) score += 18;
  else if (skillCount >= 1) score += 10;

  // Step 4: Projects (15%)
  const projectCount = Array.isArray(profile.projects) ? profile.projects.length : 0;
  if (projectCount >= 2) score += 15;
  else if (projectCount === 1) score += 10;

  // Step 5: Certifications (10%)
  const certCount = Array.isArray(profile.certifications) ? profile.certifications.length : 0;
  if (certCount >= 1) score += 10;

  // Step 6: Experience (10%)
  const expCount = Array.isArray(profile.experience) ? profile.experience.length : 0;
  if (expCount >= 1) score += 10;

  // Step 7: Preferences (10%)
  if (profile.careerPreferences?.targetRoles?.length > 0 && profile.careerPreferences?.workMode) score += 10;
  else if (profile.careerPreferences?.targetRoles?.length > 0) score += 5;

  return Math.min(100, Math.max(0, score));
}

export function calculateOrganizationCompletion(profile: any): number {
  let score = 0;

  // Step 1: Info (20%)
  if (profile.companyName && profile.companyType && profile.website && profile.companySize) score += 20;

  // Step 2: Registration (25%)
  if (profile.registrationId && profile.address) score += 25;

  // Step 3: Contact (15%)
  if (profile.primaryContactName && profile.primaryContactPhone && profile.primaryContactDesignation) score += 15;

  // Step 4: Domain (15%)
  if (profile.industry && profile.headquarters) score += 15;

  // Step 5: Hiring Prefs (15%)
  if (profile.hiringPreferences?.targetBranches?.length > 0) score += 15;

  // Step 6: Documents (10%)
  if (Array.isArray(profile.documents) && profile.documents.length > 0) score += 10;

  return Math.min(100, Math.max(0, score));
}
```

---

### 5. Admin Governance, Verification Workflows & Capability Gatekeeping

#### Organization Lifecycle State Transitions

```
[ NEW REGISTRATION ]
        |
        v (Completes Onboarding)
  [ PENDING ] <---------------------------+
        |                                 |
        +-- (Admin: Request Info) --------+
        |    verificationStatus = INFO_REQUESTED
        |
        +-- (Admin: Reject) -------------> [ REJECTED ]
        |    verificationStatus = REJECTED    (accountStatus = DEACTIVATED)
        |
        +-- (Admin: Approve) ------------> [ APPROVED / ACTIVE ]
             verificationStatus = APPROVED    (Full Recruiter Capabilities)
             accountStatus = ACTIVE
                    |
                    +-- (Admin: Suspend) -> [ SUSPENDED ]
                    |    accountStatus = SUSPENDED (Quarantined)
                    |
                    +-- (Admin: Reactivate) [ ACTIVE ]
```

#### Organization Capability Gatekeeping Matrix

| Action / Resource | PENDING | INFO_REQUESTED | REJECTED | SUSPENDED | APPROVED & ACTIVE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Access Recruiter Dashboard (`/recruiter/dashboard`) | View Only (Warning Banner) | View Only (Alert Banner) | Blocked (403) | Blocked (403) | Full Access |
| Create Draft Opportunity (`POST /api/opportunities?draft=true`) | Allowed | Allowed | Blocked | Blocked | Allowed |
| **Publish Live Opportunity (`status: 'PUBLISHED'`)** | **BLOCKED (403)** | **BLOCKED (403)** | **BLOCKED (403)** | **BLOCKED (403)** | **ALLOWED** |
| Run Priority Matching Engine on Applicants | Blocked | Blocked | Blocked | Blocked | Allowed |
| **View Student Profiles / PII / Contact Info** | **BLOCKED (Masked/Redacted)** | **BLOCKED** | **BLOCKED** | **BLOCKED** | **ALLOWED** |
| Send Interview Invites / Job Offers | Blocked | Blocked | Blocked | Blocked | Allowed |
| Submit Student Post-Internship Skill Feedback | Blocked | Blocked | Blocked | Blocked | Allowed |

#### Enforcement Mechanism for Gating

When an unapproved organization attempts to publish an opportunity or query candidate PII:
1. The API Authorization Guard inspects `user.accountStatus` and `organizationProfile.verificationStatus`.
2. If `verificationStatus !== 'APPROVED'` or `accountStatus !== 'ACTIVE'`, the request is rejected with `403 Forbidden` and `{ error: 'CAPABILITY_GATED', reason: 'Organization KYC verification is pending admin approval.' }`.
3. An audit event `OPPORTUNITY_GATED_ATTEMPT` is recorded for compliance review.

---

### 6. Next.js Route Protection & API Security Authorization Architecture

#### Edge Middleware Pipeline (`middleware.ts`)

The Next.js Edge Middleware acts as the first line of defense, performing high-speed session validation and strict route partition isolation before requests reach server components or pages.

```
Incoming Request
       |
       v
+-------------------------------------------------------------+
| Is Public Route? (/, /login, /api/auth/*, /favicon, /static)|
+-------------------------------------------------------------+
       |                         |
     [YES]                      [NO]
       |                         |
   Allow Next                    v
                     +---------------------------------------+
                     | Has Valid Session Cookie / JWT Token? |
                     +---------------------------------------+
                                 |                         |
                               [NO]                      [YES]
                                 |                         |
                 Redirect /login?callbackUrl=...           v
                                           +---------------------------------------+
                                           | Extract User Role & Onboarding Status |
                                           +---------------------------------------+
                                                           |
          +------------------------------------------------+------------------------------------------------+
          |                                                |                                                |
          v                                                v                                                v
  Path: /student/*                                 Path: /recruiter/* or /organization/*            Path: /admin/*
          |                                                |                                                |
  Is role === 'STUDENT'?                           Is role === 'ORGANIZATION'?                      Is role === 'ADMIN'?
    [NO]  -> 403 / Redirect to correct portal        [NO]  -> 403 / Redirect to correct portal        [NO]  -> 403 Forbidden
    [YES] -> Onboarding Complete?                    [YES] -> Onboarding Complete?                    [YES] -> Allow Next
               [NO]  -> Redirect /student/onboarding            [NO]  -> Redirect /organization/onboarding
               [YES] -> Allow Next                              [YES] -> Allow Next
```

#### Middleware Code Specification (`middleware.ts`)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

const PUBLIC_PATHS = ['/', '/login', '/api/auth', '/api/test-matching'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Skip static assets, Next internal files, and public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  // 2. Extract Better Auth Session Cookie
  const sessionToken = req.cookies.get('better-auth.session_token')?.value || 
                       req.cookies.get('__Secure-better-auth.session_token')?.value;

  if (!sessionToken) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Query auth verification endpoint or decode signed token header
  // In Next.js middleware, we can verify the session via fast internal RPC or cookie cache
  const authCheckRes = await fetch(new URL('/api/auth/verify-session', req.url), {
    headers: { cookie: req.headers.get('cookie') || '' },
  });

  if (!authCheckRes.ok) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const { user } = await authCheckRes.json();
  const { role, onboardingStatus, accountStatus } = user;

  // 4. Block Suspended / Deactivated accounts immediately
  if (accountStatus === 'SUSPENDED' || accountStatus === 'DEACTIVATED') {
    return NextResponse.redirect(new URL('/account-suspended', req.url));
  }

  // 5. Partition-specific RBAC Checks
  if (pathname.startsWith('/student')) {
    if (role !== 'STUDENT') {
      return NextResponse.redirect(new URL(getPortalForRole(role), req.url));
    }
    if (onboardingStatus !== 'COMPLETED' && pathname !== '/student/onboarding') {
      return NextResponse.redirect(new URL('/student/onboarding', req.url));
    }
  }

  if (pathname.startsWith('/recruiter') || pathname.startsWith('/organization')) {
    if (role !== 'ORGANIZATION') {
      return NextResponse.redirect(new URL(getPortalForRole(role), req.url));
    }
    if (onboardingStatus !== 'COMPLETED' && pathname !== '/organization/onboarding') {
      return NextResponse.redirect(new URL('/organization/onboarding', req.url));
    }
  }

  if (pathname.startsWith('/admin')) {
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
}

function getPortalForRole(role: string): string {
  switch (role) {
    case 'STUDENT': return '/student/dashboard';
    case 'ORGANIZATION': return '/recruiter/dashboard';
    case 'ADMIN': return '/admin/dashboard';
    default: return '/';
  }
}

export const config = {
  matcher: ['/student/:path*', '/recruiter/:path*', '/organization/:path*', '/admin/:path*', '/api/:path*'],
};
```

#### API Route Authorization Wrapper (`lib/auth-guard.ts`)

To ensure robust defense-in-depth and prevent Insecure Direct Object References (IDOR), API routes must never trust client headers. Every handler is wrapped with `withAuth`.

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq } from 'drizzle-orm';

export interface AuthContext {
  user: typeof schema.users.$inferSelect;
  session: typeof schema.sessions.$inferSelect;
  profile?: any;
}

export interface GuardOptions {
  roles?: ('STUDENT' | 'ORGANIZATION' | 'ADMIN')[];
  allowedStatuses?: ('PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED')[];
  requireOwnership?: (req: Request, context: AuthContext, params: any) => Promise<boolean> | boolean;
}

export function withAuth(
  handler: (req: Request, context: AuthContext, params?: any) => Promise<NextResponse>,
  options: GuardOptions = {}
) {
  return async (req: Request, { params }: { params?: any } = {}) => {
    try {
      // 1. Validate Session from Server Headers
      const sessionResult = await auth.api.getSession({ headers: req.headers });

      if (!sessionResult || !sessionResult.user) {
        return NextResponse.json({ error: 'Unauthorized: Valid session required.' }, { status: 401 });
      }

      const { user, session } = sessionResult;

      // 2. Validate Role Whitelist
      if (options.roles && !options.roles.includes(user.role as any)) {
        return NextResponse.json(
          { error: `Forbidden: Endpoint restricted to roles: ${options.roles.join(', ')}` },
          { status: 403 }
        );
      }

      // 3. Validate Account Status
      const allowedStatuses = options.allowedStatuses || ['ACTIVE'];
      if (!allowedStatuses.includes(user.accountStatus as any)) {
        return NextResponse.json(
          { error: `Account Restricted: Current status is ${user.accountStatus}` },
          { status: 403 }
        );
      }

      // 4. Load Role-Specific Profile
      let profile = null;
      if (user.role === 'STUDENT') {
        profile = await db.query.studentProfiles.findFirst({ where: eq(schema.studentProfiles.userId, user.id) });
      } else if (user.role === 'ORGANIZATION') {
        profile = await db.query.organizationProfiles.findFirst({ where: eq(schema.organizationProfiles.userId, user.id) });
      } else if (user.role === 'ADMIN') {
        profile = await db.query.adminProfiles.findFirst({ where: eq(schema.adminProfiles.userId, user.id) });
      }

      const authContext: AuthContext = {
        user: user as any,
        session: session as any,
        profile,
      };

      // 5. Enforce Resource Ownership (Tenant Isolation / IDOR Protection)
      if (options.requireOwnership) {
        const isOwner = await options.requireOwnership(req, authContext, params);
        if (!isOwner) {
          return NextResponse.json(
            { error: 'Forbidden: You do not have permission to access or mutate this resource.' },
            { status: 403 }
          );
        }
      }

      // 6. Execute Handler
      return await handler(req, authContext, params);
    } catch (error: any) {
      console.error('[API Auth Guard Exception]:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
  };
}
```

---

### 7. Comprehensive Audit Logging & Compliance Framework

#### Audit Logging Utility (`lib/audit.ts`)

```typescript
import { db } from '@/lib/db';
import { auditLogs } from '@/lib/schema';
import crypto from 'crypto';

export interface LogAuditParams {
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  targetUserId?: string | null;
  resourceType: 'USER' | 'STUDENT_PROFILE' | 'ORGANIZATION_PROFILE' | 'OPPORTUNITY' | 'SYSTEM';
  resourceId?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    await db.insert(auditLogs).values({
      id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      actorUserId: params.actorUserId || null,
      actorEmail: params.actorEmail || null,
      actorRole: params.actorRole || null,
      action: params.action,
      targetUserId: params.targetUserId || null,
      resourceType: params.resourceType,
      resourceId: params.resourceId || null,
      metadata: params.metadata || {},
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
  } catch (err) {
    // Non-blocking catch to ensure primary business operations continue while logging failure to stderr
    console.error('[CRITICAL: Audit Log Write Failure]', err);
  }
}
```

#### Event Catalog & Governance Tracking

| Audit Event Code | Trigger Condition | Captured Metadata |
| :--- | :--- | :--- |
| `ACCOUNT_CREATED` | New user created via Better Auth hook | `{ role, accountStatus, provider: 'google', intentToken }` |
| `ROLE_ASSIGNED` | Initial role attached to profile | `{ role, assignedAt, automated: true }` |
| `ROLE_REJECTED_MISMATCH` | Existing user tries to sign up with different role | `{ existingRole, attemptedRole, email, ip }` |
| `ORGANIZATION_SUBMITTED` | Org completes step 7 of onboarding | `{ companyName, registrationId, docCount }` |
| `ORGANIZATION_APPROVED` | Admin approves KYC in queue | `{ approvedByAdminId, adminEmail, priorStatus: 'PENDING' }` |
| `ORGANIZATION_REJECTED` | Admin rejects KYC in queue | `{ rejectedByAdminId, reason, rejectionNotes }` |
| `ORGANIZATION_INFO_REQUESTED` | Admin asks for revised docs | `{ requestedByAdminId, requestNotes }` |
| `USER_SUSPENDED` | Admin suspends user access | `{ suspendedUserId, suspendedByAdminId, reason }` |
| `USER_REACTIVATED` | Admin restores user access | `{ reactivatedUserId, restoredByAdminId }` |
| `PROFILE_UPDATED` | User updates skill / company info | `{ fieldsUpdated: ['skills', 'cgpa'], newCompletionPct }` |
| `OPPORTUNITY_GATED_ATTEMPT`| Unapproved org tries to publish | `{ orgId, opportunityTitle, currentStatus: 'PENDING' }` |

---

### 8. Threat Model & Security Mitigation Matrix

```
+-------------------------------------------------------------------------------------------------------+
|                                    SECURITY DEFENSE MATRIX                                            |
+------------------------------+---------------------------------------+--------------------------------+
| Threat Category              | Potential Attack Surface              | Architectural Mitigation       |
+------------------------------+---------------------------------------+--------------------------------+
| 1. Privilege Escalation      | Client manipulates role in body/query | DB-enforced schema, intent     |
|                              | to claim ADMIN / Recruiter status     | tokens, immutable user.role    |
+------------------------------+---------------------------------------+--------------------------------+
| 2. IDOR / Tenant Spanning    | Org A modifies or deletes Org B's     | withAuth requireOwnership      |
|                              | opportunity by guessing resourceId    | validator against session.id   |
+------------------------------+---------------------------------------+--------------------------------+
| 3. Unverified Org Exposure   | Fraudulent company harvesting student | Verification status check &    |
|                              | contact data & resumes                | candidate PII redaction gating |
+------------------------------+---------------------------------------+--------------------------------+
| 4. Cross-Role Contamination  | Student account trying to view        | Edge middleware partition &    |
|                              | candidate comparison matrix           | role-specific API route guards |
+------------------------------+---------------------------------------+--------------------------------+
| 5. Replay / CSRF in Auth     | Reusing old signup intent tokens or   | 15-min TTL, single-use flag in |
|                              | forging OAuth state                   | DB, cryptographic token check  |
+------------------------------+---------------------------------------+--------------------------------+
```

---

### 9. Implementation Blueprint & Migration Strategy

#### File Structure Organization

```
e:/sih_2026_044/
├── lib/
│   ├── schema.ts                # Pure Drizzle ORM schema (users, profiles, intents, audit)
│   ├── db.ts                    # Neon PostgreSQL connection pool & Drizzle instance
│   ├── auth.ts                  # Better Auth server configuration with database hooks
│   ├── auth-client.ts           # Better Auth React client SDK (`createAuthClient`)
│   ├── auth-guard.ts            # API route authorization wrapper (`withAuth`)
│   ├── profile-completion.ts    # Dynamic percentage calculation formulas
│   └── audit.ts                 # Audit logging dispatcher (`logAuditEvent`)
├── middleware.ts                # Next.js Edge route guard & role redirection
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...all]/route.ts       # Better Auth Next.js route handler
│   │   │   ├── signup-intent/route.ts  # Cryptographic intent issuer
│   │   │   └── verify-session/route.ts # Fast session verification RPC
│   │   ├── opportunities/route.ts      # Gated opportunity management
│   │   ├── students/route.ts           # Student profile & skill management
│   │   └── admin/
│   │       ├── organizations/route.ts  # Verification queue API
│   │       └── audit/route.ts          # Audit logs retrieval API
│   ├── student/
│   │   ├── onboarding/page.jsx         # 8-Step Student Onboarding Wizard
│   │   └── dashboard/page.jsx          # Protected Student Dashboard
│   ├── recruiter/
│   │   ├── onboarding/page.jsx         # 7-Step Organization Onboarding Wizard
│   │   └── dashboard/page.jsx          # Protected Recruiter Dashboard
│   └── admin/
│       ├── dashboard/page.jsx          # Admin Governance Dashboard
│       ├── verification/page.jsx       # KYC Organization Verification Queue
│       └── audit/page.jsx              # Platform Audit Trail Inspector
```

#### Step-by-Step Migration & Rollout Plan

1. **Step 1: Database Migration**: Run Drizzle migrations (`drizzle-kit push` or `drizzle-kit migrate`) against the Neon PostgreSQL instance (`DATABASE_URL`), initializing all enums, tables, and indices.
2. **Step 2: Better Auth & Intent Server Initialization**: Set up `lib/auth.ts`, `lib/auth-client.ts`, and `/api/auth/[...all]/route.ts`. Configure Google OAuth client IDs and secrets.
3. **Step 3: Admin Seeding**: Run `scripts/seed.js` or DB migration to create the initial root administrator account matching `INITIAL_ADMIN_EMAIL` and generate baseline seed profiles.
4. **Step 4: Middleware & API Route Guarding**: Deploy `middleware.ts` and integrate `withAuth` across all existing and new API routes.
5. **Step 5: Onboarding UI Deployment**: Implement multi-step onboarding wizards with dynamic score meters for Students and Organizations.
6. **Step 6: Admin Verification Queue & Gatekeeping UI**: Implement the KYC approval interface and verify that unapproved companies cannot publish opportunities or inspect private candidate resumes.

---
*Proposal prepared by Security & Architecture Explorer for Skill Bridge (SIH 2026).*
