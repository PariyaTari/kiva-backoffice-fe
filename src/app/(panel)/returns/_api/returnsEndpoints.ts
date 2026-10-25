import { httpClient } from "@/httpClient/HttpClient";
import { PageMeta } from "@/types/pageinate";
import { AdminReturnRequest, AdminReturnSort, ReturnClosePayload, ReturnDecisionPayload, ReturnPickupPayload, ReturnReceiptPayload, ReturnStatus } from "@/types/order.type";

/**
 * `/admin/returns*` (ADMIN, OPERATOR) — pure request functions. The cycle (contract §4): decision → (pickup) →
 * receipt at the warehouse → refund with `returnId` (ADMIN, on the order) or close without one.
 */
export const ReturnsEndpoints = {
	/** `sort`: `newest` (default) or `oldest` by request time — parcels that never arrived surface first (no auto-close). */
	getReturns: async (status: ReturnStatus | "", sort: AdminReturnSort, page: number, size: number) => {
		const res = await httpClient.call<{ items: AdminReturnRequest[]; meta: PageMeta }>({
			method: "GET",
			url: "admin/returns",
			params: { status: status || undefined, sort: sort === "oldest" ? sort : undefined, page, size },
		});
		return res.data;
	},

	/** Approve (who pays the way back, instructions for the shopper) or reject (with the reason). */
	decide: async (id: number, payload: ReturnDecisionPayload) => {
		const res = await httpClient.call<AdminReturnRequest>({ method: "POST", url: `admin/returns/${id}/decision`, data: payload });
		return res.data;
	},

	/** Kiva collects the parcel (`APPROVED` → `PICKUP_SCHEDULED`); called again it changes the time or tracking code. */
	schedulePickup: async (id: number, payload: ReturnPickupPayload) => {
		const res = await httpClient.call<AdminReturnRequest>({ method: "PUT", url: `admin/returns/${id}/pickup`, data: payload });
		return res.data;
	},

	/** The parcel reached the warehouse (→ `RECEIVED`): how many came back and how many go back on sale (logged as `RETURNED`). */
	receive: async (id: number, payload: ReturnReceiptPayload) => {
		const res = await httpClient.call<AdminReturnRequest>({ method: "POST", url: `admin/returns/${id}/receipt`, data: payload });
		return res.data;
	},

	/**
	 * Ends a return without a refund (→ `CLOSED`): it never arrived, or the inspection failed. The order goes back to
	 * `DELIVERED`. Not while a refund of it is still open (`422 RETURN_REFUND_OPEN`).
	 */
	close: async (id: number, payload: ReturnClosePayload) => {
		const res = await httpClient.call<AdminReturnRequest>({ method: "POST", url: `admin/returns/${id}/close`, data: payload });
		return res.data;
	},
};
