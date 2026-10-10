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
	VALIDATION_ERROR: CLIENT_BUG,
	RATE_LIMITED: TRANSPORT,
};

/** The detail page's «سفارش پیدا نشد» (wrong code in the address bar). */
export const isOrderNotFoundError = (e: ResultError | null | undefined) => e?.code === "ORDER_NOT_FOUND";

/** The order moved on while the page was open (another operator, the reservation timer) — re-read it. */
export const isStaleOrderError = (e: ResultError | null | undefined) => e?.code === "INVALID_STATUS_TRANSITION" || e?.code === "ORDER_ALREADY_SHIPPED";
