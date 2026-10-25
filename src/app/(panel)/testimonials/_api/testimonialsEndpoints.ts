import { httpClient } from "@/httpClient/HttpClient";
import { PageMeta } from "@/types/pageinate";
import { AdminTestimonial, TestimonialUpsertRequest } from "@/types/marketing.type";

/**
 * «مشتری‌ها چی می‌گن» — `/admin/testimonials*` (ADMIN, CONTENT_EDITOR): the list has unpublished ones too, by
 * `sortOrder` then newest; `published` narrows it.
 */
export const TestimonialsEndpoints = {
	getTestimonials: async (published: boolean | null, page: number, size: number) => {
		const res = await httpClient.call<{ items: AdminTestimonial[]; meta: PageMeta }>({
			method: "GET",
			url: "admin/testimonials",
			params: { published: published ?? undefined, page, size },
		});
		return res.data;
	},

	create: async (payload: TestimonialUpsertRequest) => {
		const res = await httpClient.call<AdminTestimonial>({ method: "POST", url: "admin/testimonials", data: payload });
		return res.data;
	},

	update: async (id: number, payload: TestimonialUpsertRequest) => {
		const res = await httpClient.call<AdminTestimonial>({ method: "PUT", url: `admin/testimonials/${id}`, data: payload });
		return res.data;
	},

	remove: async (id: number) => {
		await httpClient.call<void>({ method: "DELETE", url: `admin/testimonials/${id}` });
	},
};
