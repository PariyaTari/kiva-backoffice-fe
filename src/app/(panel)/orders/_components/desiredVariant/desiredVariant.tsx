"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import ErrorComponent2 from "@/app/_components/common/errorComponent2/errorComponent2";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import { useCan } from "@/hooks/useCan";
import { OrderItem, PreShipmentFeedback } from "@/types/order.type";
import { toErrorView } from "@/utils/apiError";
import { formatToman } from "@/utils/format";
import { STOCK_STATUS, STOCK_STATUS_TONE } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";
import { ERROR_BEHAVIOUR, isStoreProductMissingError } from "../../_utils/apiError";

type DesiredVariantProps = {
	/** The order line the shopper wants changed. */
	item: OrderItem;
	variantId: number;
	changeType: PreShipmentFeedback["changeType"];
};

/**
 * What the shopper asked for instead (`desiredVariantId`) — by name, colour and stock, from the same storefront
 * reads the shopper picked it from: «رنگ دیگه» = a variant of the same product (`GET /products/{id}`), «مدل دیگه»
 * = a «محصولات مشابه» product (`GET /products/{id}/related`). Both are public, so every role that sees orders can
 * read them. Not found there (unpublished since, or a list that changed) → the bare id, as before.
 */
export default function DesiredVariant({ item, variantId, changeType }: DesiredVariantProps) {
	const can = useCan();
	const otherModel = changeType === "MODEL";

	const product = useQuery({
		queryKey: ["orders", "storeProduct", item.productId],
		queryFn: () => withMappedError(() => OrdersEndpoints.getStoreProduct(item.productId)),
		enabled: !otherModel,
		meta: { showNotificationOnRefetch: true },
		select: (p) => {
			const v = p.variants.find((x) => x.id === variantId);
			return v ? { productId: p.id, productName: p.name, color: v.color, stock: v.stock.status, stockLabel: v.stock.label, price: v.price.price } : null;
		},
	});

	const related = useQuery({
		queryKey: ["orders", "relatedProducts", item.productId],
		queryFn: () => withMappedError(() => OrdersEndpoints.getRelatedProducts(item.productId)),
		enabled: otherModel,
		meta: { showNotificationOnRefetch: true },
		select: (list) => {
			for (const p of list) {
				const c = p.colors?.find((x) => x.variantId === variantId);
				if (c) return { productId: p.id, productName: p.name, color: c.color, stock: c.stockStatus, stockLabel: undefined, price: p.price.price };
			}
			return null;
		},
	});

	const lookup = otherModel ? related : product;
	const lookupMissing = isStoreProductMissingError(lookup.error);
	const lookupError = lookupMissing ? null : toErrorView(ERROR_BEHAVIOUR, lookup.error, "دریافت ورینت جایگزین با خطا مواجه شد.");
	const found = !lookup.error ? lookup.data : null;

	if (lookup.isLoading) return <span className="muted">ورینت جایگزین…</span>;
	if (lookupError) {
		return (
			<span style={{ flexBasis: "100%" }}>
				<ErrorComponent2
					retryable={lookupError.retryable}
					ticketAble={lookupError.ticketAble}
					errorText={lookupError.errorText}
					executeFunction={() => lookup.refetch()}
					variant="text"
					height={40}
					loading={lookup.isFetching}
				/>
			</span>
		);
	}
	if (!found) {
		return (
			<span>
				ورینت جایگزین <span className="ltr">#{variantId}</span> <small className="muted">(در فروشگاه پیدا نشد)</small>
			</span>
		);
	}

	const diff = found.price - item.unitPrice;
	const name = otherModel ? `${found.productName} — ${found.color.name}` : found.color.name;
	return (
		<span className="swap" title={`ورینت #${variantId}`}>
			<span className="swatch-dot" style={{ background: found.color.hex }} />
			{can("catalog") ? <Link href={`/products/${found.productId}`}>{name}</Link> : name}
			{found.stock && <StatusTag value={found.stock} labels={STOCK_STATUS} tones={STOCK_STATUS_TONE} label={found.stockLabel} />}
			{diff !== 0 && (
				<small style={{ fontWeight: 500 }}>
					{diff > 0 ? "+" : "−"}
					{formatToman(Math.abs(diff))} برای هر عدد
				</small>
			)}
		</span>
	);
}
