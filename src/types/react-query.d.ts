import "@tanstack/react-query";
import { ResultError } from "@/types/result";

export type QueryMeta = {
	/** Toast this request's error on every failure (first fetch included). */
	showNotification?: boolean;
	/** Toast only when the error happens on a refetch/retry, not the first fetch. */
	showNotificationOnRefetch?: boolean;
};

declare module "@tanstack/react-query" {
	interface Register {
		defaultError: ResultError;
		queryMeta: QueryMeta;
		mutationMeta: QueryMeta;
	}
}
