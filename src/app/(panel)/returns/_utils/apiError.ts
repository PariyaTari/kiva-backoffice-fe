import { ResultError } from "@/types/result";
import { CLIENT_BUG, ErrorBehaviourMap, FINAL, REREAD, TRANSPORT } from "@/utils/apiError";

/** Returns (list, decision). */
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
	FORBIDDEN: FINAL,
	VALIDATION_ERROR: CLIENT_BUG,
	RATE_LIMITED: TRANSPORT,
};

/** Someone decided on this return meanwhile — re-read the list. */
export const isAlreadyDecidedError = (e: ResultError | null | undefined) => e?.code === "INVALID_STATUS_TRANSITION";

/**
 * A later step found the return elsewhere: it moved on (`INVALID_STATUS_TRANSITION`), or (1.21.0) a refund of it is
 * still `PENDING` / `PROCESSING` so it can't be closed (`RETURN_REFUND_OPEN`). Re-read the list.
 */
export const isStaleReturnError = (e: ResultError | null | undefined) => e?.code === "INVALID_STATUS_TRANSITION" || e?.code === "RETURN_REFUND_OPEN";
