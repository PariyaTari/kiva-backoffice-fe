import { Icon } from "@/app/_components/icon/icons";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import { AdminOrder, Refund } from "@/types/order.type";
import { formatDateTime, formatPrice, formatToman } from "@/utils/format";
import { PAYMENT_STATUS, PAYMENT_STATUS_TONE, REFUND_METHOD, REFUND_STATUS, REFUND_STATUS_TONE, labelOf } from "@/utils/labels";
import { isRefundOpen } from "../refundTrackModal/refundTrackModal";

const FREE_REASON: Record<string, string> = { THRESHOLD: "خرید بالای سقف", RESERVATION_CONSOLIDATION: "پیوسته به رزرو" };

/** The money of an order: totals (cart formula, FEATURES §3.8), every payment attempt and every refund. */
type OrderMoneyProps = {
	order: AdminOrder;
	/** «استرداد وجه» — ADMIN only. */
	onRefund?: () => void;
	/** «پیگیری» of an open refund (`PATCH /admin/refunds/{id}`) — ADMIN only. */
	onTrackRefund?: (refund: Refund) => void;
};

export default function OrderMoney({ order, onRefund, onTrackRefund }: OrderMoneyProps) {
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
			{!!t.balanceDue && (
				<p className="note cream due">
					<Icon name="wallet" />
					<span>
						<b>مانده‌ی پرداخت مشتری: {formatToman(t.balanceDue)}</b> — بعد از درخواست تغییر به رنگ/مدل گران‌تر. مشتری از حساب کاربری‌اش می‌پردازد و تا
						صفر نشود سفارش ارسال نمی‌شود.
					</span>
				</p>
			)}

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
							<div key={r.id} className="refund-row">
								<span className="h">
									<b>{formatToman(r.amount)}</b>
									<StatusTag value={r.status} labels={REFUND_STATUS} tones={REFUND_STATUS_TONE} />
									<span className="muted">{labelOf(REFUND_METHOD, r.method)}</span>
									{onTrackRefund && isRefundOpen(r) && (
										<button type="button" className="btn btn-outline btn-sm" onClick={() => onTrackRefund(r)}>
											پیگیری
										</button>
									)}
								</span>
								<span className="muted">
									{r.reason === "ORDER_CANCELLED" ? "لغو سفارش" : r.reason}
									{r.returnId != null && !r.reason?.includes(order.returns.find((x) => x.id === r.returnId)?.code ?? "#") && ` · مرجوعی ${order.returns.find((x) => x.id === r.returnId)?.code ?? `#${r.returnId}`}`}
									{r.createdAt && ` · ثبت ${formatDateTime(r.createdAt)}`}
									{r.completedAt ? ` · انجام شد ${formatDateTime(r.completedAt)}` : r.expectedBy && r.status !== "FAILED" ? ` · تا ${formatDateTime(r.expectedBy)}` : ""}
									{r.referenceId ? ` · پیگیری ${r.referenceId}` : ""}
								</span>
								{r.statusNote && <span className="note-line">«{r.statusNote}»</span>}
							</div>
						))}
					</div>
				</>
			)}
		</section>
	);
}
