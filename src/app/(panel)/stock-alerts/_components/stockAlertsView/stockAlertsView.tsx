"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { ProductsEndpoints } from "@/app/(panel)/products/_api/productsEndpoints";
import StockModal, { StockTarget } from "@/app/(panel)/products/_components/stockModal/stockModal";
import { ERROR_BEHAVIOUR } from "@/app/(panel)/products/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import ProductPicker from "@/app/_components/panel/productPicker/productPicker";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { toast } from "@/store/notification.store";
import { AdminStockAlertGroup, StockAlertFilters } from "@/types/catalog.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime, relativeTime } from "@/utils/format";
import { STOCK_STATUS, STOCK_STATUS_TONE } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";

/** `stock`: «out» = still out of stock (the real queue), «in» = back in stock (the SMS went or are going). */
const DEFAULTS = { stock: "out", product: "" };
const STOCK_FILTER: Record<string, boolean | undefined> = { out: false, in: true, all: undefined };

/**
 * `/stock-alerts` — «موجود شد خبرم کن»: how many shoppers wait for each colour (or for any colour of a product), since
 * when, and its exact stock now. Restocking a colour from here (`POST /admin/inventory/adjustments`) sends their SMS.
 */
export default function StockAlertsView() {
	const [f, setF] = useUrlFilters(DEFAULTS);
	const filters: StockAlertFilters = { productId: Number(f.product) || undefined, inStock: STOCK_FILTER[f.stock] };
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [filters] });
	const [target, setTarget] = useState<StockTarget | null>(null);

	const alerts = useQuery({
		queryKey: ["stockAlerts", "list", { filters, page, pageSize }],
		queryFn: () => withMappedError(() => ProductsEndpoints.getStockAlerts(filters, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	// «ورود کالا» needs the colour's exact counts — read the product now, then open the stock modal
	const openStock = useMutation({
		mutationFn: (g: AdminStockAlertGroup) => withMappedError(() => ProductsEndpoints.getProduct(g.product.id)),
		meta: { showNotification: true },
		onSuccess: (p, g) => {
			const v = p.adminVariants.find((x) => x.id === g.variantId);
			if (!v) {
				toast("این رنگ دیگر روی محصول نیست؛ از صفحه‌ی محصول بررسی کن.", { type: "error" });
				return;
			}
			setTarget({ variantId: v.id, sku: v.sku, label: `${p.name} — ${v.color.name}`, stockOnHand: v.stockOnHand, stockReserved: v.stockReserved, stockAlertSubscribers: v.stockAlertSubscribers });
		},
	});

	const columns: Column<AdminStockAlertGroup>[] = [
		{
			key: "product",
			title: "محصول",
			render: (g) => (
				<span className="cell-prod">
					<span className="th-img">
						{/* eslint-disable-next-line @next/next/no-img-element -- API image URL */}
						{g.product.imageUrl && <img src={g.product.imageUrl} alt="" />}
					</span>
					<span>
						<Link href={`/products/${g.product.id}`} style={{ fontWeight: 700 }}>
							{g.product.name}
						</Link>
						{g.sku && <span className="sub ltr">{g.sku}</span>}
					</span>
				</span>
			),
		},
		{
			key: "color",
			title: "رنگ",
			className: "nowrap",
			render: (g) =>
				g.color ? (
					<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
						<span className="swatch-dot" style={{ background: g.color.hex }} />
						{g.color.name}
					</span>
				) : (
					<span className="muted">هر رنگی</span>
				),
		},
		{
			key: "waiting",
			title: "منتظر",
			className: "nowrap",
			render: (g) => <Badge tone="WARN">{toPersianDigits(g.waitingCount)} نفر</Badge>,
		},
		{
			key: "oldest",
			title: "از",
			className: "nowrap",
			render: (g) => (
				<>
					{relativeTime(g.oldestAt)}
					<span className="sub">{formatDateTime(g.oldestAt)}</span>
				</>
			),
		},
		{
			key: "stock",
			title: "موجودی الان",
			className: "nowrap",
			render: (g) => (
				<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
					<StatusTag value={g.stockStatus} labels={STOCK_STATUS} tones={STOCK_STATUS_TONE} />
					<b>{toPersianDigits(g.availableQuantity)}</b>
				</span>
			),
		},
		{
			key: "acts",
			title: "",
			className: "end",
			render: (g) =>
				g.variantId != null ? (
					<Button
						size="sm"
						variant="white"
						iconStart={<Icon name="pkg" />}
						isLoading={openStock.isPending && openStock.variables?.variantId === g.variantId}
						disabled={openStock.isPending}
						onClick={() => openStock.mutate(g)}
					>
						ورود کالا
					</Button>
				) : (
					<Button size="sm" variant="white" href={`/products/${g.product.id}`}>
						رنگ‌های محصول
					</Button>
				),
		},
	];

	const alertsError = toErrorView(ERROR_BEHAVIOUR, alerts.error, "دریافت صف «موجود شد خبرم کن» با خطا مواجه شد.");
	const filtered = !!f.product || f.stock !== "out";

	return (
		<>
			<PageHead
				title="موجود شد خبرم کن"
				subtitle="مشتری‌هایی که منتظر موجود شدن یک رنگ‌اند، بیشترین منتظر اول. وقتی رنگ از هر راهی موجود شود (ورود کالا، رسیدن مرجوعی، آزاد شدن رزرو)، تا ۵ دقیقه بعد خودکار پیامک می‌گیرند — نه بین ۲۲ تا ۸ صبح. شماره‌ها این‌جا نمی‌آیند."
			/>
			<div className="fbar">
				<div className="seg" role="tablist" aria-label="موجودی">
					{[
						{ value: "out", label: "هنوز ناموجود" },
						{ value: "in", label: "موجود شده" },
						{ value: "all", label: "همه" },
					].map((o) => (
						<button key={o.value} type="button" role="tab" aria-selected={f.stock === o.value} className={f.stock === o.value ? "on" : undefined} onClick={() => setF({ stock: o.value })}>
							{o.label}
						</button>
					))}
				</div>
				<div style={{ minWidth: 260, flex: "1 1 260px" }}>
					<ProductPicker single placeholder="فقط یک محصول…" value={f.product ? [Number(f.product)] : []} onChange={(ids) => setF({ product: ids[0] ? String(ids[0]) : "" })} />
				</div>
				{filtered && (
					<button type="button" className="clear" onClick={() => setF({ stock: "out", product: "" })}>
						حذف فیلترها
					</button>
				)}
			</div>

			{alerts.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!alertsError ? (
				<ErrorComponent
					retryable={alertsError.retryable}
					ticketAble={alertsError.ticketAble}
					errorText={alertsError.errorText}
					executeFunction={() => alerts.refetch()}
					loading={alerts.isFetching}
				/>
			) : !alerts.error && !!alerts.data ? (
				<DataTable
					caption="موجود شد خبرم کن"
					columns={columns}
					rows={alerts.data.items}
					rowKey={(g) => `${g.product.id}-${g.variantId ?? "any"}`}
					loading={alerts.isFetching}
					empty={<TableEmpty icon="bell" title={f.stock === "out" ? "کسی منتظر رنگ ناموجودی نیست" : "موردی نیست"} />}
					footer={<TableFooter meta={alerts.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={alerts.isFetching} />}
				/>
			) : null}

			<StockModal target={target} onClose={() => setTarget(null)} />
		</>
	);
}
