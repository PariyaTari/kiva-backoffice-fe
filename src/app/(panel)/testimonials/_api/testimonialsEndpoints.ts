import { httpClient } from "@/httpClient/HttpClient";
import { PageMeta } from "@/types/pageinate";
import { Testimonial, TestimonialUpsertRequest } from "@/types/marketing.type";

/**
 * «مشتری‌ها چی می‌گن» — writes are `/admin/testimonials*` (ADMIN, CONTENT_EDITOR); there is no admin list
 * (FEATURES §7 #3), so the table reads the public `GET /testimonials` (published ones only).
 */
export const TestimonialsEndpoints = {
	getPublished: async (page: number, size: number) => {
		const res = await httpClient.call<{ items: Testimonial[]; meta: PageMeta }>({ method: "GET", url: "testimonials", params: { page, size } });
		return res.data;
	},

	create: async (payload: TestimonialUpsertRequest) => {
		const res = await httpClient.call<Testimonial>({ method: "POST", url: "admin/testimonials", data: payload });
		return res.data;
	},

	update: async (id: number, payload: TestimonialUpsertRequest) => {
		const res = await httpClient.call<Testimonial>({ method: "PUT", url: `admin/testimonials/${id}`, data: payload });
		return res.data;
	},

	remove: async (id: number) => {
		await httpClient.call<void>({ method: "DELETE", url: `admin/testimonials/${id}` });
	},
};
