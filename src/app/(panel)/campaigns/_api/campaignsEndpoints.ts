import { httpClient } from "@/httpClient/HttpClient";
import { Campaign, CampaignUpsertRequest } from "@/types/marketing.type";

/** `/admin/campaigns*` (ADMIN, CONTENT_EDITOR) — the home page's sale section with its countdown. No delete (FEATURES §7 #21). */
export const CampaignsEndpoints = {
	getCampaigns: async () => {
		const res = await httpClient.call<Campaign[]>({ method: "GET", url: "admin/campaigns" });
		return res.data;
	},

	create: async (payload: CampaignUpsertRequest) => {
		const res = await httpClient.call<Campaign>({ method: "POST", url: "admin/campaigns", data: payload });
		return res.data;
	},

	update: async (id: number, payload: CampaignUpsertRequest) => {
		const res = await httpClient.call<Campaign>({ method: "PUT", url: `admin/campaigns/${id}`, data: payload });
		return res.data;
	},
};
