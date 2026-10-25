import { ResultError } from "@/types/result";

/** The contract's dot-notation (`blocks.0.text`, `0.name` for a root array) — an older `items[0].x` spelling is folded into it. */
const dotPath = (field: string) => field.replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "");

/**
 * `400 VALIDATION_ERROR`'s `errors[]` as `{ field: message }` — for the form that sent it (the first message per
 * field), keyed by dot path (`items.0.mediaId`, `seo.description`).
 */
export function fieldErrorsOf(error: ResultError | null | undefined): Record<string, string> {
	const out: Record<string, string> = {};
	error?.errorDetails?.forEach((d) => {
		const field = d.field && dotPath(d.field);
		if (field && !out[field]) out[field] = d.message;
	});
	return out;
}

/**
 * `fieldErrorsOf` plus the `409`s that carry no `errors[]` but are about one field (`DUPLICATE_SLUG` → `slug`,
 * `DUPLICATE_CODE` → `code`): the server's message goes under that field too, not only in the toast.
 */
export function fieldErrorsWith(error: ResultError | null | undefined, codeFields: Record<string, string>): Record<string, string> {
	const out = fieldErrorsOf(error);
	const field = error ? codeFields[error.code] : undefined;
	if (error && field && !out[field]) out[field] = error.description;
	return out;
}
