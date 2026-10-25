import { httpClient } from "@/httpClient/HttpClient";
import { AuditLogFilters, AuditLogList } from "@/types/audit.type";

/**
 * `GET /admin/audit-log` (ADMIN only) — every successful write under `/admin/*`, newest first, kept 90 days. Shared by
 * the `/audit-log` page and the «تاریخچه‌ی تغییرات» card of an order, product or customer (`entityType` + `entityId`).
 */
export const AuditEndpoints = {
	getEntries: async (filters: AuditLogFilters, page: number, size: number) => {
		const res = await httpClient.call<AuditLogList>({
			method: "GET",
			url: "admin/audit-log",
			params: {
				entityType: filters.entityType || undefined,
				entityId: filters.entityId || undefined,
				actorId: filters.actorId || undefined,
				from: filters.from || undefined,
				to: filters.to || undefined,
				page,
				size,
			},
		});
		return res.data;
	},
};
