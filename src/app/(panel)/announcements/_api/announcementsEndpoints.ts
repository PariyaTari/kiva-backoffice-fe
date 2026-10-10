import { httpClient } from "@/httpClient/HttpClient";
import { Announcement } from "@/types/marketing.type";

/**
 * The top bar's rotating messages. Writing replaces the whole ordered list (`PUT /admin/announcements`); there is
 * no admin read (FEATURES §7 #5), so the current list comes from the public `GET /config`.
 */
export const AnnouncementsEndpoints = {
	getCurrent: async () => {
		const res = await httpClient.call<{ announcements?: Announcement[] }>({ method: "GET", url: "config" });
		return res.data.announcements ?? [];
	},

	replaceAll: async (list: Announcement[]) => {
		const res = await httpClient.call<Announcement[]>({ method: "PUT", url: "admin/announcements", data: list });
		return res.data;
	},
};
