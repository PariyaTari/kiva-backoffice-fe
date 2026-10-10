"use client";

import { useState } from "react";
import classNames from "classnames";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import ConfirmModal from "@/app/_components/panel/confirmModal/confirmModal";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { toast } from "@/store/notification.store";
import { DiscountCode } from "@/types/marketing.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatPrice, formatToman } from "@/utils/format";
import { PERIOD_LABEL, PERIOD_TONE, periodState, periodText } from "@/utils/period";
import { withMappedError } from "@/utils/withMappedError";
import { DiscountsEndpoints } from "../../_api/discountsEndpoints";
import DiscountModal from "../discountModal/discountModal";

const TABS = [
	{ value: "", label: "همه" },
	{ value: "true", label: "فعال" },
	{ value: "false", label: "غیرفعال" },
];

/** Conditions of a code as short chips. */
function conditionsOf(d: DiscountCode): string[] {
	const out: string[] = [];
	if (d.minSubtotal) out.push(`حداقل ${formatPrice(d.minSubtotal)}`);
	if (d.firstOrderOnly) out.push("خرید اول");
	if (d.requiresLogin) out.push("فقط با ورود");
	if (d.excludeSaleItems) out.push("بدون حراجی‌ها");
	if (d.categoryIds?.length) out.push(`${toPersianDigits(d.categoryIds.length)} دسته`);
	if (d.productIds?.length) out.push(`${toPersianDigits(d.productIds.length)} محصول`);
	return out;
}

/** `/discount-codes` (ADMIN) — every code with its conditions, period and usage (`usedCount`, `totalDiscountGiven`). */
export default function DiscountsView() {
	const queryClient = useQueryClient();
	const [f, setF] = useUrlFilters({ active: "" });
	const active = f.active === "" ? null : f.active === "true";
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [active] });
	const [editing, setEditing] = useState<{ code: DiscountCode | null } | null>(null);
	const [deactivating, setDeactivating] = useState<DiscountCode | null>(null);

	const codes = useQuery({
		queryKey: ["discounts", "list", { active, page, pageSize }],
		queryFn: () => withMappedError(() => DiscountsEndpoints.getCodes(active, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const deactivate = useMutation({
		mutationFn: (d: DiscountCode) => withMappedError(() => DiscountsEndpoints.deactivate(d.id)),
		meta: { showNotification: true },
		onSuccess: (_, d) => {
			toast(`کد ${d.code} غیرفعال شد`, { icon: "check" });
			setDeactivating(null);
			queryClient.invalidateQueries({ queryKey: ["discounts"] });
		},
	});

	const columns: Column<DiscountCode>[] = [
		{
			key: "code",
			title: "کد",
			render: (d) => (
				<>
					<span className="code">{d.code}</span>
					<span className="sub">{d.label}</span>
				</>
			),
		},
		{
			key: "value",
			title: "تخفیف",
			className: "nowrap",
			render: (d) =>
				d.type === "PERCENT" ? (
					<>
						{toPersianDigits(d.value)}٪{d.maxDiscount ? <span className="sub">سقف {formatPrice(d.maxDiscount)}</span> : null}
					</>
				) : (
					formatToman(d.value)
				),
		},
		{
			key: "conditions",
			title: "شرط‌ها",
			render: (d) => {
				const list = conditionsOf(d);
				return list.length ? (
					<span className="chip-row">
						{list.map((c) => (
							<Badge key={c}>{c}</Badge>
						))}
					</span>
				) : (
					<span className="muted">بدون شرط</span>
				);
			},
		},
		{
			key: "usage",
			title: "استفاده",
			className: "nowrap",
			render: (d) => (
				<>
					{toPersianDigits(d.usedCount)}
					{d.usageLimit ? ` از ${toPersianDigits(d.usageLimit)}` : ""}
					<span className="sub">{formatToman(d.totalDiscountGiven)}</span>
				</>
			),
		},
		{
			key: "period",
			title: "زمان",
			render: (d) => {
				const state = periodState(d.startsAt, d.endsAt);
				return (
					<>
						<Badge tone={PERIOD_TONE[state]}>{PERIOD_LABEL[state]}</Badge>
						<span className="sub">{periodText(d.startsAt, d.endsAt)}</span>
					</>
				);
			},
		},
		{ key: "active", title: "وضعیت", className: "nowrap", render: (d) => (d.isActive ? <Badge tone="SUCCESS">فعال</Badge> : <Badge>غیرفعال</Badge>) },
		{
			key: "acts",
			title: "",
			className: "end",
			render: (d) => (
				<span className="row-acts">
					<button type="button" className="icon-btn" aria-label="ویرایش" title="ویرایش" onClick={() => setEditing({ code: d })}>
						<Icon name="edit" />
					</button>
					{d.isActive && (
						<button type="button" className="icon-btn del" aria-label="غیرفعال کردن" title="غیرفعال کردن" onClick={() => setDeactivating(d)}>
							<Icon name="ban" />
						</button>
					)}
				</span>
			),
		},
	];

	const codesError = toErrorView(ERROR_BEHAVIOUR, codes.error, "دریافت کدهای تخفیف با خطا مواجه شد.");

	return (
		<>
			<PageHead
				title="کدهای تخفیف"
				subtitle="هر کد با شرط‌هایش؛ «حذف» یعنی غیرفعال شدن و آمارش می‌ماند."
				actions={
					<Button size="sm" onClick={() => setEditing({ code: null })} iconStart={<Icon name="plus" />}>
						کد جدید
					</Button>
				}
			/>
			<div className="tabs bo-tabs" role="tablist">
				{TABS.map((t) => (
					<button key={t.value || "all"} type="button" role="tab" aria-selected={f.active === t.value} className={classNames({ on: f.active === t.value })} onClick={() => setF({ active: t.value })}>
						{t.label}
					</button>
				))}
			</div>
			{codes.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!codesError ? (
				<ErrorComponent retryable={codesError.retryable} ticketAble={codesError.ticketAble} errorText={codesError.errorText} executeFunction={() => codes.refetch()} loading={codes.isFetching} />
			) : !codes.error && !!codes.data ? (
				<DataTable
					caption="کدهای تخفیف"
					columns={columns}
					rows={codes.data.items}
					rowKey={(d) => d.id}
					loading={codes.isFetching}
					empty={<TableEmpty icon="tag" title="کدی نیست" />}
					footer={<TableFooter meta={codes.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={codes.isFetching} />}
				/>
			) : null}

			<DiscountModal key={editing?.code?.id ?? "new"} code={editing?.code ?? null} open={!!editing} onClose={() => setEditing(null)} />
			<ConfirmModal
				open={!!deactivating}
				onClose={() => setDeactivating(null)}
				tone="danger"
				icon="ban"
				title="غیرفعال کردن کد"
				text={deactivating ? `کد ${deactivating.code} دیگر در سبد پذیرفته نمی‌شود؛ آمار استفاده‌اش می‌ماند.` : undefined}
				confirmLabel="غیرفعال کن"
				loading={deactivate.isPending}
				onConfirm={() => deactivating && deactivate.mutate(deactivating)}
			/>
		</>
	);
}
