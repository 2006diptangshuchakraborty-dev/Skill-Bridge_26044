/**
 * Skill Bridge Platform - Immutable Security Audit Logging Engine
 * File: lib/audit.js
 */

const crypto = require('crypto');
const localDb = require('./db');

// Allowed sensitive security audit actions
const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  ACCOUNT_CREATED: 'ACCOUNT_CREATED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  ROLE_REJECTED_MISMATCH: 'ROLE_REJECTED_MISMATCH',
  ORGANIZATION_SUBMITTED: 'ORGANIZATION_SUBMITTED',
  ORGANIZATION_APPROVED: 'ORGANIZATION_APPROVED',
  ORGANIZATION_REJECTED: 'ORGANIZATION_REJECTED',
  ORGANIZATION_INFO_REQUESTED: 'ORGANIZATION_INFO_REQUESTED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  OPPORTUNITY_GATED_ATTEMPT: 'OPPORTUNITY_GATED_ATTEMPT',
  CAPABILITY_VIOLATION_BLOCKED: 'CAPABILITY_VIOLATION_BLOCKED',
  ROLE_COLLISION_BLOCKED: 'ROLE_COLLISION_BLOCKED',
};

/**
 * Extracts client IP and User-Agent from standard Next.js / Web Request headers
 */
function extractRequestMeta(req) {
  if (!req) return { ipAddress: '127.0.0.1', userAgent: 'system' };

  let ipAddress = '127.0.0.1';
  let userAgent = 'unknown';

  try {
    if (typeof req.headers?.get === 'function') {
      const forwarded = req.headers.get('x-forwarded-for');
      ipAddress = forwarded ? forwarded.split(',')[0].trim() : (req.headers.get('x-real-ip') || '127.0.0.1');
      userAgent = req.headers.get('user-agent') || 'unknown';
    } else if (req.headers) {
      const forwarded = req.headers['x-forwarded-for'];
      ipAddress = forwarded
        ? (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0])
        : (req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1');
      userAgent = req.headers['user-agent'] || 'unknown';
    }
  } catch (err) {
    // Keep fallback defaults
  }

  return { ipAddress, userAgent };
}

/**
 * Inserts an immutable audit log entry into PostgreSQL (or fallback store).
 *
 * Supports both named object parameter syntax and legacy positional syntax:
 *   logAuditEvent({ actorUserId, action, ... })
 *   logAuditEvent(actor, role, action, target, metadata)
 */
async function logAuditEvent(paramOrActor, maybeRole, maybeAction, maybeTarget, maybeMetadata) {
  let actorUserId = null;
  let actorEmail = null;
  let actorRole = null;
  let action = 'UNKNOWN_ACTION';
  let targetUserId = null;
  let resourceType = null;
  let resourceId = null;
  let metadata = {};
  let req = null;
  let ipAddress = null;
  let userAgent = null;

  if (paramOrActor && typeof paramOrActor === 'object' && !Array.isArray(paramOrActor)) {
    // Named options object
    actorUserId = paramOrActor.actorUserId || null;
    actorEmail = paramOrActor.actorEmail || null;
    actorRole = paramOrActor.actorRole || null;
    action = paramOrActor.action || 'UNKNOWN_ACTION';
    targetUserId = paramOrActor.targetUserId || null;
    resourceType = paramOrActor.resourceType || null;
    resourceId = paramOrActor.resourceId || null;
    metadata = paramOrActor.metadata || {};
    req = paramOrActor.req || null;
    ipAddress = paramOrActor.ipAddress || null;
    userAgent = paramOrActor.userAgent || null;
  } else {
    // Legacy positional syntax: logAuditEvent(actor, role, action, target, metadata)
    actorUserId = paramOrActor || null;
    actorRole = maybeRole || null;
    action = maybeAction || 'UNKNOWN_ACTION';
    targetUserId = maybeTarget || null;
    metadata = maybeMetadata || {};
  }

  const reqMeta = extractRequestMeta(req);
  const resolvedIp = ipAddress || reqMeta.ipAddress;
  const resolvedUa = userAgent || reqMeta.userAgent;

  const logEntry = Object.freeze({
    id: `aud_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
    actorUserId: actorUserId || null,
    actorEmail: actorEmail || null,
    actorRole: actorRole || null,
    action: String(action),
    targetUserId: targetUserId || null,
    resourceType: resourceType || null,
    resourceId: resourceId || null,
    metadata: metadata || {},
    ipAddress: resolvedIp,
    userAgent: resolvedUa,
    createdAt: new Date().toISOString(),
  });

  // Attempt Drizzle ORM Neon DB persistence if available
  try {
    const { db, schema, isMockDb } = require('../db/index');
    if (db && !isMockDb && typeof db.insert === 'function') {
      await db.insert(schema.auditLogs).values({
        id: logEntry.id,
        actorUserId: logEntry.actorUserId,
        actorEmail: logEntry.actorEmail,
        actorRole: logEntry.actorRole,
        action: logEntry.action,
        targetUserId: logEntry.targetUserId,
        resourceType: logEntry.resourceType,
        resourceId: logEntry.resourceId,
        metadata: logEntry.metadata,
        ipAddress: logEntry.ipAddress,
        userAgent: logEntry.userAgent,
        createdAt: new Date(logEntry.createdAt),
      });
    }
  } catch (drizzleErr) {
    // Fall back to local DB
  }

  // Always write to JSON/In-memory store for fallback/offline mode
  try {
    const dbInstance = localDb.getDb();
    dbInstance.auditLogs = dbInstance.auditLogs || [];
    dbInstance.auditLogs.unshift(logEntry);
    localDb.saveDb(dbInstance);
  } catch (localErr) {
    console.warn('[Audit Log Fallback Error]:', localErr.message);
  }

  return logEntry;
}

/**
 * Queries audit logs with pagination and filters
 */
async function getAuditLogs({
  limit = 50,
  offset = 0,
  action = null,
  actorUserId = null,
  targetUserId = null,
  resourceType = null,
} = {}) {
  try {
    const dbInstance = localDb.getDb();
    let logs = dbInstance.auditLogs || [];

    if (action) logs = logs.filter((l) => l.action === action);
    if (actorUserId) logs = logs.filter((l) => l.actorUserId === actorUserId);
    if (targetUserId) logs = logs.filter((l) => l.targetUserId === targetUserId);
    if (resourceType) logs = logs.filter((l) => l.resourceType === resourceType);

    const total = logs.length;
    const paginated = logs.slice(offset, offset + limit);

    return {
      total,
      limit,
      offset,
      logs: paginated,
    };
  } catch (err) {
    return { total: 0, limit, offset, logs: [] };
  }
}

module.exports = {
  AUDIT_ACTIONS,
  logAuditEvent,
  getAuditLogs,
  extractRequestMeta,
};
