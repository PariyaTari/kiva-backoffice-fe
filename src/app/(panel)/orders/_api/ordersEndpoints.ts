import { httpClient } from "@/httpClient/HttpClient";
import { OrderCode } from "@/types/common.type";
import {
	AdminNote,
	AdminOrder,
	AdminOrderFilters,
	AdminOrderListResponse,
	OrderStatusChangePayload,
	PreShipmentMedia,
	PreShipmentMediaPayload,
	Refund,
	RefundPayload,
	SendMediaPayload,
	ShipmentPayload,
} from "@/types/order.type";

const orderUrl = (code: OrderCode, rest = "") => `admin/orders/${encodeURIComponent(code)}${rest}`;

/** `/admin/orders*` (ADMIN, OPERATOR; refunds ADMIN only) — pure request functions, no React Query concepts. */
export const OrdersEndpoints = {
	/** The queue, with per-status counters for the tabs (`statusCounts`). */
	getOrders: async (filters: AdminOrderFilters, page: number, size: number) => {
		const res = await httpClient.call<AdminOrderListResponse>({ method: "GET", url: "admin/orders", params: { ...filters, page, size } });
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

	/** Replaces the order's photo/video list (each tied to an order item and a view). */
	setPreShipmentMedia: async (code: OrderCode, payload: PreShipmentMediaPayload) => {
		const res = await httpClient.call<PreShipmentMedia>({ method: "PUT", url: orderUrl(code, "/pre-shipment-media"), data: payload });
		return res.data;
	},

	/** To the shopper's messenger (or recorded as sent by hand) → `PHOTO_SENT` + SMS. */
	sendPreShipmentMedia: async (code: OrderCode, payload: SendMediaPayload) => {
		const res = await httpClient.call<AdminOrder>({ method: "POST", url: orderUrl(code, "/pre-shipment-media/send"), data: payload });
		return res.data;
	},

	/** Handed to the carrier → `SHIPPED` + SMS; a reservation group gets the same code on every order. */
	setShipment: async (code: OrderCode, payload: ShipmentPayload) => {
		const res = await httpClient.call<AdminOrder>({ method: "PUT", url: orderUrl(code, "/shipment"), data: payload });
		return res.data;
	},

	addNote: async (code: OrderCode, text: string) => {
		const res = await httpClient.call<AdminNote>({ method: "POST", url: orderUrl(code, "/notes"), data: { text } });
		return res.data;
	},

	/** ADMIN only — full or partial, optionally tied to a return. */
	createRefund: async (code: OrderCode, payload: RefundPayload) => {
		const res = await httpClient.call<Refund>({ method: "POST", url: orderUrl(code, "/refunds"), data: payload });
		return res.data;
	},
};
