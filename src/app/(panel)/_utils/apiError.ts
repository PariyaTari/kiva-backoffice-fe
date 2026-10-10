import { CLIENT_BUG, ErrorBehaviourMap, FINAL, REREAD, TRANSPORT } from "@/utils/apiError";

/**
 * The map of the panel's plain CRUD sections (marketing, content, support, settings) — they answer only the
 * shared codes; a section with codes of its own keeps its own `_utils/apiError.ts` (orders, products, …).
 */
export const PANEL_ERRORS: ErrorBehaviourMap = {
	// FE-synthesized — fixed, always first
	NETWORK_ERROR: TRANSPORT,
	TIMEOUT: TRANSPORT,
	SERVICE_UNAVAILABLE: TRANSPORT,
	NOT_FOUND: CLIENT_BUG,
	NOT_DATA_FOUND: FINAL,

	// shared codes
	UNAUTHORIZED: REREAD,
	TOKEN_EXPIRED: REREAD,
	FORBIDDEN: FINAL,
	CHANGED_BY_SOMEONE_ELSE: REREAD,
	VALIDATION_ERROR: CLIENT_BUG,
	RATE_LIMITED: TRANSPORT,
};
