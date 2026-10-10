import { httpClient } from "@/httpClient/HttpClient";
import { FaqGroup } from "@/types/content.type";

/** FAQ — the whole ordered list is saved at once (`PUT /admin/faq/groups`); it is read from the public `GET /faq` (FEATURES §7 #5). */
export const FaqEndpoints = {
	getGroups: async () => {
		const res = await httpClient.call<{ groups: FaqGroup[] }>({ method: "GET", url: "faq" });
		return res.data.groups;
	},

	replaceAll: async (groups: FaqGroup[]) => {
		const res = await httpClient.call<FaqGroup[]>({ method: "PUT", url: "admin/faq/groups", data: groups });
		return res.data;
	},
};
