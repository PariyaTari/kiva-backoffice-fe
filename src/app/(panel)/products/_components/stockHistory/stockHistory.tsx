"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import TableFooter from "@/app/_components/panel/pager/pager";
import { useTableState } from "@/hooks/useTableState";
import { InventoryAdjustment } from "@/types/catalog.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime } from "@/utils/format";
import { INVENTORY_REASON, labelOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ProductsEndpoints } from "../../_api/productsEndpoints";
import { ERROR_BEHAVIOUR } from "../../_utils/apiError";

const COLUMNS: Column<InventoryAdjustment>[] = [
	{ key: "at", title: "زمان", className: "nowrap", render: (a) => formatDateTime(a.createdAt) },
	{ key: "sku", title: "SKU", className: "nowrap", render: (a) => <span className="code">{a.sku}</span> },
	{
		key: "delta",
		title: "تغییر",
		className: "nowrap",
		render: (a) => (
			<b className="ltr" style={{ color: a.delta > 0 ? "var(--success)" : "var(--danger)" }}>
				{a.delta > 0 ? "+" : "−"}
				{toPersianDigits(Math.abs(a.delta))}
			</b>
		),
	},
	{ key: "after", title: "موجودی بعد", className: "nowrap", render: (a) => toPersianDigits(a.stockAfter) },
	{ key: "reason", title: "دلیل", className: "nowrap", render: (a) => labelOf(INVENTORY_REASON, a.reason) },
	{ key: "note", title: "یادداشت", render: (a) => a.note ?? <span className="muted">—</span> },
	{ key: "by", title: "ثبت‌کننده", className: "nowrap muted", render: (a) => a.createdBy },
];

/** The inventory log (`GET /admin/inventory/adjustments`) — every stock change with its reason; one colour or all. */
export default function StockHistory({ variantId = null }: { variantId?: number | null }) {
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [variantId], initialPageSize: variantId ? 10 : 20 });

	const history = useQuery({
		queryKey: ["inventory", "adjustments", { variantId, page, pageSize }],
		queryFn: () => withMappedError(() => ProductsEndpoints.getAdjustments(variantId, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const historyError = toErrorView(ERROR_BEHAVIOUR, history.error, "دریافت تاریخچه‌ی موجودی با خطا مواجه شد.");

	return history.isLoading ? (
		<Loading />
	) : !!historyError ? (
		<ErrorComponent
			retryable={historyError.retryable}
			ticketAble={historyError.ticketAble}
			errorText={historyError.errorText}
			executeFunction={() => history.refetch()}
			loading={history.isFetching}
		/>
	) : !history.error && !!history.data ? (
		<DataTable
			caption="تاریخچه‌ی موجودی"
			columns={variantId ? COLUMNS.filter((c) => c.key !== "sku") : COLUMNS}
			rows={history.data.items}
			rowKey={(a) => a.id}
			loading={history.isFetching}
			empty={<TableEmpty icon="pkg" title="تغییری ثبت نشده" />}
			footer={<TableFooter meta={history.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={history.isFetching} />}
		/>
	) : null;
}
