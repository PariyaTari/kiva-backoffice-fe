import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * `false` on the server and while hydrating, `true` afterwards.
 * For views inside a late-hydrating `<Suspense>` (e.g. around `useSearchParams`) that read a
 * query another component already filled — the server never had that data, so it must stay out of the first pass.
 */
export function useHydrated() {
	return useSyncExternalStore(
		noop,
		() => true,
		() => false,
	);
}
