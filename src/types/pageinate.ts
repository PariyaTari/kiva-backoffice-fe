/** Paging info the backend returns next to `items` in every list response (`PageMeta`). */
export type PageMeta = {
	page: number;
	size: number;
	totalItems: number;
	totalPages: number;
	hasNext: boolean;
};

/** A paginated list body: `{ items, meta }`. Lists may add their own extra fields alongside. */
export type Paginate<T> = {
	items: T[];
	meta: PageMeta;
};

/** `page` is 1-based. */
export type PaginationParams = {
	page: number;
	size: number;
};
