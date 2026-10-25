"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import classNames from "classnames";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import JalaliDateInput from "@/app/_components/panel/jalaliDateInput/jalaliDateInput";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import SearchInput from "@/app/_components/panel/searchInput/searchInput";
import Button from "@/app/_components/ui/button/button";
import Checkbox from "@/app/_components/ui/checkbox/checkbox";
import { LIVE_POLL_MS } from "@/config/global";
import { useCan } from "@/hooks/useCan";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { toast } from "@/store/notification.store";
import { OrderCode, ShippingMethodCode } from "@/types/common.type";
import { AdminOrder, AdminOrderFilters, AdminOrderListItem, AdminOrderSort, OrderStatus } from "@/types/order.type";
import { toErrorView } from "@/utils/apiError";
import { downloadCsv } from "@/utils/csv";
import { toPersianDigits } from "@/utils/digits";
import { DELETED_ACCOUNT, formatDateTime } from "@/utils/format";
import { labelOf, MESSENGER, optionsOf, ORDER_SORT, ORDER_STATUS, REFUND_STATUS, SHIPPING_METHOD } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";
import { ERROR_BEHAVIOUR } from "../../_utils/apiError";
import { isPackable, MAX_SLIPS } from "../../_utils/packing";
import PackingSlips from "../packingSlip/packingSlip";
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

/** Unpaid and expired orders only come with an explicit status — «همه» doesn't count them. */
const UNPAID: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_FAILED", "EXPIRED"];

/** The manual refund queue (ADMIN): orders with a refund still to transfer. */
const REFUND_FILTER = { PENDING: `استرداد ${REFUND_STATUS.PENDING}`, PROCESSING: `استرداد ${REFUND_STATUS.PROCESSING}` } as const;

const DEFAULTS = { tab: "all", q: "", ship: "", refund: "", sort: "newest", from: "", to: "" };

/** The CSV export reads the filtered queue page by page — up to this many rows. */
const EXPORT_PAGE = 100;
const EXPORT_MAX = 2000;
const CSV_HEADER = ["کد سفارش", "تاریخ ثبت", "وضعیت", "مشتری", "موبایل", "شهر", "تعداد اقلام", "مبلغ (تومان)", "روش ارسال", "پیام‌رسان عکس", "رزرو", "گروه ارسال", "کد رهگیری"];
const csvRow = (o: AdminOrderListItem) => [
	o.code,
	formatDateTime(o.placedAt),
	labelOf(ORDER_STATUS, o.status),
	o.customerName ?? (o.customerPhone ? "" : DELETED_ACCOUNT),
	o.customerPhone,
	o.city,
	o.itemsCount,
	o.payable,
	labelOf(SHIPPING_METHOD, o.shippingMethod),
	labelOf(MESSENGER, o.messenger),
	o.reserved ? "بله" : "",
	o.shipmentGroupCode,
	o.trackingCode,
];

/** `/orders` — the operator's queue: tabs with counters, search by code / phone / name, filters, the table. */
export default function OrdersView() {
	const can = useCan();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [f, setF] = useUrlFilters(DEFAULTS);
	const tab = TABS.find((t) => t.key === f.tab) ?? TABS[0];

	const filters: AdminOrderFilters = {
		status: tab.statuses ?? [],
		q: f.q || undefined,
		shippingMethod: (f.ship || undefined) as ShippingMethodCode | undefined,
		awaitingPhotos: tab.awaiting || undefined,
		refundStatus: (f.refund || undefined) as AdminOrderFilters["refundStatus"],
		from: f.from || undefined,
		to: f.to || undefined,
		sort: f.sort === "oldest" ? "oldest" : undefined,
	};
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [filters] });

	// «سفارش تازه رسید» — the newest order, asked every minute; the list itself is not reloaded under the
	// operator's hands, a banner offers it. A failed check just shows no banner (like the sidebar counters).
	const latest = useQuery({
		queryKey: ["orders", "latest"],
		queryFn: () => withMappedError(() => OrdersEndpoints.getOrders({ status: [] }, 1, 1)),
		refetchInterval: LIVE_POLL_MS,
		select: (d) => d.items[0]?.code ?? null,
	});
	const [seenLatest, setSeenLatest] = useState<string | null | undefined>(undefined);
	if (latest.data !== undefined && seenLatest === undefined) setSeenLatest(latest.data);
	const arrived = !!latest.data && seenLatest !== undefined && latest.data !== seenLatest ? latest.data : null;
	const showArrived = () => {
		setSeenLatest(arrived);
		queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
		queryClient.invalidateQueries({ queryKey: ["orders", "queueCount"] });
	};

	const orders = useQuery({
		queryKey: ["orders", "list", { filters, page, pageSize }],
		queryFn: () => withMappedError(() => OrdersEndpoints.getOrders(filters, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const counts = orders.data?.statusCounts ?? {};
	const countOf = (t: Tab) =>
		t.awaiting ? null : (t.statuses ?? (Object.keys(counts) as OrderStatus[]).filter((s) => !UNPAID.includes(s))).reduce((sum, s) => sum + (counts[s] ?? 0), 0);
	const filtered = !!(f.q || f.ship || f.refund || f.from || f.to);

	// chosen orders (by code) for a print run — kept across pages and tabs until printed or cleared
	const [selected, setSelected] = useState<OrderCode[]>([]);
	const pageRows = orders.data?.items ?? [];
	const pickable = pageRows.filter((o) => isPackable(o.status));
	const allPicked = pickable.length > 0 && pickable.every((o) => selected.includes(o.code));
	const toggle = (code: OrderCode) => setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
	const togglePage = () =>
		setSelected((s) => (allPicked ? s.filter((c) => !pickable.some((o) => o.code === c)) : [...s, ...pickable.map((o) => o.code).filter((c) => !s.includes(c))]));
	const columns: Column<AdminOrderListItem>[] = [
		{
			key: "pick",
			title: <Checkbox label={<span className="sr-only">انتخاب همه‌ی این صفحه</span>} checked={allPicked} disabled={!pickable.length} onChange={togglePage} />,
			className: "pick",
			width: 40,
			render: (o) => (
				<Checkbox
					label={<span className="sr-only">انتخاب {o.code}</span>}
					checked={selected.includes(o.code)}
					disabled={!isPackable(o.status)}
					title={isPackable(o.status) ? undefined : "سفارش پرداخت‌نشده یا لغوشده برگه‌ی ارسال ندارد"}
					onChange={() => toggle(o.code)}
				/>
			),
		},
		...ORDER_COLUMNS,
	];

	// «چاپ برگه‌ی ارسال» for the chosen orders: each one's detail (address, lines), then one A5 page per order
	const [slips, setSlips] = useState<AdminOrder[] | null>(null);
	const printSlips = useMutation({
		mutationFn: (codes: OrderCode[]) =>
			withMappedError(async () => {
				const list: AdminOrder[] = [];
				for (const code of codes) list.push(await OrdersEndpoints.getOrder(code));
				return list;
			}),
		meta: { showNotification: true },
		onSuccess: (list) => setSlips(list),
	});
	// the slips are in the DOM now — open the print dialog; they leave again once it closes
	useEffect(() => {
		if (!slips) return;
		const done = () => setSlips(null);
		window.addEventListener("afterprint", done);
		window.print();
		return () => window.removeEventListener("afterprint", done);
	}, [slips]);

	// «خروجی CSV» — the whole filtered queue (not only this page), read page by page
	const exportCsv = useMutation({
		mutationFn: () =>
			withMappedError(async () => {
				const rows: AdminOrderListItem[] = [];
				for (let p = 1; rows.length < EXPORT_MAX; p += 1) {
					const res = await OrdersEndpoints.getOrders(filters, p, EXPORT_PAGE);
					rows.push(...res.items);
					if (!res.meta.hasNext) break;
				}
				return rows.slice(0, EXPORT_MAX);
			}),
		meta: { showNotification: true },
		onSuccess: (rows) => {
			downloadCsv(`kiva-orders-${new Date().toISOString().slice(0, 10)}.csv`, CSV_HEADER, rows.map(csvRow));
			toast(rows.length >= EXPORT_MAX ? `فقط ${toPersianDigits(EXPORT_MAX)} سفارش اول در فایل آمد؛ فیلتر را محدودتر کن.` : `${toPersianDigits(rows.length)} سفارش در فایل CSV`, { icon: "download" });
		},
	});

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
				{can("refunds") && (
					<select className="select" aria-label="استرداد" value={f.refund} onChange={(e) => setF({ refund: e.target.value })}>
						<option value="">همه (استرداد)</option>
						{optionsOf(REFUND_FILTER).map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
				)}
				<JalaliDateInput value={f.from} onChange={(from) => setF({ from })} aria-label="از تاریخ" placeholder="از تاریخ" />
				<JalaliDateInput value={f.to} onChange={(to) => setF({ to })} aria-label="تا تاریخ" placeholder="تا تاریخ" />
				<select className="select" aria-label="ترتیب" value={f.sort} onChange={(e) => setF({ sort: e.target.value as AdminOrderSort })}>
					{optionsOf(ORDER_SORT).map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				{filtered && (
					<button type="button" className="clear" onClick={() => setF({ q: "", ship: "", refund: "", from: "", to: "" })}>
						حذف فیلترها
					</button>
				)}
				<Button size="sm" variant="white" className="fbar-end" iconStart={<Icon name="download" />} isLoading={exportCsv.isPending} disabled={!orders.data?.meta.totalItems} onClick={() => exportCsv.mutate()}>
					خروجی CSV
				</Button>
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

			{arrived && (
				<p className="note success new-orders" role="status">
					<Icon name="bell" />
					<span>
						سفارش تازه رسید: <b className="ltr">{arrived}</b>
					</span>
					<button type="button" className="btn btn-sm btn-primary" onClick={showArrived}>
						به‌روزرسانی لیست
					</button>
				</p>
			)}

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
					columns={columns}
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

			{!!selected.length && (
				<div className="savebar sel-bar" role="status">
					<span className="msg">
						<b>{toPersianDigits(selected.length)}</b> سفارش انتخاب شده
						{selected.length > MAX_SLIPS && <> — هر بار حداکثر {toPersianDigits(MAX_SLIPS)} برگه</>}
					</span>
					<Button size="sm" variant="white" onClick={() => setSelected([])} disabled={printSlips.isPending}>
						لغو انتخاب
					</Button>
					<Button size="sm" iconStart={<Icon name="print" />} isLoading={printSlips.isPending} disabled={selected.length > MAX_SLIPS} onClick={() => printSlips.mutate(selected)}>
						چاپ برگه‌ی ارسال
					</Button>
				</div>
			)}
			{slips && <PackingSlips orders={slips} />}
		</>
	);
}
