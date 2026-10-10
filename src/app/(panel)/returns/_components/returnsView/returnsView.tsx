"use client";

import { useState } from "react";
import Link from "next/link";
import classNames from "classnames";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import Button from "@/app/_components/ui/button/button";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { ReturnStatus } from "@/types/order.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime, formatToman, relativeTime } from "@/utils/format";
import { KIVA_FAULT_REASONS, labelOf, REFUND_METHOD, RETURN_REASON, RETURN_STATUS, RETURN_STATUS_TONE } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { AdminReturn, ReturnsEndpoints } from "../../_api/returnsEndpoints";
import { ERROR_BEHAVIOUR } from "../../_utils/apiError";
import DecisionModal from "../decisionModal/decisionModal";

const TABS: { value: ReturnStatus | ""; label: string }[] = [
	{ value: "REQUESTED", label: "منتظر تصمیم" },
	{ value: "APPROVED", label: "تأیید شده" },
	{ value: "RECEIVED", label: "دریافت شده" },
	{ value: "REFUNDED", label: "وجه برگشت داده شد" },
	{ value: "REJECTED", label: "رد شده" },
	{ value: "", label: "همه" },
];

/** `/returns` — the return requests (FEATURES §3.6): decide on the new ones; the later steps have no endpoint yet (§7 #8). */
export default function ReturnsView() {
	const [f, setF] = useUrlFilters({ status: "REQUESTED" });
	const status = f.status as ReturnStatus | "";
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [status] });
	const [deciding, setDeciding] = useState<AdminReturn | null>(null);

	const list = useQuery({
		queryKey: ["returns", "list", { status, page, pageSize }],
		queryFn: () => withMappedError(() => ReturnsEndpoints.getReturns(status, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const columns: Column<AdminReturn>[] = [
		{ key: "code", title: "مرجوعی", className: "nowrap", render: (r) => <span className="code">{r.code}</span> },
		{
			key: "order",
			title: "سفارش",
			className: "nowrap",
			render: (r) => (
				<Link className="code" href={`/orders/${encodeURIComponent(r.orderCode)}`} style={{ color: "var(--purple)" }}>
					{r.orderCode}
				</Link>
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
			render: (r) => (r.refund ? `${formatToman(r.refund.amount)} · ${labelOf(REFUND_METHOD, r.refund.method)}` : <span className="muted">—</span>),
		},
		{
			key: "status",
			title: "وضعیت",
			className: "nowrap",
			render: (r) => (
				<>
					<StatusTag value={r.status} labels={RETURN_STATUS} tones={RETURN_STATUS_TONE} />
					{r.shippingPaidBy && <span className="sub">هزینه‌ی برگشت: {r.shippingPaidBy === "KIVA" ? "کیوا" : "مشتری"}</span>}
					{r.rejectionReason && <span className="sub">{r.rejectionReason}</span>}
				</>
			),
		},
		{
			key: "acts",
			title: "",
			className: "end",
			render: (r) =>
				r.status === "REQUESTED" ? (
					<Button size="sm" onClick={() => setDeciding(r)}>
						بررسی و تصمیم
					</Button>
				) : null,
		},
	];

	const listError = toErrorView(ERROR_BEHAVIOUR, list.error, "دریافت مرجوعی‌ها با خطا مواجه شد.");

	return (
		<>
			<PageHead title="مرجوعی‌ها" subtitle="درخواست‌های بازگشت تا ۷ روز بعد از تحویل؛ تأیید یا رد، و اینکه هزینه‌ی برگشت با کیه." />

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

			<p className="note" style={{ marginTop: 14 }}>
				ادامه‌ی چرخه (زمان‌بندی ارسال، دریافت در انبار، بستن) در کانترکت endpoint ندارد؛ وضعیت سفارش را از صفحه‌ی سفارش به «مرجوع شد» و بعد «وجه برگشت داده شد» ببر و
				استرداد را همان‌جا ثبت کن.
			</p>

			<DecisionModal item={deciding} onClose={() => setDeciding(null)} />
		</>
	);
}
