/**
 * Skill Bridge Platform - Pre-OAuth Signup Intent Handshake Engine
 * File: lib/signup-intent.js
 */

const crypto = require('crypto');
const localDb = require('./db');

const ALLOWED_SIGNUP_ROLES = ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION'];
const INTENT_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes (900 seconds)
const SIGNUP_INTENT_COOKIE = 'sb_signup_intent';

/**
 * Validates requested role and generates a secure cryptographic signup intent record
 */
async function createSignupIntent({ role, email = null }) {
  if (!role || typeof role !== 'string') {
    const err = new Error('Role is required');
    err.status = 400;
    err.statusCode = 400;
    err.code = 'ROLE_REQUIRED';
    throw err;
  }

  const normalizedRole = role.trim().toUpperCase();

  // Strict Admin Signup Prohibition
  if (normalizedRole === 'ADMIN') {
    const err = new Error('Admin registration is prohibited');
    err.status = 403;
    err.statusCode = 403;
    err.code = 'ADMIN_REGISTRATION_FORBIDDEN';
    throw err;
  }

  if (!ALLOWED_SIGNUP_ROLES.includes(normalizedRole)) {
    const err = new Error(`Invalid role. Allowed roles: ${ALLOWED_SIGNUP_ROLES.join(', ')}`);
    err.status = 400;
    err.statusCode = 400;
    err.code = 'INVALID_ROLE';
    throw err;
  }

  // Generate 32 bytes (256 bits) cryptographic entropy
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INTENT_EXPIRY_MS);
  const id = `int_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

  const intentRecord = {
    id,
    token,
    role: normalizedRole,
    email: email ? String(email).trim().toLowerCase() : null,
    expiresAt: expiresAt.toISOString(),
    used: false,
    usedAt: null,
    createdAt: now.toISOString(),
  };

  // Attempt Drizzle ORM Neon DB persistence if available
  let dbPersisted = false;
  try {
    const { db, schema, isMockDb } = require('../db/index');
    if (db && !isMockDb && typeof db.insert === 'function' && schema && schema.signupIntents) {
      await db.insert(schema.signupIntents).values({
        id,
        token,
        role: normalizedRole,
        email: email ? String(email).trim().toLowerCase() : null,
        expiresAt,
        used: false,
        usedAt: null,
        createdAt: now,
      });
      dbPersisted = true;
    }
  } catch (err) {
    // Fall back to local DB
  }

  // Persist in local DB for offline/mock availability
  try {
    const dbInstance = localDb.getDb();
    dbInstance.signupIntents = dbInstance.signupIntents || [];
    dbInstance.signupIntents.push(intentRecord);
    localDb.saveDb(dbInstance);
  } catch (err) {
    console.warn('[Signup Intent Persistence Warning]:', err.message);
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
async function resolveValidIntent(token) {
  if (!token || typeof token !== 'string' || token.trim().length < 16) {
    return null;
  }

  const cleanToken = token.trim();
  let intent = null;

  // Check Drizzle DB first if live
  try {
    const { db, schema, isMockDb } = require('../db/index');
    const { eq } = require('drizzle-orm');
    if (db && !isMockDb && typeof db.select === 'function' && schema && schema.signupIntents) {
      const results = await db
        .select()
        .from(schema.signupIntents)
        .where(eq(schema.signupIntents.token, cleanToken))
        .limit(1);
      if (results && results[0]) {
        intent = results[0];
      }
    }
  } catch (err) {
    // Fall back to local DB
  }

  // Check local JSON DB
  if (!intent) {
    const dbInstance = localDb.getDb();
    intent = (dbInstance.signupIntents || []).find((i) => i.token === cleanToken) || null;
  }

  if (!intent) return null;

  const now = new Date();
  const expiresAt = new Date(intent.expiresAt);
  const isExpired = expiresAt.getTime() <= now.getTime();
  const isUsed = Boolean(intent.used === true || (intent.usedAt !== null && intent.usedAt !== undefined));
  const isValid = !isExpired && !isUsed;

  return {
    id: intent.id,
    token: intent.token,
    role: intent.role,
    email: intent.email || null,
    expiresAt: expiresAt.toISOString(),
    usedAt: intent.usedAt ? new Date(intent.usedAt).toISOString() : null,
    isExpired,
    isUsed,
    isValid,
  };
}

/**
 * Marks an intent token as consumed
 */
async function markIntentUsed(token) {
  if (!token) return false;
  const cleanToken = String(token).trim();
  const now = new Date();

  // Update in live Drizzle DB if present
  let dbUpdated = false;
  try {
    const { db, schema, isMockDb } = require('../db/index');
    const { eq } = require('drizzle-orm');
    if (db && !isMockDb && typeof db.update === 'function' && schema && schema.signupIntents) {
      await db
        .update(schema.signupIntents)
        .set({ usedAt: now, used: true })
        .where(eq(schema.signupIntents.token, cleanToken));
      dbUpdated = true;
    }
  } catch (err) {
    // Fall back to local DB
  }

  // Update in local JSON DB
  let localUpdated = false;
  try {
    const dbInstance = localDb.getDb();
    const item = (dbInstance.signupIntents || []).find((i) => i.token === cleanToken);
    if (item) {
      item.used = true;
      item.usedAt = now.toISOString();
      localDb.saveDb(dbInstance);
      localUpdated = true;
    }
  } catch (err) {
    // ignore
  }

  return dbUpdated || localUpdated;
}

module.exports = {
  ALLOWED_SIGNUP_ROLES,
  INTENT_EXPIRY_MS,
  SIGNUP_INTENT_COOKIE,
  createSignupIntent,
  resolveValidIntent,
  markIntentUsed,
};
