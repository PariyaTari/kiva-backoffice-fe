"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ProductsEndpoints } from "@/app/(panel)/products/_api/productsEndpoints";
import { ERROR_BEHAVIOUR } from "@/app/(panel)/products/_utils/apiError";
import StockHistory from "@/app/(panel)/products/_components/stockHistory/stockHistory";
import StockModal, { StockTarget } from "@/app/(panel)/products/_components/stockModal/stockModal";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import { Icon } from "@/app/_components/icon/icons";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import SearchInput from "@/app/_components/panel/searchInput/searchInput";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { withMappedError } from "@/utils/withMappedError";

/** `/inventory` — the stock log of every colour, and a quick «تغییر موجودی» after finding the product. */
export default function InventoryView() {
	const [term, setTerm] = useState("");
	const [productId, setProductId] = useState<number | null>(null);
	const [target, setTarget] = useState<StockTarget | null>(null);

	// typed search — each keystroke pause sends one request and cancels the previous one
	const found = useQuery({
		queryKey: ["inventory", "productSearch", term],
		queryFn: ({ signal }) => withMappedError(() => ProductsEndpoints.getProducts({ q: term, sort: "name" }, 1, 8, signal)),
		enabled: !!term,
		placeholderData: keepPreviousData,
		meta: { showNotification: true },
	});
	const product = useQuery({
		queryKey: ["products", "detail", productId],
		queryFn: () => withMappedError(() => ProductsEndpoints.getProduct(productId as number)),
		enabled: productId !== null,
		meta: { showNotificationOnRefetch: true },
	});

	const productError = toErrorView(ERROR_BEHAVIOUR, product.error, "دریافت محصول با خطا مواجه شد.");

	return (
		<>
			<PageHead title="موجودی انبار" subtitle="هر تغییر موجودی با دلیل ثبت می‌شود: ورود کالا، شمارش انبار، آسیب‌دیده، مرجوعی، اصلاح دستی." />

			<section className="icard" style={{ marginBottom: 16 }}>
				<h3>
					<Icon name="pkg" /> تغییر موجودی
				</h3>
				<div className="fbar" style={{ marginBottom: 10 }}>
					<SearchInput
						value={term}
						onSearch={(q) => {
							setTerm(q);
							setProductId(null);
						}}
						placeholder="نام یا SKU محصول"
					/>
				</div>
				{!!term && !productId && (
					<div className="chip-row">
						{found.data?.items.length ? (
							found.data.items.map((p) => (
								<button key={p.id} type="button" className="btn btn-white btn-sm" onClick={() => setProductId(p.id)}>
									{p.name} <span className="muted ltr">{p.sku}</span>
								</button>
							))
						) : found.isFetching ? (
							<span className="muted">در حال جستجو…</span>
						) : (
							<span className="muted">محصولی پیدا نشد.</span>
						)}
					</div>
				)}
				{productId !== null &&
					(productError ? (
						<ErrorComponent
							retryable={productError.retryable}
							ticketAble={productError.ticketAble}
							errorText={productError.errorText}
							executeFunction={() => product.refetch()}
							height={56}
							loading={product.isFetching}
						/>
					) : product.data ? (
						<div className="stack" style={{ gap: 8 }}>
							<b style={{ fontSize: 14 }}>
								{product.data.name}{" "}
								<button type="button" className="btn btn-link" style={{ fontSize: 12.5 }} onClick={() => setProductId(null)}>
									(محصول دیگر)
								</button>
							</b>
							<div className="chip-row">
								{product.data.adminVariants.map((v) => (
									<button
										key={v.id}
										type="button"
										className="btn btn-outline btn-sm"
										onClick={() =>
											setTarget({
												variantId: v.id,
												sku: v.sku,
												label: `${product.data.name} — ${v.color.name}`,
												stockOnHand: v.stockOnHand,
												stockReserved: v.stockReserved,
												stockAlertSubscribers: v.stockAlertSubscribers,
											})
										}
									>
										<span className="swatch-dot" style={{ background: v.color.hex }} />
										{v.color.name} · {toPersianDigits(v.stockOnHand)}
									</button>
								))}
							</div>
						</div>
					) : (
						<span className="muted">در حال بارگذاری…</span>
					))}
			</section>

			<StockHistory />
			<StockModal target={target} onClose={() => setTarget(null)} />
		</>
	);
}
