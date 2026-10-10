import { ResultError } from "@/types/result";
import { CLIENT_BUG, ErrorBehaviourMap, FINAL, REREAD, TRANSPORT } from "@/utils/apiError";

/** Products, variants, inventory. */
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
	PRODUCT_NOT_FOUND: FINAL, // the edit page shows its own «پیدا نشد»
	VARIANT_NOT_FOUND: REREAD,
	CHANGED_BY_SOMEONE_ELSE: REREAD,
	VALIDATION_ERROR: CLIENT_BUG,
	RATE_LIMITED: TRANSPORT,
};

export const isProductNotFoundError = (e: ResultError | null | undefined) => e?.code === "PRODUCT_NOT_FOUND";

/** Saved elsewhere since the form opened (`412`, or `409 CHANGED_BY_SOMEONE_ELSE`) — nothing stored; re-read and start over. */
export const isStaleProductError = (e: ResultError | null | undefined) => e?.code === "CHANGED_BY_SOMEONE_ELSE" || e?.statusCode === 412;
