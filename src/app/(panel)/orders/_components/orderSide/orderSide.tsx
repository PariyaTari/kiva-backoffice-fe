import Link from "next/link";
import { Icon } from "@/app/_components/icon/icons";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import { AdminOrder } from "@/types/order.type";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime, formatPhone, relativeTime } from "@/utils/format";
import { RETURN_REASON, RETURN_STATUS, RETURN_STATUS_TONE, labelOf } from "@/utils/labels";

/** The side column of an order: who, where, how it travels, its reservation group and its returns. */
type OrderSideProps = {
	order: AdminOrder;
	/** «ثبت استرداد» of a return that reached the warehouse — ADMIN only. */
	onRefundReturn?: (returnId: number) => void;
};

export default function OrderSide({ order, onRefundReturn }: OrderSideProps) {
	const c = order.customer;
	const s = order.shipment;
	const g = order.shipmentGroup;

	return (
		<>
			<section className="icard">
				<h3>
					<Icon name="user" /> مشتری
				</h3>
				<dl className="kv">
					<dt>نام</dt>
					<dd>{c.fullName}</dd>
					<dt>موبایل</dt>
					<dd className="ltr">{formatPhone(c.phone)}</dd>
					<dt>سفارش‌ها</dt>
					<dd>
						<Link href={`/orders?q=${c.phone}`} style={{ color: "var(--purple)" }}>
							{toPersianDigits(c.ordersCount)} سفارش
						</Link>
					</dd>
				</dl>
				{order.customerNote && <p className="note cream" style={{ marginTop: 12 }}>یادداشت مشتری: {order.customerNote}</p>}
			</section>

			<section className="icard">
				<h3>
					<Icon name="pin" /> گیرنده
				</h3>
				<dl className="kv">
					<dt>نام</dt>
					<dd>{order.address.recipientName}</dd>
					<dt>موبایل</dt>
					<dd className="ltr">{formatPhone(order.address.recipientPhone)}</dd>
					<dt>کد پستی</dt>
					<dd className="ltr">{toPersianDigits(order.address.postalCode)}</dd>
				</dl>
				<p style={{ fontSize: 13.5, marginTop: 8, lineHeight: 2 }}>{order.address.fullText}</p>
			</section>

			<section className="icard">
				<h3>
					<Icon name="truck" /> ارسال
				</h3>
				<dl className="kv">
					<dt>روش</dt>
					<dd>{s.carrierName}</dd>
					<dt>کد رهگیری</dt>
					<dd className="ltr">{s.trackingCode ? (s.trackingUrl ? <a href={s.trackingUrl} target="_blank" rel="noreferrer">{s.trackingCode}</a> : s.trackingCode) : "—"}</dd>
					<dt>ارسال</dt>
					<dd>{formatDateTime(s.shippedAt)}</dd>
					<dt>تحویل</dt>
					<dd>{formatDateTime(s.deliveredAt)}</dd>
				</dl>
			</section>

			{g && (
				<section className="icard">
					<h3>
						<Icon name="timer" /> گروه رزرو <span className="ltr">{g.code}</span>
					</h3>
					<p style={{ fontSize: 13, marginBottom: 10 }}>
						آزادسازی خودکار <b>{formatDateTime(g.releaseAt)}</b> ({relativeTime(g.releaseAt)}). همه‌ی سفارش‌های گروه با یک کد رهگیری ارسال می‌شوند.
					</p>
					<div className="grp">
						{g.orderCodes.map((code) => (
							<Link key={code} href={`/orders/${encodeURIComponent(code)}`} className={code === order.code ? "me" : undefined}>
								{code}
							</Link>
						))}
					</div>
				</section>
			)}

			{!!order.returns.length && (
				<section className="icard">
					<h3>
						<Icon name="swap" /> مرجوعی
					</h3>
					<div className="stack" style={{ gap: 10 }}>
						{order.returns.map((r) => (
							<div key={r.id} style={{ display: "grid", gap: 4, fontSize: 13 }}>
								<Link href={`/returns?status=${r.status}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
									<b className="ltr">{r.code}</b>
									<StatusTag value={r.status} labels={RETURN_STATUS} tones={RETURN_STATUS_TONE} />
								</Link>
								<span className="muted">
									{labelOf(RETURN_REASON, r.reason)} · {formatDateTime(r.createdAt)}
									{r.closeReason && ` · ${r.closeReason}`}
								</span>
								{onRefundReturn && r.allowedTransitions.includes("REFUNDED") && (
									<button type="button" className="btn btn-outline btn-sm" style={{ justifySelf: "start" }} onClick={() => onRefundReturn(r.id)}>
										ثبت استرداد این مرجوعی
									</button>
								)}
							</div>
						))}
					</div>
				</section>
			)}
		</>
	);
}
