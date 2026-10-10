import { Icon } from "@/app/_components/icon/icons";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import { AdminOrder } from "@/types/order.type";
import { formatDateTime, formatPrice, formatToman } from "@/utils/format";
import { PAYMENT_STATUS, PAYMENT_STATUS_TONE, REFUND_METHOD, REFUND_STATUS, REFUND_STATUS_TONE, labelOf } from "@/utils/labels";

const FREE_REASON: Record<string, string> = { THRESHOLD: "خرید بالای سقف", RESERVATION_CONSOLIDATION: "پیوسته به رزرو" };

/** The money of an order: totals (cart formula, FEATURES §3.8), every payment attempt and every refund. */
export default function OrderMoney({ order, onRefund }: { order: AdminOrder; onRefund?: () => void }) {
	const t = order.totals;
	return (
		<section className="icard">
			<h3>
				<Icon name="receipt" /> پرداخت
				{onRefund && (
					<span className="acts">
						<button type="button" className="btn btn-outline btn-sm" onClick={onRefund}>
							<Icon name="refresh" /> استرداد وجه
						</button>
					</span>
				)}
			</h3>
			<div className="sum-mini">
				<div>
					<span>قیمت کالاها</span>
					<span>{formatPrice(t.itemsCompareAtTotal)}</span>
				</div>
				{!!t.productDiscount && (
					<div className="neg">
						<span>تخفیف محصولات</span>
						<span>−{formatPrice(t.productDiscount)}</span>
					</div>
				)}
				{!!t.codeDiscount && (
					<div className="neg">
						<span>
							کد تخفیف <span className="ltr">{t.discountCode}</span>
						</span>
						<span>−{formatPrice(t.codeDiscount)}</span>
					</div>
				)}
				<div>
					<span>هزینه‌ی ارسال ({order.shippingMethod.name})</span>
					<span>{t.shippingCost ? formatPrice(t.shippingCost) : `رایگان${t.shippingFreeReason ? ` — ${FREE_REASON[t.shippingFreeReason] ?? t.shippingFreeReason}` : ""}`}</span>
				</div>
				<div className="t">
					<span>پرداختی</span>
					<span>{formatToman(t.payable)}</span>
				</div>
				{!!t.refunded && (
					<div style={{ color: "var(--danger)" }}>
						<span>برگشت داده‌شده</span>
						<span>−{formatPrice(t.refunded)}</span>
					</div>
				)}
			</div>

			{!!order.payments.length && (
				<>
					<div className="divider" />
					<div className="stack" style={{ gap: 8 }}>
						{order.payments.map((p, i) => (
							<div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, flexWrap: "wrap" }}>
								<StatusTag value={p.status} labels={PAYMENT_STATUS} tones={PAYMENT_STATUS_TONE} />
								<b>{p.gatewayName}</b>
								{p.referenceId && <span className="muted ltr">پیگیری {p.referenceId}</span>}
								{p.cardMask && <span className="muted ltr">{p.cardMask}</span>}
								<span className="muted" style={{ marginInlineStart: "auto" }}>
									{formatDateTime(p.paidAt)}
								</span>
							</div>
						))}
					</div>
				</>
			)}

			{!!order.refunds.length && (
				<>
					<div className="divider" />
					<h4 style={{ fontSize: 13.5, marginBottom: 8 }}>استردادها</h4>
					<div className="stack" style={{ gap: 8 }}>
						{order.refunds.map((r) => (
							<div key={r.id} style={{ display: "grid", gap: 2, fontSize: 13, background: "var(--lilac-50)", borderRadius: 10, padding: "8px 12px" }}>
								<span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
									<b>{formatToman(r.amount)}</b>
									<StatusTag value={r.status} labels={REFUND_STATUS} tones={REFUND_STATUS_TONE} />
									<span className="muted">{labelOf(REFUND_METHOD, r.method)}</span>
								</span>
								<span className="muted">
									{r.reason === "ORDER_CANCELLED" ? "لغو سفارش" : r.reason}
									{r.completedAt ? ` · انجام شد ${formatDateTime(r.completedAt)}` : r.expectedBy ? ` · تا ${formatDateTime(r.expectedBy)}` : ""}
									{r.referenceId ? ` · پیگیری ${r.referenceId}` : ""}
								</span>
							</div>
						))}
					</div>
				</>
			)}
		</section>
	);
}
