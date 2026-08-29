/**
 * Skill Bridge Platform - Unified Event Hub & Platform Lifecycle Dispatcher
 * File: lib/events.js
 * 
 * Provides:
 * 1. PLATFORM_EVENTS enumeration covering all platform lifecycle state changes
 * 2. PlatformEventDispatcher for synchronous and asynchronous event publishing
 * 3. Subscription helpers (onPlatformEvent, oncePlatformEvent, offPlatformEvent)
 * 4. Automatic event-to-lifecycle binding
 */

const EventEmitter = require('events');

// ============================================================================
// 1. PLATFORM LIFECYCLE EVENT ENUMERATIONS
// ============================================================================

const PLATFORM_EVENTS = {
  // Application Lifecycle Events
  APPLICATION_CREATED: 'application:created',
  APPLICATION_STATUS_CHANGED: 'application:status_changed',
  APPLICATION_REVIEWED: 'application:reviewed',
  APPLICATION_SHORTLISTED: 'application:shortlisted',
  APPLICATION_REJECTED: 'application:rejected',

  // Interview Lifecycle Events
  INTERVIEW_SCHEDULED: 'interview:scheduled',
  INTERVIEW_COMPLETED: 'interview:completed',
  INTERVIEW_CANCELLED: 'interview:cancelled',

  // Assessment & Task Lifecycle Events
  ASSESSMENT_STARTED: 'assessment:started',
  ASSESSMENT_SUBMITTED: 'assessment:submitted',
  ASSESSMENT_EVALUATED: 'assessment:evaluated',
  TASK_COMPLETED: 'task:completed',

  // Internship & Job Lifecycle Events
  INTERNSHIP_STARTED: 'internship:started',
  INTERNSHIP_COMPLETED: 'internship:completed',
  JOB_COMPLETED: 'job:completed',

  // Course & Event Lifecycle Events
  COURSE_STARTED: 'course:started',
  COURSE_COMPLETED: 'course:completed',
  SEMINAR_COMPLETED: 'seminar:completed',

  // Rating & Reputation Lifecycle Events
  RATING_INTERACTION_CREATED: 'rating_interaction:created',
  RATING_INTERACTION_UPDATED: 'rating_interaction:updated',
  RATING_SUBMITTED: 'rating:submitted',
  RATING_PUBLISHED: 'rating:published',
  RATING_REPORTED: 'rating:reported',
  RATING_HIDDEN: 'rating:hidden',
  RATING_APPEALED: 'rating:appealed',
  RATING_RESTORED: 'rating:restored',
  AGGREGATES_RECALCULATED: 'rating:aggregates_recalculated',
};

// ============================================================================
// 2. DISPATCHER IMPLEMENTATION
// ============================================================================

class PlatformEventDispatcher extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Emits a platform event synchronously to all registered listeners
   * @param {string} eventName - Name of the platform event
   * @param {Record<string, any>} payload - Event data payload
   * @returns {boolean} True if event had listeners
   */
  emitEvent(eventName, payload = {}) {
    const eventPayload = {
      ...payload,
      eventName,
      emittedAt: new Date().toISOString(),
    };
    return this.emit(eventName, eventPayload);
  }

  /**
   * Emits a platform event asynchronously, awaiting any async listener promises
   * @param {string} eventName - Name of the platform event
   * @param {Record<string, any>} payload - Event data payload
   * @returns {Promise<Array<any>>} Resolved results from listeners
   */
  async emitEventAsync(eventName, payload = {}) {
    const eventPayload = {
      ...payload,
      eventName,
      emittedAt: new Date().toISOString(),
    };
    const listeners = this.rawListeners(eventName);
    const results = [];
    for (const listener of listeners) {
      try {
        const res = listener(eventPayload);
        if (res && typeof res.then === 'function') {
          results.push(await res);
        } else {
          results.push(res);
        }
      } catch (err) {
        console.error(`Error in async event listener for '${eventName}':`, err);
      }
    }
    return results;
  }
}

const platformEvents = new PlatformEventDispatcher();

// Subscription helper wrappers
function emitPlatformEvent(event, payload) {
  return platformEvents.emitEvent(event, payload);
}

function emitPlatformEventAsync(event, payload) {
  return platformEvents.emitEventAsync(event, payload);
}

function onPlatformEvent(event, handler) {
  platformEvents.on(event, handler);
  return () => platformEvents.off(event, handler);
}

function oncePlatformEvent(event, handler) {
  platformEvents.once(event, handler);
  return () => platformEvents.off(event, handler);
}

function offPlatformEvent(event, handler) {
  platformEvents.off(event, handler);
}

module.exports = {
  PLATFORM_EVENTS,
  platformEvents,
  emitPlatformEvent,
  emitPlatformEventAsync,
  onPlatformEvent,
  oncePlatformEvent,
  offPlatformEvent,
};
