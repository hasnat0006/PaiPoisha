// Vercel Web Analytics: anonymous page-view counts (no cookies). Query strings are dropped before
// sending, since a quick-add link (/add?amount=150&note=…) would otherwise leak money details.
"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

export function withoutQuery(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  return { ...event, url: url.origin + url.pathname };
}

export function VercelAnalytics() {
  return <Analytics beforeSend={withoutQuery} />;
}
