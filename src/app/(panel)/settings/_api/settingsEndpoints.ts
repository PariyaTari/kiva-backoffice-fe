import { httpClient } from "@/httpClient/HttpClient";
import { AdminSettings } from "@/types/settings.type";

/** `/admin/settings` (ADMIN only) — what the storefront's `/config` publishes. */
export const SettingsEndpoints = {
	get: async () => {
		const res = await httpClient.call<AdminSettings>({ method: "GET", url: "admin/settings" });
		return res.data;
	},

	/** The whole object is saved at once. */
	save: async (settings: AdminSettings) => {
		const res = await httpClient.call<AdminSettings>({ method: "PUT", url: "admin/settings", data: settings });
		return res.data;
	},
};
