type AnalyticsValue = string | number | boolean;
type AnalyticsData = Record<string, AnalyticsValue>;

export const ANALYTICS_EVENTS = [
  "explore_view_changed",
  "explore_search_mode_changed",
  "directory_search",
  "listing_viewed",
  "listing_contact_clicked",
  "listing_save_toggled",
  "wheel_spin_started",
  "wheel_spin_completed",
  "wheel_result_opened",
  "partner_plan_selected",
  "partner_inquiry_submitted",
  "directory_import_previewed",
  "directory_import_completed",
] as const;
type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): unknown;
    };
  }
}

/** Replit injects the tracker on published websites; never load one ourselves. */
export function trackEvent(name: AnalyticsEvent, data?: AnalyticsData): void {
  if (typeof window === "undefined") return;
  try {
    // Catch both synchronous tracker errors and rejected tracking requests.
    void Promise.resolve(window.umami?.track(name, data)).catch(() => {});
  } catch {
    // Analytics is optional and must never interrupt an application action.
  }
}
