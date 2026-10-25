import { httpClient } from "@/httpClient/HttpClient";
import { NewsletterFilters, NewsletterList } from "@/types/marketing.type";

/**
 * `GET /admin/newsletter/subscriptions` (ADMIN only — e-mails are personal data). A list only: the newsletter itself
 * goes out with an outside tool.
 */
export const NewsletterEndpoints = {
	/** Newest `subscribedAt` first; `q` = part of the e-mail. */
	getSubscriptions: async (filters: NewsletterFilters, page: number, size: number) => {
		const res = await httpClient.call<NewsletterList>({
			method: "GET",
			url: "admin/newsletter/subscriptions",
			params: { status: filters.status || undefined, q: filters.q || undefined, page, size },
		});
		return res.data;
	},
};
