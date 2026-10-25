import { httpClient } from "@/httpClient/HttpClient";
import { FaqGroup, FaqGroupInput } from "@/types/content.type";

/**
 * FAQ — read as the form needs it (`GET /admin/faq/groups`, not cached unlike `GET /faq`), saved as one whole tree
 * (`PUT /admin/faq/groups`): a group or question left out is deleted.
 */
export const FaqEndpoints = {
	getGroups: async () => {
		const res = await httpClient.call<FaqGroup[]>({ method: "GET", url: "admin/faq/groups" });
		return res.data;
	},

	replaceAll: async (groups: FaqGroupInput[]) => {
		const res = await httpClient.call<FaqGroup[]>({ method: "PUT", url: "admin/faq/groups", data: groups });
		return res.data;
	},
};
