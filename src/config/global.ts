/** API base (`NEXT_PUBLIC_API_URL`) — the panel talks to the API from the browser only. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL;
/** The storefront — «مشاهده در سایت» links (product, post, static page). */
export const STORE_URL = (process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3100").replace(/\/+$/, "");

export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
