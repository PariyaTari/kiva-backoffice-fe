import { httpClient } from "@/httpClient/HttpClient";
import { ResultError } from "@/types/result";
import { StaticPage } from "@/types/content.type";

/**
 * Static pages (terms, privacy, …): `PUT /admin/pages/{slug}` creates or replaces; reading is the public
 * `GET /pages/{slug}` — there is no list (FEATURES §7 #4), so the panel keeps the slugs the storefront links to.
 */
export const PagesEndpoints = {
	getPage: async (slug: string) => {
		const res = await httpClient.call<StaticPage>({ method: "GET", url: `pages/${encodeURIComponent(slug)}` });
		return res.data;
	},

	save: async (slug: string, payload: Omit<StaticPage, "slug" | "updatedAt">) => {
		const res = await httpClient.call<StaticPage>({ method: "PUT", url: `admin/pages/${encodeURIComponent(slug)}`, data: payload });
		return res.data;
	},
};

/** The slugs the storefront links to (footer, login, checkout) — and a home for new ones. */
export const KNOWN_PAGES = [
	{ slug: "terms", title: "قوانین و حریم خصوصی", usedBy: "فوتر، ورود، تسویه — لازم برای اینماد" },
	{ slug: "privacy", title: "حریم خصوصی", usedBy: "اختیاری" },
	{ slug: "shipping-policy", title: "شرایط ارسال", usedBy: "اختیاری" },
	{ slug: "return-policy", title: "شرایط بازگشت کالا", usedBy: "اختیاری" },
];

/** No page under this slug yet — the editor starts a new one (the contract has no dedicated code for it). */
export const isPageMissingError = (e: ResultError | null | undefined) => e?.code === "PAGE_NOT_FOUND" || e?.statusCode === 404;
