/**
 * Skill Bridge Platform
 * Better Auth + Google OAuth + Drizzle + Neon
 *
 * File:
 *   lib/auth.js
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/db";

// Import Better Auth's four core tables directly.
// This avoids depending on a `schema` export from @/db.
import {
  user,
  session,
  account,
  verification,
} from "@/db/schema/user.js";

import {
  resolveValidIntent,
  markIntentUsed,
} from "@/lib/signup-intent";

/* -------------------------------------------------------------------------- */
/*                              ENVIRONMENT                                   */
/* -------------------------------------------------------------------------- */

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const betterAuthURL =
  process.env.BETTER_AUTH_URL || "http://localhost:3000";

/*
 * Never silently use a fake production secret.
 */
if (!betterAuthSecret) {
  throw new Error(
    "BETTER_AUTH_SECRET is missing. Add BETTER_AUTH_SECRET to .env.local and restart Next.js."
  );
}

/*
 * Google OAuth credentials are required for Google login.
 */
if (!googleClientId || !googleClientSecret) {
  console.warn(
    "[Better Auth] Google OAuth credentials are missing. Google login will not work until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured."
  );
}

/* -------------------------------------------------------------------------- */
/*                              DATABASE                                      */
/* -------------------------------------------------------------------------- */

/*
 * db/index.js is responsible for creating the Neon + Drizzle connection.
 *
 * We intentionally do not create a fallback/in-memory authentication
 * database here. Authentication must use the real Neon database.
 */
const database = drizzleAdapter(db, {
  provider: "pg",

  /*
   * Better Auth expects these logical model names:
   *
   * user
   * session
   * account
   * verification
   *
   * Your actual Drizzle table objects come from db/schema/user.js.
   */
  schema: {
    user,
    session,
    account,
    verification,
  },
});

/* -------------------------------------------------------------------------- */
/*                           GOOGLE PROVIDER                                  */
/* -------------------------------------------------------------------------- */

const socialProviders =
  googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        },
      }
    : {};

/* -------------------------------------------------------------------------- */
/*                            BETTER AUTH                                     */
/* -------------------------------------------------------------------------- */

export const auth = betterAuth({
  /*
   * Neon/PostgreSQL database through Drizzle.
   */
  database,

  /*
   * Better Auth secret.
   */
  secret: betterAuthSecret,

  /*
   * Application URL.
   */
  baseURL: betterAuthURL,

  /*
   * Store OAuth state in the database.
   */
  account: {
    storeStateStrategy: "database",
  },

  /*
   * Google OAuth.
   */
  socialProviders,

  /* ---------------------------------------------------------------------- */
  /*                           USER FIELDS                                  */
  /* ---------------------------------------------------------------------- */

  user: {
    additionalFields: {
      /*
       * User role is assigned by the server from the validated
       * signup-intent token.
       */
      role: {
        type: "string",
        required: true,
        defaultValue: "STUDENT",
        input: false,
      },

      /*
       * Account verification/approval state.
       */
      accountStatus: {
        type: "string",
        required: true,
        defaultValue: "PENDING",
        input: false,
      },

      /*
       * Onboarding progress.
       */
      onboardingStatus: {
        type: "string",
        required: true,
        defaultValue: "NOT_STARTED",
        input: false,
      },

      /*
       * Whether the user's profile is completely configured.
       */
      profileCompleted: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
    },
  },

  /* ---------------------------------------------------------------------- */
  /*                            SESSION                                     */
  /* ---------------------------------------------------------------------- */

  session: {
    /*
     * Session lifetime = 7 days.
     */
    expiresIn: 60 * 60 * 24 * 7,

    /*
     * Refresh/update session information once per day.
     */
    updateAge: 60 * 60 * 24,

    /*
     * Cache session information for 5 minutes.
     */
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  /* ---------------------------------------------------------------------- */
  /*                         DATABASE HOOKS                                 */
  /* ---------------------------------------------------------------------- */

  databaseHooks: {
    user: {
      create: {
        /*
         * Runs BEFORE Better Auth creates the user.
         *
         * This is where the selected role is securely attached
         * to the new Google account.
         */
        before: async (newUser, context) => {
          const userEmail = String(newUser.email || "")
            .toLowerCase()
            .trim();

          /* -------------------------------------------------------------- */
          /*                         ADMIN                                   */
          /* -------------------------------------------------------------- */

          const initialAdminEmail = String(
            process.env.INITIAL_ADMIN_EMAIL || ""
          )
            .toLowerCase()
            .trim();

          if (
            initialAdminEmail &&
            userEmail === initialAdminEmail
          ) {
            return {
              data: {
                ...newUser,

                role: "ADMIN",

                accountStatus: "ACTIVE",

                onboardingStatus: "COMPLETED",

                profileCompleted: true,
              },
            };
          }

          /* -------------------------------------------------------------- */
          /*                    SIGNUP INTENT                               */
          /* -------------------------------------------------------------- */

          let intentToken = null;

          /*
           * Try the request first.
           */
          const request = context?.request;

          if (request) {
            try {
              const requestURL = new URL(
                request.url || "http://localhost:3000"
              );

              /*
               * Support intent/state query parameters.
               */
              intentToken =
                requestURL.searchParams.get("intent") ||
                requestURL.searchParams.get("state") ||
                null;

              /*
               * If there is no query parameter, check cookies.
               */
              if (!intentToken && request.headers) {
                let cookieHeader = null;

                if (
                  typeof request.headers.get === "function"
                ) {
                  cookieHeader =
                    request.headers.get("cookie");
                } else {
                  cookieHeader = request.headers.cookie;
                }

                if (cookieHeader) {
                  const match = cookieHeader.match(
                    /(?:^|;\s*)sb_signup_intent=([^;]+)/
                  );

                  if (match) {
                    intentToken = decodeURIComponent(
                      match[1]
                    );
                  }
                }
              }
            } catch (error) {
              console.warn(
                "[Better Auth] Could not read signup intent from request:",
                error?.message
              );
            }
          }

          /*
           * Some Better Auth contexts expose headers directly.
           */
          if (!intentToken && context?.headers) {
            try {
              let cookieHeader = null;

              if (
                typeof context.headers.get === "function"
              ) {
                cookieHeader =
                  context.headers.get("cookie");
              } else {
                cookieHeader = context.headers.cookie;
              }

              if (cookieHeader) {
                const match = cookieHeader.match(
                  /(?:^|;\s*)sb_signup_intent=([^;]+)/
                );

                if (match) {
                  intentToken = decodeURIComponent(
                    match[1]
                  );
                }
              }
            } catch (error) {
              console.warn(
                "[Better Auth] Could not read signup intent cookie:",
                error?.message
              );
            }
          }

          /* -------------------------------------------------------------- */
          /*                         ROLE                                    */
          /* -------------------------------------------------------------- */

          /*
           * Default role.
           */
          let assignedRole = "STUDENT";

          /*
           * Only these roles are allowed.
           */
          const allowedRoles = [
            "STUDENT",
            "INDUSTRY",
            "INSTITUTE",
            "ORGANIZATION",
          ];

          /*
           * Resolve the server-created signup intent.
           */
          if (intentToken) {
            try {
              const validIntent =
                await resolveValidIntent(intentToken);

              if (
                validIntent &&
                validIntent.isValid &&
                allowedRoles.includes(validIntent.role)
              ) {
                assignedRole = validIntent.role;

                /*
                 * Mark the intent as consumed so the same
                 * role-selection token cannot be reused.
                 */
                try {
                  await markIntentUsed(intentToken);
                } catch (error) {
                  console.warn(
                    "[Better Auth] Could not mark signup intent as used:",
                    error?.message
                  );
                }
              }
            } catch (error) {
              console.warn(
                "[Better Auth] Could not resolve signup intent:",
                error?.message
              );
            }
          }

          /* -------------------------------------------------------------- */
          /*                       ACCOUNT STATUS                            */
          /* -------------------------------------------------------------- */

          /*
           * Students can enter directly.
           *
           * Industry/Institute/Organization accounts remain
           * pending until your verification/onboarding process
           * approves them.
           */
          const assignedStatus =
            assignedRole === "INDUSTRY" ||
            assignedRole === "INSTITUTE" ||
            assignedRole === "ORGANIZATION"
              ? "PENDING"
              : "ACTIVE";

          /* -------------------------------------------------------------- */
          /*                         RETURN                                  */
          /* -------------------------------------------------------------- */

          return {
            data: {
              ...newUser,

              role: assignedRole,

              accountStatus: assignedStatus,

              onboardingStatus: "NOT_STARTED",

              profileCompleted: false,
            },
          };
        },
      },

      /*
       * Prevent users from changing protected fields through
       * normal update requests.
       */
      update: {
        before: async (userData) => {
          const sanitized = {
            ...userData,
          };

          /*
           * These fields are controlled by the server.
           */
          delete sanitized.id;
          delete sanitized.role;
          delete sanitized.accountStatus;
          delete sanitized.onboardingStatus;
          delete sanitized.profileCompleted;

          return {
            data: sanitized,
          };
        },
      },
    },
  },
});