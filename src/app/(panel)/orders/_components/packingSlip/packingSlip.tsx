"use client";

import { createPortal } from "react-dom";
import Logo from "@/app/_components/common/logo/logo";
import { AdminOrder } from "@/types/order.type";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime, formatPhone } from "@/utils/format";

/**
 * «برگه‌ی ارسال» of the given orders, one A5 page each — drawn into `<body>` and shown only by `@media print`
 * (`tailwind/admin/print.css`), so printing is a plain `window.print()`: the order page keeps its one slip mounted,
 * the queue mounts the chosen ones just for a print run.
 */
export default function PackingSlips({ orders }: { orders: AdminOrder[] }) {
	if (typeof document === "undefined") return null;
	return createPortal(
		<div className="print-slip" aria-hidden>
			{orders.map((o) => (
				<SlipSheet key={o.code} order={o} />
			))}
		</div>,
		document.body,
	);
}

/**
 * The sheet that goes into / onto the parcel: order code, recipient and address, the lines with colour, SKU,
 * quantity and a tick box, the gift message and the shopper's note. Nothing new from the API — just the order.
 */
function SlipSheet({ order: o }: { order: AdminOrder }) {
	const a = o.address;
	const quantity = o.items.reduce((n, i) => n + i.quantity, 0);

	return (
		<section className="ps-sheet">
			<header className="ps-head">
				<Logo />
				<div>
					<h1>برگه‌ی ارسال</h1>
					<p>
						{formatDateTime(o.placedAt)} · {o.shippingMethod.name}
					</p>
				</div>
				<b className="ps-code">{o.code}</b>
			</header>

			<div className="ps-grid">
				<div className="ps-box">
					<small>گیرنده</small>
					<b>{a.recipientName ?? "—"}</b>
					<span className="ltr">{formatPhone(a.recipientPhone)}</span>
				</div>
				<div className="ps-box">
					<small>نشانی</small>
					<span>
						{a.addressLine ? `${a.provinceName}، ${a.cityName}، ${a.addressLine}` : a.fullText}
					</span>
					{a.postalCode && (
						<span>
							کد پستی <b className="ltr">{toPersianDigits(a.postalCode)}</b>
						</span>
					)}
				</div>
			</div>

			{o.shipmentGroup && (
				<p className="ps-note">
					گروه رزرو <b className="ltr">{o.shipmentGroup.code}</b> — این سفارش‌ها با هم در یک بسته می‌روند:{" "}
					<span className="ltr">{o.shipmentGroup.orderCodes.join("، ")}</span>
				</p>
			)}

			<table className="ps-items">
				<thead>
					<tr>
						<th>✓</th>
						<th>کالا</th>
						<th>رنگ</th>
						<th>SKU</th>
						<th>تعداد</th>
					</tr>
				</thead>
				<tbody>
					{o.items.map((it) => (
						<tr key={it.id}>
							<td className="ps-tick" />
							<td>{it.name}</td>
							<td>{it.color.name}</td>
							<td className="ltr">{it.sku ?? "—"}</td>
							<td>{toPersianDigits(it.quantity)}</td>
						</tr>
					))}
				</tbody>
				<tfoot>
					<tr>
						<td colSpan={4}>جمع اقلام</td>
						<td>{toPersianDigits(quantity)}</td>
					</tr>
				</tfoot>
			</table>

			{o.gift?.wrap && (
				<p className="ps-note">
					<b>کادوپیچی</b>
					{o.gift.message && <> — پیام روی کارت: «{o.gift.message}»</>}
				</p>
			)}
			{o.customerNote && (
				<p className="ps-note">
					<b>یادداشت مشتری:</b> {o.customerNote}
				</p>
			)}

			<footer className="ps-foot">
				<span>بسته‌بندی: ................................</span>
				<span>کنترل: ................................</span>
				<span>کیوا — هرچی ببینی، همون می‌رسه</span>
			</footer>
		</section>
	);
}
