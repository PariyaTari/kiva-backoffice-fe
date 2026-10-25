import { AdminOrder, OrderStatus } from "@/types/order.type";

/** Orders that were never packed — no packing slip, and not selectable for one on the queue. */
const NOT_PACKED: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_FAILED", "EXPIRED", "CANCELLED"];

export const isPackable = (status: OrderStatus) => !NOT_PACKED.includes(status);

/** One print run reads every chosen order's detail, one request each — kept to a morning's batch. */
export const MAX_SLIPS = 30;

/**
 * The photo step (1.12.0): the operator edits a draft and records the sending only while the order is `PROCESSING`
 * and the photo `WAITING` — again after a resolved change request.
 */
export const isPhotoStep = (o: AdminOrder) => o.status === "PROCESSING" && o.preShipmentMediaDetail.status === "WAITING";

/** The shopper approved the photo, or its reply deadline passed — `PHOTO_SENT` may ship now. */
export const isPhotoAnswered = (o: AdminOrder) => {
	const m = o.preShipmentMediaDetail;
	return m.status === "APPROVED" || (!!m.feedbackDeadline && Date.parse(m.feedbackDeadline) <= Date.now());
};

/** Lines of a multi-line order with no photo in the draft — sending is refused until each has one (`PHOTOS_INCOMPLETE`). */
export const linesWithoutPhoto = (o: AdminOrder, itemIds: (number | null)[]) => (o.items.length > 1 ? o.items.filter((i) => !itemIds.includes(i.id)) : []);
