import { Icon } from "@/app/_components/icon/icons";
import { PageMeta } from "@/types/pageinate";
import { toPersianDigits } from "@/utils/digits";

const SIZES = [10, 20, 50, 100];

/** Page numbers around the current one, with the first and last always there: 1 … 4 5 [6] 7 8 … 20. */
function pagesAround(page: number, total: number): (number | "gap")[] {
	const out: (number | "gap")[] = [];
	for (let p = 1; p <= total; p += 1) {
		if (p === 1 || p === total || Math.abs(p - page) <= 2) out.push(p);
		else if (out[out.length - 1] !== "gap") out.push("gap");
	}
	return out;
}

type TableFooterProps = {
	meta: PageMeta;
	onPage: (page: number) => void;
	/** Raw `setPageSize` of `useTableState`; no select when omitted. */
	onPageSize?: (size: number) => void;
	disabled?: boolean;
};

/** `.tbl-foot` — «۲۱ تا ۴۰ از ۱۲۳», rows-per-page and the round pager of the design (`.pager`). */
export default function TableFooter({ meta, onPage, onPageSize, disabled = false }: TableFooterProps) {
	if (!meta.totalItems) return null;
	const from = (meta.page - 1) * meta.size + 1;
	const to = Math.min(meta.totalItems, meta.page * meta.size);

	return (
		<div className="tbl-foot">
			<span>
				{toPersianDigits(from)} تا {toPersianDigits(to)} از {toPersianDigits(meta.totalItems)}
			</span>
			{onPageSize && (
				<label className="size-sel">
					ردیف در صفحه
					<select className="select" value={meta.size} disabled={disabled} onChange={(e) => onPageSize(Number(e.target.value))}>
						{SIZES.map((s) => (
							<option key={s} value={s}>
								{toPersianDigits(s)}
							</option>
						))}
					</select>
				</label>
			)}
			{meta.totalPages > 1 && (
				<nav className="pager bo-pager" aria-label="صفحه‌ها">
					<button type="button" aria-label="صفحه‌ی قبل" disabled={disabled || meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
						<Icon name="right" />
					</button>
					{pagesAround(meta.page, meta.totalPages).map((p, i) =>
						p === "gap" ? (
							<span key={`gap${i}`} className="gap">
								…
							</span>
						) : (
							<button
								key={p}
								type="button"
								className={p === meta.page ? "on" : undefined}
								aria-current={p === meta.page ? "page" : undefined}
								disabled={disabled}
								onClick={() => onPage(p)}
							>
								{toPersianDigits(p)}
							</button>
						),
					)}
					<button type="button" aria-label="صفحه‌ی بعد" disabled={disabled || !meta.hasNext} onClick={() => onPage(meta.page + 1)}>
						<Icon name="left" />
					</button>
				</nav>
			)}
		</div>
	);
}
