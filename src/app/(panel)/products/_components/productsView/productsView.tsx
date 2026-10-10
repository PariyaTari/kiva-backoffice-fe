"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { TaxonomyEndpoints } from "@/app/(panel)/_api/taxonomyEndpoints";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import SearchInput from "@/app/_components/panel/searchInput/searchInput";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import Button from "@/app/_components/ui/button/button";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { AdminProductFilters, AdminProductListItem, ProductSort, ProductStatus, StockStatus } from "@/types/catalog.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime, formatPrice } from "@/utils/format";
import { optionsOf, PRODUCT_SORT, PRODUCT_STATUS, PRODUCT_STATUS_TONE, STOCK_STATUS } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ProductsEndpoints } from "../../_api/productsEndpoints";
import { ERROR_BEHAVIOUR } from "../../_utils/apiError";

const DEFAULTS = { q: "", status: "", category: "", stock: "", sort: "updated" };

const COLUMNS: Column<AdminProductListItem>[] = [
	{
		key: "product",
		title: "محصول",
		render: (p) => (
			<span className="cell-prod">
				<span className="th-img">
					{/* eslint-disable-next-line @next/next/no-img-element -- API image URL */}
					{p.imageUrl && <img src={p.imageUrl} alt="" />}
				</span>
				<span>
					<Link href={`/products/${p.id}`} style={{ fontWeight: 700 }}>
						{p.name}
					</Link>
					<span className="sub ltr">{p.sku}</span>
				</span>
			</span>
		),
	},
	{ key: "category", title: "دسته", className: "nowrap", render: (p) => p.category?.name ?? "—" },
	{
		key: "price",
		title: "قیمت (تومان)",
		className: "nowrap",
		render: (p) => (
			<>
				{formatPrice(p.price.price)}
				{p.price.compareAtPrice && (
					<span className="sub">
						<s>{formatPrice(p.price.compareAtPrice)}</s> · {toPersianDigits(p.price.discountPercent ?? 0)}٪
					</span>
				)}
			</>
		),
	},
	{
		key: "stock",
		title: "موجودی",
		className: "nowrap",
		render: (p) => (
			<>
				<b style={{ color: p.totalStock === 0 ? "var(--danger)" : undefined }}>{toPersianDigits(p.totalStock)}</b>
				<span className="sub">
					{toPersianDigits(p.variantsCount)} رنگ{p.lowStockVariants ? ` · ${toPersianDigits(p.lowStockVariants)} کم` : ""}
				</span>
			</>
		),
	},
	{ key: "sold", title: "فروش", className: "nowrap", render: (p) => toPersianDigits(p.soldCount) },
	{
		key: "rating",
		title: "امتیاز",
		className: "nowrap",
		render: (p) => (p.rating?.count ? `${toPersianDigits(p.rating.average.toFixed(1))} (${toPersianDigits(p.rating.count)})` : <span className="muted">—</span>),
	},
	{ key: "status", title: "وضعیت", className: "nowrap", render: (p) => <StatusTag value={p.status} labels={PRODUCT_STATUS} tones={PRODUCT_STATUS_TONE} /> },
	{ key: "updated", title: "ویرایش", className: "nowrap muted", render: (p) => formatDateTime(p.updatedAt) },
];

/** `/products` — every product in every status, with exact stock (FEATURES §4.1). */
export default function ProductsView() {
	const router = useRouter();
	const [f, setF] = useUrlFilters(DEFAULTS);
	const filters: AdminProductFilters = {
		q: f.q || undefined,
		status: (f.status || undefined) as ProductStatus | undefined,
		category: f.category ? [f.category] : undefined,
		stockStatus: (f.stock || undefined) as StockStatus | undefined,
		sort: f.sort as ProductSort,
	};
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [filters] });

	const products = useQuery({
		queryKey: ["products", "list", { filters, page, pageSize }],
		queryFn: () => withMappedError(() => ProductsEndpoints.getProducts(filters, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const categories = useQuery({
		queryKey: ["taxonomy", "adminCategories"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getAdminCategories()),
		meta: { showNotification: true },
	});

	const productsError = toErrorView(ERROR_BEHAVIOUR, products.error, "دریافت محصولات با خطا مواجه شد.");
	const filtered = !!(f.q || f.status || f.category || f.stock);

	return (
		<>
			<PageHead
				title="محصولات"
				subtitle="همه‌ی محصولات با موجودی دقیق هر رنگ؛ فقط «منتشرشده»ها در سایت دیده می‌شوند."
				actions={
					<Button href="/products/new" size="sm" iconStart={<Icon name="plus" />}>
						محصول جدید
					</Button>
				}
			/>

			<div className="fbar">
				<SearchInput value={f.q} onSearch={(q) => setF({ q })} placeholder="نام، SKU یا slug" />
				<select className="select" aria-label="وضعیت" value={f.status} onChange={(e) => setF({ status: e.target.value })}>
					<option value="">همه‌ی وضعیت‌ها</option>
					{optionsOf(PRODUCT_STATUS).map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				<select className="select" aria-label="دسته" value={f.category} onChange={(e) => setF({ category: e.target.value })} disabled={!categories.data}>
					<option value="">همه‌ی دسته‌ها</option>
					{categories.data?.map((c) => (
						<option key={c.id} value={c.slug}>
							{c.name}
						</option>
					))}
				</select>
				<select className="select" aria-label="موجودی" value={f.stock} onChange={(e) => setF({ stock: e.target.value })}>
					<option value="">همه‌ی موجودی‌ها</option>
					{optionsOf(STOCK_STATUS).map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				<select className="select" aria-label="مرتب‌سازی" value={f.sort} onChange={(e) => setF({ sort: e.target.value })}>
					{optionsOf(PRODUCT_SORT).map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				{filtered && (
					<button type="button" className="clear" onClick={() => setF({ q: "", status: "", category: "", stock: "" })}>
						حذف فیلترها
					</button>
				)}
			</div>

			{products.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!productsError ? (
				<ErrorComponent
					retryable={productsError.retryable}
					ticketAble={productsError.ticketAble}
					errorText={productsError.errorText}
					executeFunction={() => products.refetch()}
					loading={products.isFetching}
				/>
			) : !products.error && !!products.data ? (
				<DataTable
					caption="محصولات"
					columns={COLUMNS}
					rows={products.data.items}
					rowKey={(p) => p.id}
					onRowClick={(p) => router.push(`/products/${p.id}`)}
					loading={products.isFetching}
					empty={<TableEmpty icon="bag" title="محصولی پیدا نشد" text={filtered ? "فیلترها را کم کن." : undefined} />}
					footer={<TableFooter meta={products.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={products.isFetching} />}
				/>
			) : null}
		</>
	);
}
