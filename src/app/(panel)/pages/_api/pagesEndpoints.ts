import { httpClient } from "@/httpClient/HttpClient";
import { AdminStaticPage, AdminStaticPageSummary, StaticPageUpsertRequest } from "@/types/content.type";

/**
 * Static pages (terms, privacy, …): every written page is in `GET /admin/pages` (no content, by slug, not cached);
 * a page's content is `GET /admin/pages/{slug}` (1.23.0, not cached — the public `GET /pages/{slug}` may be up to 5
 * minutes old); `PUT /admin/pages/{slug}` creates or replaces (no delete) and answers the same shape.
 */
export const PagesEndpoints = {
	getPages: async () => {
		const res = await httpClient.call<AdminStaticPageSummary[]>({ method: "GET", url: "admin/pages" });
		return res.data;
	},

	getPage: async (slug: string) => {
		const res = await httpClient.call<AdminStaticPage>({ method: "GET", url: `admin/pages/${encodeURIComponent(slug)}` });
		return res.data;
	},

	save: async (slug: string, payload: StaticPageUpsertRequest) => {
		const res = await httpClient.call<AdminStaticPage>({ method: "PUT", url: `admin/pages/${encodeURIComponent(slug)}`, data: payload });
		return res.data;
	},
};

/** Pages the storefront usually has (the contract's examples) — offered to write when they don't exist yet. */
export const KNOWN_PAGES = [
	{ slug: "terms", title: "قوانین و مقررات", usedBy: "فوتر، ورود، تسویه — لازم برای اینماد" },
	{ slug: "privacy", title: "حریم خصوصی", usedBy: "فوتر" },
	{ slug: "returns", title: "شرایط بازگشت کالا", usedBy: "لینک «شرایط بازگشت» (`/config` ← returns.policyUrl)" },
	{ slug: "about", title: "درباره‌ی کیوا", usedBy: "فوتر" },
];
