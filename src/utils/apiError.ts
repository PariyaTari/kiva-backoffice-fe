import { ResultError } from "@/types/result";

/** What the error block offers for a code: a retry button and/or a «گزارش به پشتیبانی» (ticket) button. */
export type ErrorPreset = { retry: boolean; ticket: boolean };

/** The request never got a real answer — try again. */
export const TRANSPORT: ErrorPreset = { retry: true, ticket: false };
/** The data moved under you (conflict, stale state) — re-read and try again. */
export const REREAD: ErrorPreset = { retry: true, ticket: false };
/** A real, stable answer — retrying gives the same result, nobody needs a ticket. */
export const FINAL: ErrorPreset = { retry: false, ticket: false };
/** The FE sent something it should never send — someone must fix code. */
export const CLIENT_BUG: ErrorPreset = { retry: false, ticket: true };
/** Default for codes a module didn't map — offer both. */
export const UNKNOWN: ErrorPreset = { retry: true, ticket: true };

/** Per-module map from backend/FE error `code` to its preset (`_utils/apiError.ts` of each module). */
export type ErrorBehaviourMap = Record<string, ErrorPreset>;

/** Everything an error block needs to render. */
export type ApiErrorView = {
	retryable: boolean;
	ticketAble: boolean;
	errorText: string;
};

const PERMISSION_TEXT = "به این بخش دسترسی نداری.";

/**
 * Turns a query's `error` into what the error block shows, or `null` when there is no error.
 * The text is the server's Persian `message` when there is one, otherwise `fallbackText`.
 */
export function toErrorView(map: ErrorBehaviourMap, error: ResultError | null | undefined, fallbackText: string): ApiErrorView | null {
	if (!error) return null;
	const preset = map[error.code] ?? UNKNOWN;
	const serverText = error.code === "UNKNOWN_ERROR" ? "" : error.description;
	return {
		retryable: preset.retry,
		ticketAble: preset.ticket,
		errorText: error.code === "FORBIDDEN" ? PERMISSION_TEXT : serverText || fallbackText,
	};
}
