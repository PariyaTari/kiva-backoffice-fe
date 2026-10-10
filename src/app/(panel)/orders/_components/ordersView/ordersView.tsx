"use client";

import { useRouter } from "next/navigation";
import classNames from "classnames";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import JalaliDateInput from "@/app/_components/panel/jalaliDateInput/jalaliDateInput";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import SearchInput from "@/app/_components/panel/searchInput/searchInput";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { ShippingMethodCode } from "@/types/common.type";
import { AdminOrderFilters, OrderStatus } from "@/types/order.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { optionsOf, SHIPPING_METHOD } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";
import { ERROR_BEHAVIOUR } from "../../_utils/apiError";
import { ORDER_COLUMNS } from "./ordersColumns";

type Tab = { key: string; label: string; statuses?: OrderStatus[]; awaiting?: boolean };

/** The queue's tabs (FEATURES §1.3 / §3.2): the operator's work first, then the rest of the life cycle. */
const TABS: Tab[] = [
	{ key: "all", label: "همه" },
	{ key: "awaiting", label: "باید عکاسی شود", awaiting: true },
	{ key: "PROCESSING", label: "آماده‌سازی", statuses: ["PROCESSING"] },
	{ key: "PHOTO_SENT", label: "عکس ارسال شد", statuses: ["PHOTO_SENT"] },
	{ key: "CHANGE_REQUESTED", label: "درخواست تغییر", statuses: ["CHANGE_REQUESTED"] },
	{ key: "RESERVED", label: "رزرو", statuses: ["RESERVED"] },
	{ key: "SHIPPED", label: "در مسیر", statuses: ["SHIPPED"] },
	{ key: "DELIVERED", label: "تحویل شده", statuses: ["DELIVERED"] },
	{ key: "PENDING_PAYMENT", label: "در انتظار پرداخت", statuses: ["PENDING_PAYMENT"] },
	{ key: "returns", label: "مرجوعی", statuses: ["RETURN_REQUESTED", "RETURNED", "REFUNDED"] },
	{ key: "CANCELLED", label: "لغو شده", statuses: ["CANCELLED"] },
	{ key: "failed", label: "ناموفق / منقضی", statuses: ["PAYMENT_FAILED", "EXPIRED"] },
];

const DEFAULTS = { tab: "all", q: "", ship: "", from: "", to: "" };

/** `/orders` — the operator's queue: tabs with counters, search by code / phone / name, filters, the table. */
export default function OrdersView() {
	const router = useRouter();
	const [f, setF] = useUrlFilters(DEFAULTS);
	const tab = TABS.find((t) => t.key === f.tab) ?? TABS[0];

	const filters: AdminOrderFilters = {
		status: tab.statuses ?? [],
		q: f.q || undefined,
		shippingMethod: (f.ship || undefined) as ShippingMethodCode | undefined,
		awaitingPhotos: tab.awaiting || undefined,
		from: f.from || undefined,
		to: f.to || undefined,
	};
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [filters] });

	const orders = useQuery({
		queryKey: ["orders", "list", { filters, page, pageSize }],
		queryFn: () => withMappedError(() => OrdersEndpoints.getOrders(filters, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const counts = orders.data?.statusCounts ?? {};
	const countOf = (t: Tab) =>
		t.awaiting ? null : (t.statuses ?? (Object.keys(counts) as OrderStatus[])).reduce((sum, s) => sum + (counts[s] ?? 0), 0);
	const filtered = !!(f.q || f.ship || f.from || f.to);

	const ordersError = toErrorView(ERROR_BEHAVIOUR, orders.error, "دریافت سفارش‌ها با خطا مواجه شد.");

	return (
		<>
			<PageHead title="سفارش‌ها" subtitle="صف عملیات: عکاسی، ارسال عکس به مشتری، ثبت ارسال و تحویل." />

			<div className="fbar">
				<SearchInput value={f.q} onSearch={(q) => setF({ q })} placeholder="کد سفارش، موبایل یا نام مشتری" />
				<select className="select" aria-label="روش ارسال" value={f.ship} onChange={(e) => setF({ ship: e.target.value })}>
					<option value="">همه‌ی روش‌های ارسال</option>
					{optionsOf(SHIPPING_METHOD).map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				<JalaliDateInput value={f.from} onChange={(from) => setF({ from })} aria-label="از تاریخ" placeholder="از تاریخ" />
				<JalaliDateInput value={f.to} onChange={(to) => setF({ to })} aria-label="تا تاریخ" placeholder="تا تاریخ" />
				{filtered && (
					<button type="button" className="clear" onClick={() => setF({ q: "", ship: "", from: "", to: "" })}>
						حذف فیلترها
					</button>
				)}
			</div>

			<div className="tabs bo-tabs" role="tablist">
				{TABS.map((t) => {
					const count = countOf(t);
					return (
						<button key={t.key} type="button" role="tab" aria-selected={t.key === tab.key} className={classNames({ on: t.key === tab.key })} onClick={() => setF({ tab: t.key })}>
							{t.label}
							{!!count && <span className="cnt">{toPersianDigits(count)}</span>}
						</button>
					);
				})}
			</div>

			{orders.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!ordersError ? (
				<ErrorComponent
					retryable={ordersError.retryable}
					ticketAble={ordersError.ticketAble}
					errorText={ordersError.errorText}
					executeFunction={() => orders.refetch()}
					loading={orders.isFetching}
				/>
			) : !orders.error && !!orders.data ? (
				<DataTable
					caption="سفارش‌ها"
					columns={ORDER_COLUMNS}
					rows={orders.data.items}
					rowKey={(o) => o.code}
					onRowClick={(o) => router.push(`/orders/${encodeURIComponent(o.code)}`)}
					loading={orders.isFetching}
					empty={
						<TableEmpty
							icon="box"
							title={tab.awaiting ? "سفارشی منتظر عکاسی نیست" : "سفارشی پیدا نشد"}
							text={filtered ? "فیلترها رو کم کن یا عبارت دیگه‌ای جستجو کن." : undefined}
						/>
					}
					footer={<TableFooter meta={orders.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={orders.isFetching} />}
				/>
			) : null}
		</>
	);
}
