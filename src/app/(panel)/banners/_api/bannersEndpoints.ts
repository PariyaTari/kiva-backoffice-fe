import { httpClient } from "@/httpClient/HttpClient";
import { Banner, BannerUpsertRequest } from "@/types/marketing.type";

/** `/admin/banners*` (ADMIN, CONTENT_EDITOR) — pure request functions. */
export const BannersEndpoints = {
	getBanners: async () => {
		const res = await httpClient.call<Banner[]>({ method: "GET", url: "admin/banners" });
		return res.data;
	},

	create: async (payload: BannerUpsertRequest) => {
		const res = await httpClient.call<Banner>({ method: "POST", url: "admin/banners", data: payload });
		return res.data;
	},

	update: async (id: number, payload: BannerUpsertRequest) => {
		const res = await httpClient.call<Banner>({ method: "PUT", url: `admin/banners/${id}`, data: payload });
		return res.data;
	},

	remove: async (id: number) => {
		await httpClient.call<void>({ method: "DELETE", url: `admin/banners/${id}` });
	},
};
