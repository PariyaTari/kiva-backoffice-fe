"use client";

import { useState } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useNotificationStore } from "@/store/notification.store";
import { ResultError } from "@/types/result";
import { QueryMeta } from "@/types/react-query";

function notifyOnError(error: ResultError, meta?: QueryMeta, isRefetch?: boolean) {
	const shouldNotify = meta?.showNotification || (meta?.showNotificationOnRefetch && !!isRefetch);
	if (!shouldNotify) return;
	useNotificationStore.getState().showNotification({ type: "error", message: error.description });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				queryCache: new QueryCache({
					onError: (error, query) =>
						notifyOnError(error, query.meta, query.state.dataUpdateCount + query.state.errorUpdateCount > 1),
				}),
				mutationCache: new MutationCache({
					onError: (error, _variables, _context, mutation) => notifyOnError(error, mutation.meta),
				}),
				defaultOptions: {
					queries: {
						staleTime: 0,
						gcTime: 0,
						refetchOnWindowFocus: false,
						// no automatic retries — retrying is manual, from the error block (data-fetching standard)
						retry: false,
					},
					mutations: {
						retry: 0,
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
		</QueryClientProvider>
	);
}
