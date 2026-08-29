/**
 * Skill Bridge Platform - Better Auth React Client SDK
 * File: lib/auth-client.js
 */

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    (typeof window !== 'undefined' ? window.location.origin : undefined),
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

/**
 * Centralized Full Logout Utility
 * 1. Invokes Better Auth session revocation via authClient.signOut()
 * 2. Clears server-side signup intent cookie
 * 3. Deletes all companion and session cookies (sb_signup_intent, sb_user_role, sb_user_status, sb_profile_completed, sb_session_token, better-auth.session_token, __Secure-better-auth.session_token)
 * 4. Clears client-side caches (localStorage, sessionStorage)
 */
export async function fullLogout() {
  try {
    if (typeof authClient?.signOut === 'function') {
      await authClient.signOut();
    }
  } catch (err) {
    console.warn('[Skill Bridge] Error during authClient.signOut:', err);
  }

  // Clear server-side signup intent cookie if endpoint exists
  try {
    if (typeof fetch === 'function') {
      await fetch('/api/auth/signup-intent', { method: 'DELETE' }).catch(() => {});
    }
  } catch {}

  // Expire all companion and session cookies
  if (typeof document !== 'undefined') {
    const cookiesToClear = [
      'sb_signup_intent',
      'sb_user_role',
      'sb_user_status',
      'sb_profile_completed',
      'sb_session_token',
      'better-auth.session_token',
      '__Secure-better-auth.session_token',
      'sb_user_cache',
    ];

    cookiesToClear.forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
    });
  }

  // Clear client-side caches
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('sb_user_cache');
      localStorage.removeItem('sb_role');
      localStorage.removeItem('sb_profile');
      sessionStorage.clear();
    } catch {}
  }
}

export default authClient;
