import { httpClient } from "@/httpClient/HttpClient";
import { AdminReview, AdminReviewList, ReviewFilters, ReviewModerationRequest } from "@/types/support.type";

/** `/admin/reviews*` (ADMIN, SUPPORT) — pure request functions. */
export const ReviewsEndpoints = {
	/** The moderation queue; `pendingCount` is the number still waiting. */
	getReviews: async (filters: ReviewFilters, page: number, size: number) => {
		const res = await httpClient.call<AdminReviewList>({ method: "GET", url: "admin/reviews", params: { ...filters, page, size } });
		return res.data;
	},

	/** Approve or reject (with the reason), optionally replying at the same time. */
	moderate: async (id: number, payload: ReviewModerationRequest) => {
		const res = await httpClient.call<AdminReview>({ method: "POST", url: `admin/reviews/${id}/moderation`, data: payload });
		return res.data;
	},

	/** «پاسخ کیوا» under the review — set or replace. */
	setReply: async (id: number, text: string) => {
		const res = await httpClient.call<AdminReview>({ method: "PUT", url: `admin/reviews/${id}/reply`, data: { text } });
		return res.data;
	},

	removeReply: async (id: number) => {
		await httpClient.call<void>({ method: "DELETE", url: `admin/reviews/${id}/reply` });
	},
};
