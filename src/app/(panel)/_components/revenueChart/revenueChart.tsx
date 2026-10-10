"use client";

import { useState } from "react";
import { AdminReportOverview } from "@/types/settings.type";
import { toPersianDigits } from "@/utils/digits";
import { formatDate, formatPrice } from "@/utils/format";

type Day = AdminReportOverview["dailySeries"][number];

/** «۱٫۲ م» / «۸۵۰ ه» — short Toman for the axis. */
const short = (n: number) => (n >= 1e6 ? `${toPersianDigits((n / 1e6).toFixed(n >= 1e7 ? 0 : 1))} م` : n >= 1e3 ? `${toPersianDigits(Math.round(n / 1e3))} ه` : toPersianDigits(n));
const day = (iso: string) => formatDate(`${iso}T12:00:00+03:30`, { month: "short", day: "numeric" });

/**
 * Daily revenue as one series of bars (single hue, the title names it — no legend). Orders are a different scale,
 * so they are not a second axis: they ride in the hover tooltip and the table view.
 */
export default function RevenueChart({ series }: { series: Day[] }) {
	const [hover, setHover] = useState<number | null>(null);
	const [table, setTable] = useState(false);
	const max = Math.max(1, ...series.map((d) => d.revenue));
	// three recessive gridlines at round-ish values
	const ticks = [max, max / 2, 0];
	const labelEvery = Math.max(1, Math.ceil(series.length / 6));
	const h = hover !== null ? series[hover] : null;

	return (
		<div>
			<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
				<button type="button" className="btn btn-link" style={{ fontSize: 12.5 }} onClick={() => setTable((t) => !t)} aria-pressed={table}>
					{table ? "نمایش نمودار" : "نمایش جدول"}
				</button>
			</div>
			{table ? (
				<div className="tbl-scroll" style={{ maxHeight: 260, overflowY: "auto" }}>
					<table className="tbl">
						<thead>
							<tr>
								<th>روز</th>
								<th>فروش (تومان)</th>
								<th>سفارش</th>
							</tr>
						</thead>
						<tbody>
							{series.map((d) => (
								<tr key={d.date}>
									<td className="nowrap">{day(d.date)}</td>
									<td>{formatPrice(d.revenue)}</td>
									<td>{toPersianDigits(d.orders)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div style={{ position: "relative", display: "grid", gridTemplateColumns: "44px 1fr", gap: 8 }}>
					<div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 180, fontSize: 11, color: "var(--ink-50)", textAlign: "left" }}>
						{ticks.map((t, i) => (
							<span key={i}>{short(t)}</span>
						))}
					</div>
					<div style={{ position: "relative" }}>
						{/* recessive gridlines */}
						{ticks.map((_, i) => (
							<span key={i} aria-hidden style={{ position: "absolute", insetInline: 0, top: `${(i / 2) * 100}%`, borderTop: "1px solid var(--line)", height: 0 }} />
						))}
						<div className="chart" role="img" aria-label="فروش روزانه" onMouseLeave={() => setHover(null)} style={{ gap: 2, position: "relative" }}>
							{series.map((d, i) => (
								// the hit target is the whole column, not just the bar
								<span
									key={d.date}
									onMouseEnter={() => setHover(i)}
									onFocus={() => setHover(i)}
									tabIndex={0}
									aria-label={`${day(d.date)}: ${formatPrice(d.revenue)} تومان، ${toPersianDigits(d.orders)} سفارش`}
									style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", cursor: "default", outline: "none" }}
								>
									<i
										className="b"
										style={{
											display: "block",
											width: "100%",
											height: `${Math.max(d.revenue ? 2 : 0, (d.revenue / max) * 100)}%`,
											borderRadius: "4px 4px 0 0",
											background: hover === i ? "var(--purple)" : "var(--lilac)",
										}}
									/>
								</span>
							))}
						</div>
						<div className="chart-x">
							{series.map((d, i) => (i % labelEvery === 0 || i === series.length - 1 ? <span key={d.date}>{day(d.date)}</span> : null))}
						</div>
						{h && (
							<div
								role="status"
								style={{
									position: "absolute",
									top: 0,
									[(hover ?? 0) > series.length / 2 ? "left" : "right"]: 0,
									background: "var(--ink)",
									color: "#fff",
									borderRadius: 10,
									padding: "6px 10px",
									fontSize: 12,
									pointerEvents: "none",
									boxShadow: "var(--shadow)",
								}}
							>
								<b>{day(h.date)}</b>
								<div>{formatPrice(h.revenue)} تومان</div>
								<div>{toPersianDigits(h.orders)} سفارش</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
