import { httpClient } from "@/httpClient/HttpClient";
import { AdminCampaign, CampaignUpsertRequest } from "@/types/marketing.type";

/** `/admin/campaigns*` (ADMIN, CONTENT_EDITOR) — the home page's sale section with its countdown; past, running and future. */
export const CampaignsEndpoints = {
	getCampaigns: async () => {
		const res = await httpClient.call<AdminCampaign[]>({ method: "GET", url: "admin/campaigns" });
		return res.data;
	},

	create: async (payload: CampaignUpsertRequest) => {
		const res = await httpClient.call<AdminCampaign>({ method: "POST", url: "admin/campaigns", data: payload });
		return res.data;
	},

	update: async (id: number, payload: CampaignUpsertRequest) => {
		const res = await httpClient.call<AdminCampaign>({ method: "PUT", url: `admin/campaigns/${id}`, data: payload });
		return res.data;
	},

	/** Display only — deleting it touches no price or order. To hide it for a while, `isActive = false` instead. */
	remove: async (id: number) => {
		await httpClient.call<void>({ method: "DELETE", url: `admin/campaigns/${id}` });
	},
};
