import { OrderStatus } from "@/types/order.type";

/** Orders that were never packed — no packing slip, and not selectable for one on the queue. */
const NOT_PACKED: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_FAILED", "EXPIRED", "CANCELLED"];

export const isPackable = (status: OrderStatus) => !NOT_PACKED.includes(status);

/** One print run reads every chosen order's detail, one request each — kept to a morning's batch. */
export const MAX_SLIPS = 30;
