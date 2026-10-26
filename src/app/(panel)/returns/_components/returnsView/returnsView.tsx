"use client";

import { useState } from "react";
import Link from "next/link";
import classNames from "classnames";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import Button from "@/app/_components/ui/button/button";
import { useCan } from "@/hooks/useCan";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { AdminReturnRequest, AdminReturnSort, ReturnStatus } from "@/types/order.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { DELETED_ACCOUNT, formatDateTime, formatPhone, formatToman, relativeTime } from "@/utils/format";
import { KIVA_FAULT_REASONS, labelOf, optionsOf, ORDER_SORT, REFUND_METHOD, REFUND_STATUS, RETURN_REASON, RETURN_STATUS, RETURN_STATUS_TONE } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ReturnsEndpoints } from "../../_api/returnsEndpoints";
import { ERROR_BEHAVIOUR } from "../../_utils/apiError";
import DecisionModal from "../decisionModal/decisionModal";
import { CloseModal, PickupModal, ReceiptModal } from "../returnStepModals/returnStepModals";

/** The cycle in working order (contract §4), then the ends. */
const TABS: { value: ReturnStatus | ""; label: string }[] = [
	{ value: "REQUESTED", label: "منتظر تصمیم" },
	{ value: "APPROVED", label: "تأیید شده" },
	{ value: "PICKUP_SCHEDULED", label: "در حال جمع‌آوری" },
	{ value: "RECEIVED", label: "رسیده به انبار" },
	{ value: "REFUNDED", label: "وجه برگشت داده شد" },
	{ value: "CLOSED", label: "بسته شده" },
	{ value: "REJECTED", label: "رد شده" },
	{ value: "", label: "همه" },
];

type Step = "decide" | "pickup" | "receipt" | "close";

/**
 * `/returns` — the whole return cycle (FEATURES §3.6, contract §4): decide → (Kiva collects the parcel) → it reaches
 * the warehouse → refund (ADMIN, on the order page) or close without one. Each row offers only the server's
 * `allowedTransitions`.
 */
export default function ReturnsView() {
	const can = useCan();
	const [f, setF] = useUrlFilters({ status: "REQUESTED", sort: "newest" });
	const status = f.status as ReturnStatus | "";
	const sort: AdminReturnSort = f.sort === "oldest" ? "oldest" : "newest";
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [status, sort] });
	const [open, setOpen] = useState<{ step: Step; item: AdminReturnRequest } | null>(null);
	const itemFor = (step: Step) => (open?.step === step ? open.item : null);
	const close = () => setOpen(null);

	const list = useQuery({
		queryKey: ["returns", "list", { status, sort, page, pageSize }],
		queryFn: () => withMappedError(() => ReturnsEndpoints.getReturns(status, sort, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const columns: Column<AdminReturnRequest>[] = [
		{ key: "code", title: "مرجوعی", className: "nowrap", render: (r) => <span className="code">{r.code}</span> },
		{
			key: "order",
			title: "سفارش و مشتری",
			className: "nowrap",
			render: (r) => (
				<>
					<Link className="code" href={`/orders/${encodeURIComponent(r.orderCode)}`} style={{ color: "var(--purple)" }}>
						{r.orderCode}
					</Link>
					<span className="sub">
						{r.customer.phone ? (
							<>
								{can("support") ? <Link href={`/customers/${r.customer.id}`}>{r.customer.fullName || "بدون نام"}</Link> : (r.customer.fullName ?? "—")} ·{" "}
								<span className="ltr">{formatPhone(r.customer.phone)}</span>
							</>
						) : (
							DELETED_ACCOUNT
						)}
					</span>
				</>
			),
		},
		{
			key: "createdAt",
			title: "درخواست",
			className: "nowrap",
			render: (r) => (
				<>
					{formatDateTime(r.createdAt)}
					<span className="sub">{relativeTime(r.createdAt)}</span>
				</>
			),
		},
		{
			key: "reason",
			title: "دلیل",
			render: (r) => (
				<>
					{labelOf(RETURN_REASON, r.reason)}
					{KIVA_FAULT_REASONS.includes(r.reason) && <span className="sub" style={{ color: "var(--warn)" }}>مشکل از کیوا</span>}
				</>
			),
		},
		{
			key: "items",
			title: "کالا",
			render: (r) => r.items.map((i) => `${i.name} (${i.color.name})${i.quantity > 1 ? ` × ${toPersianDigits(i.quantity)}` : ""}`).join("، "),
		},
		{
			key: "refund",
			title: "برگشت پول",
			className: "nowrap",
			render: (r) => (
				<>
					{r.refund ? `${formatToman(r.refund.amount)} · ${labelOf(REFUND_STATUS, r.refund.status)}` : labelOf(REFUND_METHOD, r.refundMethod)}
					{r.refund?.statusNote && <span className="sub">{r.refund.statusNote}</span>}
					{!r.refund && r.suggestedRefund != null && <span className="sub">پیشنهاد استرداد {formatToman(r.suggestedRefund)}</span>}
				</>
			),
		},
		{
			key: "status",
			title: "وضعیت",
			render: (r) => (
				<>
					<StatusTag value={r.status} labels={RETURN_STATUS} tones={RETURN_STATUS_TONE} />
					{r.shippingPaidBy && r.status === "APPROVED" && <span className="sub">هزینه‌ی برگشت: {r.shippingPaidBy === "KIVA" ? "کیوا" : "مشتری"}</span>}
					{r.pickup && r.status === "PICKUP_SCHEDULED" && (
						<span className="sub">
							{r.pickup.carrierName}
							{r.pickup.scheduledFor && ` · ${formatDateTime(r.pickup.scheduledFor)}`}
							{r.pickup.trackingCode && <span className="ltr"> · {r.pickup.trackingCode}</span>}
						</span>
					)}
					{r.receivedAt && r.status === "RECEIVED" && (
						<span className="sub">
							رسید {formatDateTime(r.receivedAt)}
							{r.receipt && ` · برگشت به فروش ${toPersianDigits(r.receipt.items.reduce((n, i) => n + i.restockQuantity, 0))}`}
						</span>
					)}
					{r.rejectionReason && r.status === "REJECTED" && <span className="sub">{r.rejectionReason}</span>}
					{r.closeReason && r.status === "CLOSED" && <span className="sub">{r.closeReason}</span>}
				</>
			),
		},
		{
			key: "acts",
			title: "",
			className: "end",
			render: (r) => {
				const next = r.allowedTransitions;
				return (
					<span className="row-acts">
						{r.status === "REQUESTED" && (
							<Button size="sm" onClick={() => setOpen({ step: "decide", item: r })}>
								بررسی و تصمیم
							</Button>
						)}
						{next.includes("PICKUP_SCHEDULED") && (
							<Button size="sm" variant="white" onClick={() => setOpen({ step: "pickup", item: r })} iconStart={<Icon name="truck" />}>
								{r.pickup ? "تغییر جمع‌آوری" : "جمع‌آوری"}
							</Button>
						)}
						{next.includes("RECEIVED") && (
							<Button size="sm" onClick={() => setOpen({ step: "receipt", item: r })} iconStart={<Icon name="box" />}>
								رسید به انبار
							</Button>
						)}
						{next.includes("REFUNDED") && can("refunds") && (
							<Button size="sm" href={`/orders/${encodeURIComponent(r.orderCode)}?refund=${r.id}`} iconStart={<Icon name="wallet" />}>
								ثبت استرداد
							</Button>
						)}
						{next.includes("REFUNDED") && !can("refunds") && <span className="sub">منتظر استرداد (مدیر کل)</span>}
						{r.status === "RECEIVED" && !next.length && <span className="sub">منتظر نتیجه‌ی استرداد</span>}
						{next.includes("CLOSED") && (
							<button type="button" className="btn btn-link btn-sm" style={{ color: "var(--danger)" }} onClick={() => setOpen({ step: "close", item: r })}>
								بستن بدون استرداد
							</button>
						)}
					</span>
				);
			},
		},
	];

	const listError = toErrorView(ERROR_BEHAVIOUR, list.error, "دریافت مرجوعی‌ها با خطا مواجه شد.");

	return (
		<>
			<PageHead title="مرجوعی‌ها" subtitle="درخواست‌های بازگشت تا ۷ روز بعد از تحویل: تصمیم، جمع‌آوری مرسوله، رسیدن به انبار، استرداد یا بستن." />

			<div className="fbar">
				<select className="select" aria-label="ترتیب" value={sort} onChange={(e) => setF({ sort: e.target.value as AdminReturnSort })}>
					{optionsOf(ORDER_SORT).map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				{sort === "oldest" && <span className="muted" style={{ fontSize: 12.5 }}>مرجوعی بستن خودکار ندارد؛ قدیمی‌ها اول، تا مرسوله‌های نرسیده دیده شوند.</span>}
			</div>

			<div className="tabs bo-tabs" role="tablist">
				{TABS.map((t) => (
					<button key={t.value || "all"} type="button" role="tab" aria-selected={t.value === status} className={classNames({ on: t.value === status })} onClick={() => setF({ status: t.value })}>
						{t.label}
					</button>
				))}
			</div>

			{list.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!listError ? (
				<ErrorComponent retryable={listError.retryable} ticketAble={listError.ticketAble} errorText={listError.errorText} executeFunction={() => list.refetch()} loading={list.isFetching} />
			) : !list.error && !!list.data ? (
				<DataTable
					caption="مرجوعی‌ها"
					columns={columns}
					rows={list.data.items}
					rowKey={(r) => r.id}
					loading={list.isFetching}
					empty={<TableEmpty icon="swap" title={status === "REQUESTED" ? "درخواست تازه‌ای نیست" : "مرجوعی‌ای پیدا نشد"} />}
					footer={<TableFooter meta={list.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={list.isFetching} />}
				/>
			) : null}

			<DecisionModal item={itemFor("decide")} onClose={close} />
			<PickupModal item={itemFor("pickup")} onClose={close} />
			<ReceiptModal item={itemFor("receipt")} onClose={close} />
			<CloseModal item={itemFor("close")} onClose={close} />
		</>
	);
}
