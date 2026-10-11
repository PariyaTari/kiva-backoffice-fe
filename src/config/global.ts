/** API base (`NEXT_PUBLIC_API_URL`) — the panel talks to the API from the browser only. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL;
/** The storefront — «مشاهده در سایت» links (product, post, static page). */
export const STORE_URL = (process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3100").replace(/\/+$/, "");

/**
 * How often the work-queue counters (sidebar, dashboard cards) and the orders page's «سفارش تازه رسید» check again —
 * only while the tab is visible (React Query skips intervals in a background tab).
 */
export const LIVE_POLL_MS = 60_000;

/**
 * How long the storefront keeps a page before rebuilding it (ISR, FEATURES §8) — what an editor saves shows on the
 * site within this many minutes.
 */
export const STORE_REFRESH_MINUTES = { home: 1, blog: 5, faq: 5, pages: 10 } as const;

export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
