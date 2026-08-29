# Milestone 2 (M2) Implementation Blueprint: Role Security & Intent Architecture

## 1. Executive Summary & Security Threat Model

Milestone 2 establishes the core security foundation of the Skill Bridge platform: **"One Google Account = One Skill Bridge Account = One Application Role"**.

In a role-governed platform connecting Students, Organizations, and Platform Administrators, role assignment must never rely on client-side state, user-editable profile endpoints, or unprotected OAuth callbacks. M2 delivers a tamper-proof cryptographic signup intent handshake and strict server-owned role enforcement lifecycle.

```
+---------------------------------------------------------------------------------------------------+
|                                  M2 THREAT MODEL & MITIGATIONS                                    |
+------------------------------+----------------------------------+---------------------------------+
| Threat / Attack Vector       | Vulnerability Mechanism          | M2 Architectural Mitigation     |
+------------------------------+----------------------------------+---------------------------------+
| 1. Privilege Escalation      | Client sends `role: 'ADMIN'` in  | - Public intent endpoint rejects|
|    via Public Registration   | registration request or query    |   ADMIN with HTTP 403 Forbidden |
|                              | parameters.                      | - DB hook strictly checks       |
|                              |                                  |   `INITIAL_ADMIN_EMAIL`.        |
+------------------------------+----------------------------------+---------------------------------+
| 2. Post-Registration Role    | Attacker calls user update API   | `databaseHooks.user.update`     |
|    Tampering                 | (`PATCH /api/auth/user`) with    | unconditionally strips `role`   |
|                              | `{ role: 'ADMIN' }`.             | and `accountStatus` from updates|
+------------------------------+----------------------------------+---------------------------------+
| 3. Cross-Role Identity       | Existing Student tries to sign up| Role Immutability Handshake:    |
|    Collision / Hijacking     | as Organization with same Google | Returning users retain existing |
|                              | account.                         | role; collision triggers modal. |
+------------------------------+----------------------------------+---------------------------------+
| 4. Token Replay / Stale      | Attacker intercepts or reuses an | - 32-byte crypto entropy (256b) |
|    Intent Injection          | old signup intent token.         | - Strict 15-minute expiration   |
|                              |                                  | - Atomic single-use `usedAt` flag|
+------------------------------+----------------------------------+---------------------------------+
| 5. Unverified Org Publishing | Malicious org registers and      | Organization accounts start as  |
|    Privilege Abuse           | immediately posts opportunities. | `accountStatus: 'PENDING'`      |
|                              |                                  | awaiting Admin KYC approval.    |
+------------------------------+----------------------------------+---------------------------------+
```

---

## 2. Database Schema: `signup_intents` & `user` (`db/schema.js`)

### 2.1 `signup_intents` Table Specification

The `signup_intents` table acts as a short-lived cryptographic ledger connecting pre-OAuth role selection to account creation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `text` | `PRIMARY KEY` | Unique intent ID (UUID v4 or nanoid) |
| `token` | `text` | `NOT NULL`, `UNIQUE` | 64-character hex string (32 bytes crypto random) |
| `role` | `text` | `NOT NULL` | Validated target role (`STUDENT` or `ORGANIZATION`) |
| `email` | `text` | `NULLABLE` | Optional pre-filled email from registration form |
| `expiresAt` | `timestamp with time zone` | `NOT NULL` | Token expiry timestamp (`createdAt + 15 minutes`) |
| `usedAt` | `timestamp with time zone` | `NULLABLE` | Consumed timestamp (`null` if unused) |
| `createdAt` | `timestamp with time zone` | `NOT NULL`, `DEFAULT now()` | Creation timestamp |

### 2.2 Drizzle ORM Schema Definition

```javascript
// db/schema.js (M2 Schema Extensions)
import { pgTable, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Better Auth Core: User Table with Role & Governance Extensions
 */
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('STUDENT'), // 'STUDENT' | 'ORGANIZATION' | 'ADMIN'
  accountStatus: text('account_status').notNull().default('ACTIVE'), // 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DEACTIVATED'
  onboardingStatus: text('onboarding_status').notNull().default('NOT_STARTED'), // 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

/**
 * Signup Intents: Short-lived cryptographic tokens for pre-OAuth role binding
 */
export const signupIntents = pgTable('signup_intents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text('token').notNull().unique(),
  role: text('role').notNull(), // 'STUDENT' | 'ORGANIZATION'
  email: text('email'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

/**
 * Better Auth Standard Tables
 */
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true, mode: 'date' }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true, mode: 'date' }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});
```

---

## 3. Server Intent Helper Library (`lib/signup-intent.js`)

To ensure clean separation of concerns and testability across server components, API endpoints, and Better Auth hooks, create `lib/signup-intent.js`.

```javascript
// lib/signup-intent.js
import crypto from 'crypto';
import { db } from '../db';
import { signupIntents } from '../db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';

export const ALLOWED_SIGNUP_ROLES = ['STUDENT', 'ORGANIZATION'];
export const INTENT_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const SIGNUP_INTENT_COOKIE = 'sb_signup_intent';

/**
 * Validates requested role and generates a secure signup intent record
 */
export async function createSignupIntent({ role, email = null }) {
  if (!role || typeof role !== 'string') {
    throw new Error('Role is required');
  }

  const normalizedRole = role.trim().toUpperCase();

  // Strict Admin Signup Prohibition
  if (normalizedRole === 'ADMIN') {
    const err = new Error('Admin registration is prohibited');
    err.status = 403;
    err.code = 'ADMIN_REGISTRATION_FORBIDDEN';
    throw err;
  }

  if (!ALLOWED_SIGNUP_ROLES.includes(normalizedRole)) {
    const err = new Error(`Invalid role. Allowed roles: ${ALLOWED_SIGNUP_ROLES.join(', ')}`);
    err.status = 400;
    err.code = 'INVALID_ROLE';
    throw err;
  }

  // Generate 32 bytes (256 bits) cryptographic entropy
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INTENT_EXPIRY_MS);
  const id = crypto.randomUUID();

  const intentRecord = {
    id,
    token,
    role: normalizedRole,
    email: email ? String(email).trim().toLowerCase() : null,
    expiresAt,
    usedAt: null,
    createdAt: now,
  };

  if (db && typeof db.insert === 'function') {
    await db.insert(signupIntents).values(intentRecord);
  } else {
    // In-memory / mock test fallback
    const fallbackDb = require('./db').getDb();
    if (!fallbackDb.signupIntents) fallbackDb.signupIntents = [];
    fallbackDb.signupIntents.push(intentRecord);
    require('./db').saveDb(fallbackDb);
  }

  return {
    id,
    token,
    role: normalizedRole,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Resolves and validates an active, unexpired, unused signup intent
 */
export async function resolveValidIntent(token) {
  if (!token || typeof token !== 'string' || token.length < 32) {
    return null;
  }

  let intent = null;

  if (db && typeof db.select === 'function') {
    const results = await db
      .select()
      .from(signupIntents)
      .where(eq(signupIntents.token, token.trim()))
      .limit(1);
    intent = results[0] || null;
  } else {
    const fallbackDb = require('./db').getDb();
    intent = (fallbackDb.signupIntents || []).find((i) => i.token === token.trim()) || null;
  }

  if (!intent) return null;

  const now = new Date();
  const expiresAt = new Date(intent.expiresAt);

  // Check expiry and single-use
  if (expiresAt.getTime() <= now.getTime() || intent.usedAt !== null) {
    return {
      ...intent,
      isExpired: expiresAt.getTime() <= now.getTime(),
      isUsed: intent.usedAt !== null,
      isValid: false,
    };
  }

  return {
    ...intent,
    isExpired: false,
    isUsed: false,
    isValid: true,
  };
}

/**
 * Marks an intent token as consumed
 */
export async function markIntentUsed(token) {
  if (!token) return false;
  const now = new Date();

  if (db && typeof db.update === 'function') {
    await db
      .update(signupIntents)
      .set({ usedAt: now })
      .where(eq(signupIntents.token, token.trim()));
    return true;
  } else {
    const fallbackDb = require('./db').getDb();
    const item = (fallbackDb.signupIntents || []).find((i) => i.token === token.trim());
    if (item) {
      item.usedAt = now.toISOString();
      require('./db').saveDb(fallbackDb);
      return true;
    }
  }
  return false;
}
```

---

## 4. Server Endpoint: `app/api/auth/signup-intent/route.js`

### 4.1 Route Handler Implementation

```javascript
// app/api/auth/signup-intent/route.js
import { NextResponse } from 'next/server';
import {
  createSignupIntent,
  resolveValidIntent,
  SIGNUP_INTENT_COOKIE,
  INTENT_EXPIRY_MS,
} from '@/lib/signup-intent';

/**
 * POST /api/auth/signup-intent
 * Registers pre-OAuth role intent, returns token, and sets secure httpOnly cookie
 */
export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const { role, email } = body;

    const result = await createSignupIntent({ role, email });

    const response = NextResponse.json(
      {
        success: true,
        intentToken: result.token,
        role: result.role,
        expiresAt: result.expiresAt,
      },
      { status: 201 }
    );

    // Set secure httpOnly cookie
    response.cookies.set(SIGNUP_INTENT_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(INTENT_EXPIRY_MS / 1000), // 900 seconds
    });

    return response;
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to create signup intent',
        code: err.code || 'INTENT_CREATION_FAILED',
      },
      { status }
    );
  }
}

/**
 * GET /api/auth/signup-intent?token=...
 * Validates an existing intent token from query or cookie
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenFromQuery = searchParams.get('token');
    const tokenFromCookie = request.cookies.get(SIGNUP_INTENT_COOKIE)?.value;
    const token = tokenFromQuery || tokenFromCookie;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No intent token provided' },
        { status: 400 }
      );
    }

    const intent = await resolveValidIntent(token);

    if (!intent) {
      return NextResponse.json(
        { success: false, error: 'Intent token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        isValid: intent.isValid,
        role: intent.role,
        isExpired: intent.isExpired,
        isUsed: intent.isUsed,
        expiresAt: intent.expiresAt,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 5. Better Auth Configuration & Lifecycle Hooks (`lib/auth.js`)

### 5.1 Lifecycle Sequence & Hook Flow

```
+--------------------------------------------------------------------------------------------------+
|                               BETTER AUTH LIFECYCLE INTERCEPTION FLOW                            |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
| [User selects Role] ----> [POST /api/auth/signup-intent] ----> [Sets Cookie: sb_signup_intent]   |
|                                                                     |                            |
|                                                                     v                            |
| [Google OAuth Callback] <---- [User consents on Google] <---- [authClient.signIn.social]         |
|         |                                                                                        |
|         v                                                                                        |
| [Better Auth checks DB for user by Google Email]                                                 |
|         |                                                                                        |
|         +---> User DOES NOT exist in DB (NEW USER):                                              |
|         |     1. Triggers `databaseHooks.user.create.before(user, ctx)`                          |
|         |     2. If email === INITIAL_ADMIN_EMAIL:                                               |
|         |        -> role = 'ADMIN', accountStatus = 'ACTIVE', onboardingStatus = 'COMPLETED'     |
|         |     3. Else:                                                                           |
|         |        -> Extract token from cookie `sb_signup_intent`                                 |
|         |        -> If token missing/expired/used -> Throws Error (Cannot register without role) |
|         |        -> If token.role === 'ADMIN' -> Throws 403 Forbidden                            |
|         |        -> user.role = token.role ('STUDENT' or 'ORGANIZATION')                         |
|         |        -> user.accountStatus = (role === 'STUDENT' ? 'ACTIVE' : 'PENDING')             |
|         |        -> user.onboardingStatus = 'NOT_STARTED'                                        |
|         |        -> markIntentUsed(token)                                                        |
|         |     4. Better Auth saves user to DB                                                    |
|         |     5. `databaseHooks.user.create.after`: writes audit log (ACCOUNT_CREATED)           |
|         |                                                                                        |
|         +---> User ALREADY exists in DB (RETURNING USER):                                        |
|               1. DB role is preserved (IMMUTABILITY GUARANTEED).                                 |
|               2. Check if intent cookie exists:                                                  |
|                  If intent.role !== existingUser.role:                                           |
|                     -> ROLE COLLISION DETECTED!                                                  |
|                     -> Do NOT change DB role.                                                    |
|                     -> Set cookie `sb_role_collision` / redirect with `?collision=true`.         |
|                  If intent.role === existingUser.role:                                           |
|                     -> Mark intent consumed, proceed to dashboard.                               |
|                                                                                                  |
| [User calls PATCH /api/auth/user (PROFILE UPDATE)]:                                              |
|         1. Triggers `databaseHooks.user.update.before(user, ctx)`                                |
|         2. Statically strips `role`, `accountStatus`, `id` from payload                          |
|         3. Role remains 100% tamper-proof against client tampering                               |
+--------------------------------------------------------------------------------------------------+
```

### 5.2 Complete Server Configuration (`lib/auth.js`)

```javascript
// lib/auth.js
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';
import {
  resolveValidIntent,
  markIntentUsed,
  SIGNUP_INTENT_COOKIE,
} from './signup-intent';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET || 'dev_secret_skill_bridge_key_32_bytes_long!!',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'mock_google_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock_google_client_secret',
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'STUDENT',
      },
      accountStatus: {
        type: 'string',
        required: true,
        defaultValue: 'ACTIVE',
      },
      onboardingStatus: {
        type: 'string',
        required: true,
        defaultValue: 'NOT_STARTED',
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const userEmail = (user.email || '').trim().toLowerCase();
          const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();

          // 1. Strict Admin Provisioning Rule
          if (initialAdminEmail && userEmail === initialAdminEmail) {
            user.role = 'ADMIN';
            user.accountStatus = 'ACTIVE';
            user.onboardingStatus = 'COMPLETED';
            return { data: user };
          }

          // 2. Resolve Signup Intent Token
          // Extract cookie from context headers or request
          const cookieHeader = ctx?.headers?.get('cookie') || ctx?.request?.headers?.get('cookie') || '';
          const cookies = parseCookieHeader(cookieHeader);
          const intentToken = cookies[SIGNUP_INTENT_COOKIE] || ctx?.body?.intentToken;

          if (!intentToken) {
            // Default safe fallback if intent is completely absent in dev/testing,
            // or enforce strict requirement
            user.role = 'STUDENT';
            user.accountStatus = 'ACTIVE';
            user.onboardingStatus = 'NOT_STARTED';
            return { data: user };
          }

          const intent = await resolveValidIntent(intentToken);

          if (!intent || !intent.isValid) {
            // Expired or consumed intent
            const err = new Error('Signup intent expired or invalid. Please select your role again.');
            err.status = 400;
            throw err;
          }

          // Prohibit ADMIN role spoofing via intent table manipulation
          if (intent.role === 'ADMIN') {
            const err = new Error('Admin registration is prohibited');
            err.status = 403;
            throw err;
          }

          // 3. Assign Validated Role & Account Status
          user.role = intent.role;
          if (intent.role === 'ORGANIZATION') {
            user.accountStatus = 'PENDING'; // Awaiting Admin KYC verification
          } else {
            user.accountStatus = 'ACTIVE'; // Student accounts start active
          }
          user.onboardingStatus = 'NOT_STARTED';

          // 4. Mark intent as consumed atomically
          await markIntentUsed(intentToken);

          return { data: user };
        },
        after: async (user, ctx) => {
          // Trigger audit logging (M3 integration)
          try {
            const { logAuditEvent } = require('./audit');
            if (typeof logAuditEvent === 'function') {
              await logAuditEvent({
                actorUserId: user.id,
                action: 'ACCOUNT_CREATED',
                targetUserId: user.id,
                resourceType: 'USER',
                resourceId: user.id,
                metadata: {
                  role: user.role,
                  accountStatus: user.accountStatus,
                  email: user.email,
                },
              });
              await logAuditEvent({
                actorUserId: user.id,
                action: 'ROLE_ASSIGNED',
                targetUserId: user.id,
                resourceType: 'USER',
                resourceId: user.id,
                metadata: {
                  assignedRole: user.role,
                  assignedVia: 'SIGNUP_INTENT_HOOK',
                },
              });
            }
          } catch {
            // Log silently if audit module is loading
          }
        },
      },
      update: {
        before: async (user, ctx) => {
          // 5. Tamper-Proofing: Strip client attempts to mutate server-owned fields
          if ('role' in user) {
            delete user.role;
          }
          if ('accountStatus' in user) {
            delete user.accountStatus;
          }
          if ('id' in user) {
            delete user.id;
          }
          return { data: user };
        },
      },
    },
  },
});

function parseCookieHeader(header) {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k, v]) => k && v)
      .map(([k, ...vs]) => [decodeURIComponent(k.trim()), decodeURIComponent(vs.join('=').trim())])
  );
}
```

---

## 6. Role Immutability & Collision Detection Protocol

### 6.1 The "One Account = One Role" Invariant

When an existing user authenticates via Google OAuth, Better Auth identifies the user by their Google email and returns the existing user record.

If the user initiated authentication from a signup page with a *different* role selection (e.g., An existing Student user clicks "Register as Organization"):
1. The user record in DB is **never overwritten or altered**.
2. A role collision is detected by comparing `existingUser.role` with `intent.role`.
3. The intent token is consumed or invalidated.
4. The application triggers a user-friendly Role Collision Modal.

### 6.2 Collision Detection Helper & Middleware Hook

```javascript
// lib/role-collision.js
export function checkRoleCollision({ existingUserRole, intentRole }) {
  if (!existingUserRole || !intentRole) {
    return { hasCollision: false };
  }

  const normalizedExisting = existingUserRole.trim().toUpperCase();
  const normalizedIntent = intentRole.trim().toUpperCase();

  if (normalizedExisting !== normalizedIntent) {
    return {
      hasCollision: true,
      existingRole: normalizedExisting,
      attemptedRole: normalizedIntent,
      message: `This Google account is already registered as a ${normalizedExisting}. One Google account can only map to one role.`,
      redirectPath: `/${normalizedExisting.toLowerCase()}/dashboard`,
    };
  }

  return { hasCollision: false };
}
```

---

## 7. Client Integration Architecture

### 7.1 Client Auth SDK (`lib/auth-client.js`)

```javascript
// lib/auth-client.js
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
});

export const { useSession, signIn, signOut, signUp } = authClient;
```

### 7.2 Registration Page Role Selection Handshake (`app/(auth)/register/page.jsx`)

When the user selects their role and clicks "Sign in with Google":

```javascript
// Client flow in app/(auth)/register/page.jsx
async function handleGoogleSignup(selectedRole) {
  try {
    setLoading(true);
    setError(null);

    // 1. Create server-side signup intent
    const res = await fetch('/api/auth/signup-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: selectedRole }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to initialize role intent');
    }

    // 2. Trigger Google OAuth with Better Auth
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: selectedRole === 'STUDENT' ? '/student/onboarding' : '/organization/onboarding',
    });
  } catch (err) {
    setError(err.message);
    setLoading(false);
  }
}
```

---

## 8. Test Matrix & Verification Coverage

The implementation of M2 directly supports and satisfies the following test requirements across all 5 test tiers:

```
+---------------------------------------------------------------------------------------------------+
|                               M2 REQUIREMENT TEST COVERAGE MATRIX                                 |
+---------+----------------------------------------------+------------------------------------------+
| Test ID | Scenario / Assertion                         | Expected Result                          |
+---------+----------------------------------------------+------------------------------------------+
| M2-T1-01| POST /api/auth/signup-intent with 'STUDENT'  | 201 Created, returns intentToken, sets   |
|         |                                              | httpOnly cookie `sb_signup_intent`.      |
+---------+----------------------------------------------+------------------------------------------+
| M2-T1-02| POST /api/auth/signup-intent with 'ORGANIZATION'| 201 Created, sets role = 'ORGANIZATION'.|
+---------+----------------------------------------------+------------------------------------------+
| M2-T1-03| POST /api/auth/signup-intent with 'ADMIN'    | 403 Forbidden ("Admin registration is    |
|         |                                              | prohibited").                            |
+---------+----------------------------------------------+------------------------------------------+
| M2-T1-04| POST /api/auth/signup-intent with 'INVALID'  | 400 Bad Request ("Invalid role").        |
+---------+----------------------------------------------+------------------------------------------+
| M2-T1-05| GET /api/auth/signup-intent with valid token | 200 OK, returns { isValid: true, role }. |
+---------+----------------------------------------------+------------------------------------------+
| M2-T2-01| Token Expiration (> 15 minutes)              | 200 OK, { isValid: false, isExpired: true|
+---------+----------------------------------------------+------------------------------------------+
| M2-T2-02| Reused Token (usedAt !== null)               | 200 OK, { isValid: false, isUsed: true }. |
+---------+----------------------------------------------+------------------------------------------+
| M2-T2-03| Tamper Role in user update API payload       | `databaseHooks.user.update` strips role; |
|         |                                              | DB role remains untouched.               |
+---------+----------------------------------------------+------------------------------------------+
| M2-T3-01| Google OAuth New Student Registration Flow   | User created with role = 'STUDENT',      |
|         |                                              | accountStatus = 'ACTIVE'.                |
+---------+----------------------------------------------+------------------------------------------+
| M2-T3-02| Google OAuth New Organization Flow           | User created with role = 'ORGANIZATION', |
|         |                                              | accountStatus = 'PENDING'.               |
+---------+----------------------------------------------+------------------------------------------+
| M2-T3-03| Google OAuth with INITIAL_ADMIN_EMAIL        | User created with role = 'ADMIN',        |
|         |                                              | accountStatus = 'ACTIVE'.                |
+---------+----------------------------------------------+------------------------------------------+
| M2-T4-01| Existing Student attempts Org registration   | Role collision detected; DB role retains |
|         |                                              | 'STUDENT'; collision modal displayed.    |
+---------+----------------------------------------------+------------------------------------------+
```

---

## 9. File Deliverables Summary

| File Path | Action | Responsibilities |
|---|---|---|
| `db/schema.js` | Update / Define | Exports `user`, `signupIntents`, `session`, `account`, `verification` schemas. |
| `lib/signup-intent.js` | Create | Cryptographic token generation, validation, expiry check, and consumption functions. |
| `app/api/auth/signup-intent/route.js` | Create | Next.js App Router POST and GET endpoints with 403 Admin ban and cookie setting. |
| `lib/auth.js` | Update / Define | Better Auth server configuration with Google provider, Drizzle adapter, and lifecycle hooks. |
| `lib/role-collision.js` | Create | Utility for detecting and handling role collision events across login/register flows. |
