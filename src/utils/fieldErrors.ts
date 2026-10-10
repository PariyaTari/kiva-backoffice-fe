import { ResultError } from "@/types/result";

/**
 * `400 VALIDATION_ERROR`'s `errors[]` as `{ field: message }` — for the form that sent it (the first message per
 * field). Dot paths stay as the server wrote them (`items[0].mediaId`, `seo.description`).
 */
export function fieldErrorsOf(error: ResultError | null | undefined): Record<string, string> {
	const out: Record<string, string> = {};
	error?.errorDetails?.forEach((d) => {
		if (d.field && !out[d.field]) out[d.field] = d.message;
	});
	return out;
}
