import { httpClient } from "@/httpClient/HttpClient";
import { Announcement, AnnouncementInput } from "@/types/marketing.type";

/**
 * The top bar's rotating messages. `GET /admin/announcements` has every one (scheduled and ended too, unlike
 * `GET /config`); writing replaces the whole ordered list (`PUT`, at most 10) — a message left out is deleted.
 */
export const AnnouncementsEndpoints = {
	getAll: async () => {
		const res = await httpClient.call<Announcement[]>({ method: "GET", url: "admin/announcements" });
		return res.data;
	},

	replaceAll: async (list: AnnouncementInput[]) => {
		const res = await httpClient.call<Announcement[]>({ method: "PUT", url: "admin/announcements", data: list });
		return res.data;
	},
};
