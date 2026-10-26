import { ResultError } from "@/types/result";
import { CLIENT_BUG, ErrorBehaviourMap, FINAL, REREAD, TRANSPORT } from "@/utils/apiError";

/** Customers (list, customer page, roles). */
export const ERROR_BEHAVIOUR: ErrorBehaviourMap = {
	// FE-synthesized — fixed, always first
	NETWORK_ERROR: TRANSPORT,
	TIMEOUT: TRANSPORT,
	SERVICE_UNAVAILABLE: TRANSPORT,
	NOT_FOUND: CLIENT_BUG,
	NOT_DATA_FOUND: FINAL,

	// module codes
	UNAUTHORIZED: REREAD,
	TOKEN_EXPIRED: REREAD,
	FORBIDDEN: FINAL, // the role doesn't cover support
	CUSTOMER_DELETED: FINAL, // the customer page shows «این حساب حذف شده» instead
	VALIDATION_ERROR: CLIENT_BUG,
	RATE_LIMITED: TRANSPORT,
};

/**
 * 1.22.0 — the account was deleted (`404 CUSTOMER_DELETED`): its id still sits on orders, returns and reviews, so a link
 * can lead here; the page says so instead of an error. (`NOT_FOUND` — a wrong id in the address bar — stays an error.)
 */
export const isCustomerDeletedError = (e: ResultError | null | undefined) => e?.code === "CUSTOMER_DELETED";
