import { ReactNode } from "react";

export type Column<T> = {
	key: string;
	title: ReactNode;
	render: (row: T, index: number) => ReactNode;
	/** `nowrap`, `end` (left-aligned numbers / actions), … on both the header and the cells. */
	className?: string;
	width?: number | string;
};

export type DataTableProps<T> = {
	columns: Column<T>[];
	rows: T[];
	rowKey: (row: T, index: number) => string | number;
	/** Makes rows clickable (opens the detail page) — clicks on links/buttons inside a row stay theirs. */
	onRowClick?: (row: T) => void;
	/** `isFetching` of the list query — fades the rows while new ones load. */
	loading?: boolean;
	/** Shown instead of rows when there are none (default «موردی پیدا نشد»). */
	empty?: ReactNode;
	/** Pager row (`TableFooter`). */
	footer?: ReactNode;
	caption?: string;
};
