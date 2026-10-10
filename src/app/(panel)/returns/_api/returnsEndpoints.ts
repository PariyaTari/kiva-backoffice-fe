import { httpClient } from "@/httpClient/HttpClient";
import { PageMeta } from "@/types/pageinate";
import { ReturnDecisionPayload, ReturnRequest, ReturnStatus } from "@/types/order.type";

/** A return as the mock/panel shows it — the contract's `ReturnRequest` (a rejection's reason is not in it, see FEATURES §7). */
export type AdminReturn = ReturnRequest & { rejectionReason?: string | null };

/** `/admin/returns*` (ADMIN, OPERATOR) — pure request functions. */
export const ReturnsEndpoints = {
	getReturns: async (status: ReturnStatus | "", page: number, size: number) => {
		const res = await httpClient.call<{ items: AdminReturn[]; meta: PageMeta }>({ method: "GET", url: "admin/returns", params: { status: status || undefined, page, size } });
		return res.data;
	},

	/** Approve (who pays the way back, instructions for the shopper) or reject (with the reason). */
	decide: async (id: number, payload: ReturnDecisionPayload) => {
		const res = await httpClient.call<AdminReturn>({ method: "POST", url: `admin/returns/${id}/decision`, data: payload });
		return res.data;
	},
};
