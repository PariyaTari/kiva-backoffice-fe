import { httpClient } from "@/httpClient/HttpClient";
import { AdminReportOverview } from "@/types/settings.type";

/** `GET /admin/reports/overview` (ADMIN only) — the dashboard's numbers for a date range (Gregorian `YYYY-MM-DD`). */
export const ReportsEndpoints = {
	getOverview: async (from: string, to: string) => {
		const res = await httpClient.call<AdminReportOverview>({ method: "GET", url: "admin/reports/overview", params: { from, to } });
		return res.data;
	},
};
