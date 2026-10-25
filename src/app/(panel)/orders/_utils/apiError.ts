import { ResultError } from "@/types/result";
import { CLIENT_BUG, ErrorBehaviourMap, FINAL, REREAD, TRANSPORT } from "@/utils/apiError";

/** Orders (queue, detail, actions). */
export const ERROR_BEHAVIOUR: ErrorBehaviourMap = {
	// FE-synthesized — fixed, always first
	NETWORK_ERROR: TRANSPORT,
	TIMEOUT: TRANSPORT,
	SERVICE_UNAVAILABLE: TRANSPORT,
	NOT_FOUND: CLIENT_BUG,
	NOT_DATA_FOUND: FINAL,

	// module codes
	UNAUTHORIZED: REREAD, // session ended — the shell sends to login
	TOKEN_EXPIRED: REREAD,
	FORBIDDEN: FINAL, // the role doesn't cover orders
	ORDER_NOT_FOUND: FINAL, // the detail page shows its own «پیدا نشد»
	PRODUCT_NOT_FOUND: FINAL, // a change request's product is no longer published — the bare variant id is shown
	VALIDATION_ERROR: CLIENT_BUG,
	RATE_LIMITED: TRANSPORT,
};

/** The detail page's «سفارش پیدا نشد» (wrong code in the address bar). */
export const isOrderNotFoundError = (e: ResultError | null | undefined) => e?.code === "ORDER_NOT_FOUND";

/** The order moved on while the page was open (another operator, the reservation timer) — re-read it. */
export const isStaleOrderError = (e: ResultError | null | undefined) => e?.code === "INVALID_STATUS_TRANSITION" || e?.code === "ORDER_ALREADY_SHIPPED";

/** A change request's product is unpublished now (`GET /products/{id}` is storefront-only) — fall back to the bare id. */
export const isStoreProductMissingError = (e: ResultError | null | undefined) => e?.code === "PRODUCT_NOT_FOUND";

/**
 * Shipping refused for a reason the modal explains in place (1.12.0): the shopper hasn't answered the photo and the
 * deadline hasn't passed (`meta.feedbackDeadline`), or another order of the reservation group isn't ready (`meta.orderCodes`).
 */
export const isAwaitingFeedbackError = (e: ResultError | null | undefined) => e?.code === "AWAITING_CUSTOMER_FEEDBACK";
export const isGroupNotReadyError = (e: ResultError | null | undefined) => e?.code === "GROUP_NOT_READY";

/** A multi-line order's photos must cover every line (`meta.missingItemIds`). */
export const isPhotosIncompleteError = (e: ResultError | null | undefined) => e?.code === "PHOTOS_INCOMPLETE";

/**
 * 1.21.0 — a return's refund raced someone else: the return already has a refund that has not failed
 * (`RETURN_REFUND_EXISTS`), or it is no longer `RECEIVED` (`INVALID_STATUS_TRANSITION`). Re-read the order.
 */
export const isStaleReturnRefundError = (e: ResultError | null | undefined) => e?.code === "RETURN_REFUND_EXISTS" || e?.code === "INVALID_STATUS_TRANSITION";
