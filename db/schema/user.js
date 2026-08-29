import { pgTable, text, timestamp, boolean, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";

// Better Auth & Platform Enums
export const userRoleEnum = pgEnum("user_role", [
  "STUDENT",
  "INDUSTRY",
  "INSTITUTE",
  "ORGANIZATION",
  "ADMIN",
]);

export const accountStatusEnum = pgEnum("account_status", [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
]);

export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
]);

export const orgVerificationStatusEnum = pgEnum("org_verification_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "INFO_REQUESTED",
]);

// 1. User Table (Better Auth Core + Custom Extension Fields)
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").default(false),
    image: text("image"),
    role: userRoleEnum("role").default("STUDENT"),
    accountStatus: accountStatusEnum("account_status").default("ACTIVE").notNull(),
    onboardingStatus: onboardingStatusEnum("onboarding_status").default("NOT_STARTED").notNull(),
    profileCompleted: boolean("profile_completed").default(false).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userEmailIdx: uniqueIndex("user_email_idx").on(table.email),
    userRoleIdx: index("user_role_idx").on(table.role),
    userStatusIdx: index("user_status_idx").on(table.accountStatus),
  })
);

// 2. Session Table (Better Auth Core)
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    sessionUserIdIdx: index("session_user_idx").on(table.userId),
    sessionTokenIdx: uniqueIndex("session_token_idx").on(table.token),
    sessionExpiresIdx: index("session_expires_idx").on(table.expiresAt),
  })
);

// 3. Account Table (Better Auth OAuth & Credential Linking)
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    issuer: text("issuer").notNull(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true, mode: "date" }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true, mode: "date" }),
    scope: text("scope"),
    idToken: text("idToken"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    accountUserIdx: index("account_user_idx").on(table.userId),
    accountIssuerAccountIdx: uniqueIndex("account_issuer_account_idx").on(
      table.issuer,
      table.accountId
    ),
    accountProviderIdx: index("account_provider_idx").on(table.providerId),
  })
);

// 4. Verification Table (Better Auth Email/Token Verification)
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    verificationIdentifierIdx: index("verification_identifier_idx").on(table.identifier),
  })
);

// 5. Pre-OAuth Signup Intents Table
export const signupIntents = pgTable(
  "signup_intents",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    role: userRoleEnum("role").notNull(),
    email: text("email"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    used: boolean("used").default(false).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    signupIntentTokenIdx: uniqueIndex("signup_intent_token_idx").on(table.token),
  })
);

