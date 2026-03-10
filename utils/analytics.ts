/**
 * Analytics & Monitoring
 * 
 * Lightweight analytics for tracking usage and errors.
 * Respects user privacy and can be disabled.
 */

import { isEnabled } from "./features";

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: number;
}

// Simple in-memory queue (can be extended to send to backend)
const eventQueue: AnalyticsEvent[] = [];
const MAX_QUEUE_SIZE = 100;

/**
 * Track an event
 */
export async function track(
  event: string,
  properties?: Record<string, any>
): Promise<void> {
  const analyticsEnabled = await isEnabled("analytics.enabled");
  if (!analyticsEnabled) return;

  const eventData: AnalyticsEvent = {
    event,
    properties,
    timestamp: Date.now(),
  };

  // Add to queue
  eventQueue.push(eventData);

  // Keep queue size manageable
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue.shift();
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log("[Analytics]", event, properties);
  }

  // TODO: Send to analytics backend
  // await sendToAnalyticsBackend(eventData);
}

/**
 * Track an error
 */
export async function trackError(
  error: Error,
  context?: Record<string, any>
): Promise<void> {
  const errorReportingEnabled = await isEnabled("errorReporting.enabled");
  if (!errorReportingEnabled) return;

  await track("error", {
    message: error.message,
    stack: error.stack,
    ...context,
  });
}

/**
 * Track page view
 */
export async function pageView(page: string): Promise<void> {
  await track("page_view", { page });
}

/**
 * Track user action
 */
export async function action(
  actionName: string,
  details?: Record<string, any>
): Promise<void> {
  await track("action", { action: actionName, ...details });
}

/**
 * Get queued events (for debugging)
 */
export function getQueuedEvents(): AnalyticsEvent[] {
  return [...eventQueue];
}

/**
 * Clear event queue
 */
export function clearQueue(): void {
  eventQueue.length = 0;
}

export default {
  track,
  trackError,
  pageView,
  action,
  getQueuedEvents,
  clearQueue,
};
