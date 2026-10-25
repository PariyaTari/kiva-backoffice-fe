import { httpClient } from "@/httpClient/HttpClient";
import { OrderCode } from "@/types/common.type";
import { StoreProduct, StoreProductDetail } from "@/types/marketing.type";
import {
	AdminNote,
	AdminOrder,
	AdminOrderFilters,
	AdminOrderListResponse,
	ChangeRequestResolutionPayload,
	OrderStatusChangePayload,
	PreShipmentMedia,
	PreShipmentMediaPayload,
	Refund,
	RefundPayload,
	RefundUpdatePayload,
	SendMediaPayload,
	ShipmentPayload,
} from "@/types/order.type";

/** The storefront's change-request modal shows this many «محصولات مشابه» (kiva-fe `changeRequestModal`). */
const RELATED_LIMIT = 8;

const orderUrl = (code: OrderCode, rest = "") => `admin/orders/${encodeURIComponent(code)}${rest}`;

/** `/admin/orders*` (ADMIN, OPERATOR; refunds ADMIN only) — pure request functions, no React Query concepts. */
export const OrdersEndpoints = {
	/**
	 * The queue, with per-status counters for the tabs (`statusCounts`: all 13, every filter but `status`). Without a
	 * status, unpaid and expired orders are left out.
	 */
	getOrders: async (filters: AdminOrderFilters, page: number, size: number, signal?: AbortSignal) => {
		const res = await httpClient.call<AdminOrderListResponse>({ method: "GET", url: "admin/orders", params: { ...filters, page, size }, signal });
		return res.data;
	},

	getOrder: async (code: OrderCode) => {
		const res = await httpClient.call<AdminOrder>({ method: "GET", url: orderUrl(code) });
		return res.data;
	},

	/** Only to one of `allowedTransitions`; anything else is `422 INVALID_STATUS_TRANSITION`. */
	changeStatus: async (code: OrderCode, payload: OrderStatusChangePayload) => {
		const res = await httpClient.call<AdminOrder>({ method: "POST", url: orderUrl(code, "/status"), data: payload });
		return res.data;
	},

	/**
	 * Replaces the photo **draft** (1–20 files, each tied to an order item and a view) — the shopper doesn't see it
	 * until the sending is recorded. Only in `PROCESSING` with the photo step `WAITING`.
	 */
	setPreShipmentMedia: async (code: OrderCode, payload: PreShipmentMediaPayload) => {
		const res = await httpClient.call<PreShipmentMedia>({ method: "PUT", url: orderUrl(code, "/pre-shipment-media"), data: payload });
		return res.data;
	},

	/**
	 * The operator sent the draft in the shopper's messenger by hand and records it here → `PHOTO_SENT`, photo `SENT`,
	 * reply deadline +24h, SMS. A multi-line order needs a photo of every line (`422 PHOTOS_INCOMPLETE`).
	 */
	sendPreShipmentMedia: async (code: OrderCode, payload: SendMediaPayload) => {
		const res = await httpClient.call<AdminOrder>({ method: "POST", url: orderUrl(code, "/pre-shipment-media/send"), data: payload });
		return res.data;
	},

	/**
	 * Handed to the carrier → `SHIPPED` + SMS, only from `PHOTO_SENT` once the shopper approved or the reply deadline
	 * passed; a reservation group ships in one go with one code. On a `SHIPPED` order it corrects the code / time, no SMS.
	 */
	setShipment: async (code: OrderCode, payload: ShipmentPayload) => {
		const res = await httpClient.call<AdminOrder>({ method: "PUT", url: orderUrl(code, "/shipment"), data: payload });
		return res.data;
	},

	addNote: async (code: OrderCode, text: string) => {
		const res = await httpClient.call<AdminNote>({ method: "POST", url: orderUrl(code, "/notes"), data: { text } });
		return res.data;
	},

	/**
	 * Carry out or turn down the shopper's change request (`CHANGE_REQUESTED` → `PROCESSING`, photos again). A dearer
	 * colour/model leaves `totals.balanceDue`, a cheaper one a `PENDING` refund; dropping the only line cancels the order.
	 */
	resolveChangeRequest: async (code: OrderCode, payload: ChangeRequestResolutionPayload) => {
		const res = await httpClient.call<AdminOrder>({ method: "POST", url: orderUrl(code, "/change-request/resolution"), data: payload });
		return res.data;
	},

	/**
	 * ADMIN only — full or partial, optionally tied to a return. Refunds are manual: the server only records it
	 * (`PENDING`, expected within 72h) and a colleague transfers the money.
	 */
	createRefund: async (code: OrderCode, payload: RefundPayload) => {
		const res = await httpClient.call<Refund>({ method: "POST", url: orderUrl(code, "/refunds"), data: payload });
		return res.data;
	},

	/** ADMIN only — a refund moves on: `PROCESSING`, `COMPLETED` (always with the transfer's tracking number) or `FAILED`. */
	updateRefund: async (refundId: number, payload: RefundUpdatePayload) => {
		const res = await httpClient.call<Refund>({ method: "PATCH", url: `admin/refunds/${refundId}`, data: payload });
		return res.data;
	},

	/**
	 * A change request's «رنگ دیگه» — the storefront product page (`GET /products/{id}`): readable by every role,
	 * published products only, the variants with colour and stock.
	 */
	getStoreProduct: async (productId: number) => {
		const res = await httpClient.call<StoreProductDetail>({ method: "GET", url: `products/${productId}` });
		return res.data;
	},

	/** A change request's «مدل دیگه» — the shopper picks it from «محصولات مشابه» (`GET /products/{id}/related`), so it is looked up there. */
	getRelatedProducts: async (productId: number) => {
		const res = await httpClient.call<StoreProduct[]>({ method: "GET", url: `products/${productId}/related`, params: { limit: RELATED_LIMIT } });
		return res.data;
	},
};
