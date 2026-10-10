import { useState } from "react";

export type UseTableStateOptions = {
	/** Any change in these values sends the person back to page 1 (filters, search, tab) — not refetch triggers. */
	resetPageOn?: unknown[];
	initialPage?: number;
	initialPageSize?: number;
	/** e.g. `"newest"` — the list endpoints' `sort` value. */
	initialSortOrders?: string;
};

/**
 * Table state only — page, page size, sort (data-fetching standard §6). Knows nothing about how the rows are
 * fetched; the page owns the filters. The page reset happens during render (React's «adjust state on prop change»),
 * not in an effect: no render with «new filter + old page» is committed and no wasted request goes out.
 * Setters are returned raw — wrapping them would defeat React's same-value bail-out.
 */
export function useTableState({ resetPageOn = [], initialPage = 1, initialPageSize = 20, initialSortOrders = "" }: UseTableStateOptions = {}) {
	const [page, setPage] = useState(initialPage);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [sortOrders, setSortOrders] = useState(initialSortOrders);

	// a new page size or sort also starts over — page 7 of a different slicing means nothing
	const resetKey = JSON.stringify([resetPageOn, pageSize, sortOrders]);
	const [shownKey, setShownKey] = useState(resetKey);
	if (shownKey !== resetKey) {
		setShownKey(resetKey);
		setPage(1);
	}

	return { page, setPage, pageSize, setPageSize, sortOrders, setSortOrders };
}
