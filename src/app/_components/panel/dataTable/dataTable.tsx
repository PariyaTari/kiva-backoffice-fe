import { ReactNode } from "react";
import classNames from "classnames";
import { Icon } from "@/app/_components/icon/icons";
import { DataTableProps } from "./dataTable.type";

/**
 * `.tbl` — markup only: columns render cells from a row. It never fetches; the page passes rows from its own
 * `useQuery` and the `isFetching` flag (`loading` fades the body while a new page arrives).
 */
export default function DataTable<T>({ columns, rows, rowKey, onRowClick, loading = false, empty, footer, caption }: DataTableProps<T>) {
	return (
		<div className="tbl-wrap">
			<div className="tbl-scroll">
				<table className={classNames("tbl", { loading })} aria-busy={loading || undefined}>
					{caption && <caption className="sr-only">{caption}</caption>}
					<thead>
						<tr>
							{columns.map((c) => (
								<th key={c.key} className={c.className} style={c.width ? { width: c.width } : undefined}>
									{c.title}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row, i) => (
							<tr
								key={rowKey(row, i)}
								className={classNames({ link: !!onRowClick })}
								// a click on the row's own controls (links, buttons, inputs) is theirs, not the row's
								onClick={onRowClick ? (e) => !(e.target as HTMLElement).closest("a,button,input,select,label") && onRowClick(row) : undefined}
							>
								{columns.map((c) => (
									<td key={c.key} className={c.className}>
										{c.render(row, i)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{!rows.length && (empty ?? <TableEmpty title="موردی پیدا نشد" />)}
			{footer}
		</div>
	);
}

/** The «nothing here» block under an empty table. */
export function TableEmpty({ icon = "search", title, text, action }: { icon?: string; title: string; text?: ReactNode; action?: ReactNode }) {
	return (
		<div className="tbl-empty">
			<span className="ei">
				<Icon name={icon} />
			</span>
			<b>{title}</b>
			{text && <span>{text}</span>}
			{action}
		</div>
	);
}
