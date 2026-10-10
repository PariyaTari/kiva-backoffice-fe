import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FilterValues = Record<string, string>;

/**
 * A list page's filters in the address bar (`?status=PROCESSING&q=…`): linkable, and still there after opening a
 * row and coming back. State only — the page puts the values into its `queryKey`. Values equal to their default
 * are left out of the URL. Pages using it render under the panel layout's `<Suspense>` (`useSearchParams`).
 */
export function useUrlFilters<T extends FilterValues>(defaults: T): [T, (patch: Partial<T>) => void] {
	const router = useRouter();
	const pathname = usePathname();
	const query = useSearchParams().toString();
	// `defaults` is a literal at the call site — its content, not its identity, matters
	const defaultsKey = JSON.stringify(defaults);

	const values = useMemo(() => {
		const read = new URLSearchParams(query);
		const out = JSON.parse(defaultsKey) as T;
		(Object.keys(out) as (keyof T)[]).forEach((key) => {
			const v = read.get(String(key));
			if (v !== null) out[key] = v as T[keyof T];
		});
		return out;
	}, [query, defaultsKey]);

	const setValues = useCallback(
		(patch: Partial<T>) => {
			const base = JSON.parse(defaultsKey) as T;
			const next = new URLSearchParams(query);
			Object.entries(patch).forEach(([key, value]) => {
				if (value === undefined || value === "" || value === base[key]) next.delete(key);
				else next.set(key, String(value));
			});
			const qs = next.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[query, pathname, router, defaultsKey],
	);

	return [values, setValues];
}
