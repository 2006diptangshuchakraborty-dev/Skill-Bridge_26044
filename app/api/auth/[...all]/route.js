/**
 * Skill Bridge Platform - Better Auth Catch-All Route Handler
 * File: app/api/auth/[...all]/route.js
 */

import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const runtime = 'nodejs';

export const { GET, POST } = toNextJsHandler(auth);
