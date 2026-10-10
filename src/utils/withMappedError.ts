import { mapError } from "@/httpClient/utils/mapError";

/** Wrap every `queryFn` / `mutationFn` so raw failures become typed `ResultError`s. */
export async function withMappedError<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (err) {
		throw mapError(err);
	}
}
