"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/app/_components/icon/icons";
import ConfirmModal from "@/app/_components/panel/confirmModal/confirmModal";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import Modal from "@/app/_components/ui/modal/modal";
import { toast } from "@/store/notification.store";
import { AdminProduct, AdminVariant, ProductMedia } from "@/types/catalog.type";
import { toPersianDigits } from "@/utils/digits";
import { formatPrice } from "@/utils/format";
import { withMappedError } from "@/utils/withMappedError";
import { ProductsEndpoints } from "../../_api/productsEndpoints";
import StockHistory from "../stockHistory/stockHistory";
import StockModal, { StockTarget } from "../stockModal/stockModal";
import VariantModal from "../variantModal/variantModal";

/** A picture for the row: the primary media's thumbnail — a video's poster, never the video file itself in an `<img>`. */
function thumbOf(media: ProductMedia[]): string | null {
	const m = media.find((x) => x.isPrimary) ?? media[0];
	return m ? (m.thumbnailUrl ?? (m.type === "VIDEO" ? (m.posterUrl ?? null) : m.url)) : null;
}

const LOW = 5;

/**
 * The colours of a product (FEATURES §2.4 «ورینت‌ها»): exact stock, sales, «موجود شد» subscribers and every per-colour
 * action. An archived product's colours can't be added or edited any more (`PRODUCT_ARCHIVED`); its stock still can.
 */
export default function VariantsSection({ product }: { product: AdminProduct }) {
	const archived = product.status === "ARCHIVED";
	// the last active colour of a published product can't go (`LAST_ACTIVE_VARIANT`)
	const lastActive = product.status === "ACTIVE" && product.adminVariants.filter((v) => v.isActive).length === 1;
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<{ variant: AdminVariant | null } | null>(null);
	const [stockOf, setStockOf] = useState<StockTarget | null>(null);
	const [historyOf, setHistoryOf] = useState<AdminVariant | null>(null);
	const [deactivating, setDeactivating] = useState<AdminVariant | null>(null);

	const deactivate = useMutation({
		mutationFn: (v: AdminVariant) => withMappedError(() => ProductsEndpoints.deactivateVariant(product.id, v.id)),
		meta: { showNotification: true },
		onSuccess: (_, v) => {
			toast(`رنگ ${v.color.name} غیرفعال شد`, { icon: "check" });
			setDeactivating(null);
			queryClient.invalidateQueries({ queryKey: ["products"] });
		},
	});

	const columns: Column<AdminVariant>[] = [
		{
			key: "color",
			title: "رنگ",
			render: (v) => (
				<span className="cell-prod" style={{ minWidth: 160 }}>
					<span className="th-img">
						{/* eslint-disable-next-line @next/next/no-img-element -- API image URL */}
						{thumbOf(v.media) ? <img src={thumbOf(v.media)!} alt="" /> : v.media.length > 0 && <Icon name="video" />}
					</span>
					<span>
						<span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
							<span className="swatch-dot" style={{ background: v.color.hex }} />
							{v.color.name}
						</span>
						<span className="sub ltr">{v.sku}</span>
					</span>
				</span>
			),
		},
		{
			key: "price",
			title: "قیمت",
			className: "nowrap",
			render: (v) => (
				<>
					{formatPrice(v.price.price)}
					{v.priceOverride != null && <span className="sub">قیمت اختصاصی</span>}
				</>
			),
		},
		{
			key: "stock",
			title: "فیزیکی / رزرو / در دسترس",
			className: "nowrap",
			render: (v) => (
				<>
					{toPersianDigits(v.stockOnHand)} / {toPersianDigits(v.stockReserved)} /{" "}
					<b style={{ color: v.stockAvailable === 0 ? "var(--danger)" : v.stockAvailable < LOW ? "var(--warn)" : undefined }}>{toPersianDigits(v.stockAvailable)}</b>
				</>
			),
		},
		{ key: "sold", title: "فروش", className: "nowrap", render: (v) => toPersianDigits(v.soldCount) },
		{
			key: "alerts",
			title: "منتظر «موجود شد»",
			className: "nowrap",
			render: (v) =>
				v.stockAlertSubscribers ? (
					<Link href={`/stock-alerts?product=${product.id}&stock=all`} title="صف «موجود شد خبرم کن»">
						<Badge tone="WARN">{toPersianDigits(v.stockAlertSubscribers)} نفر</Badge>
					</Link>
				) : (
					<span className="muted">—</span>
				),
		},
		{
			key: "flags",
			title: "",
			className: "nowrap",
			render: (v) => (
				<span style={{ display: "inline-flex", gap: 4 }}>
					{v.isDefault && <Badge tone="SALE">پیش‌فرض</Badge>}
					{!v.isActive && <Badge tone="DANGER">غیرفعال</Badge>}
					<Badge>{toPersianDigits(v.media.length)} فایل</Badge>
				</span>
			),
		},
		{
			key: "acts",
			title: "",
			className: "end",
			render: (v) => (
				<span className="row-acts">
					<button
						type="button"
						className="icon-btn"
						title="تغییر موجودی"
						aria-label="تغییر موجودی"
						onClick={() =>
							setStockOf({ variantId: v.id, sku: v.sku, label: `${product.name} — ${v.color.name}`, stockOnHand: v.stockOnHand, stockReserved: v.stockReserved, stockAlertSubscribers: v.stockAlertSubscribers })
						}
					>
						<Icon name="pkg" />
					</button>
					<button type="button" className="icon-btn" title="تاریخچه‌ی موجودی" aria-label="تاریخچه‌ی موجودی" onClick={() => setHistoryOf(v)}>
						<Icon name="clock" />
					</button>
					{!archived && (
						<button type="button" className="icon-btn" title="ویرایش" aria-label="ویرایش" onClick={() => setEditing({ variant: v })}>
							<Icon name="edit" />
						</button>
					)}
					{!archived && v.isActive && (
						<button
							type="button"
							className="icon-btn del"
							title={lastActive ? "آخرین رنگ فعال محصول منتشرشده؛ اول محصول را از انتشار دربیاور" : "غیرفعال کردن"}
							aria-label="غیرفعال کردن"
							disabled={lastActive}
							onClick={() => setDeactivating(v)}
						>
							<Icon name="ban" />
						</button>
					)}
				</span>
			),
		},
	];

	return (
		<section style={{ marginTop: 6 }}>
			<div className="bo-head" style={{ marginBottom: 12 }}>
				<div>
					<h1 style={{ fontSize: 18 }}>رنگ‌ها و موجودی</h1>
					<p>هر رنگ SKU، قیمت، موجودی و گالری خودش را دارد. موجودی فقط با «تغییر موجودی» و ثبت دلیل عوض می‌شود.</p>
				</div>
				{!archived && (
					<div className="acts">
						<Button size="sm" variant="soft" onClick={() => setEditing({ variant: null })} iconStart={<Icon name="plus" />}>
							رنگ جدید
						</Button>
					</div>
				)}
			</div>
			<DataTable caption="رنگ‌ها" columns={columns} rows={product.adminVariants} rowKey={(v) => v.id} empty={<TableEmpty icon="palette" title="هنوز رنگی ندارد" text="بدون رنگ فعال، محصول منتشر نمی‌شود." />} />

			<VariantModal key={editing?.variant?.id ?? "new"} product={product} variant={editing?.variant ?? null} open={!!editing} onClose={() => setEditing(null)} />
			<StockModal target={stockOf} onClose={() => setStockOf(null)} />
			<Modal open={!!historyOf} onClose={() => setHistoryOf(null)} width={760}>
				{historyOf && (
					<>
						<ModalHead icon="clock" title="تاریخچه‌ی موجودی" subtitle={`${product.name} — ${historyOf.color.name} · ${historyOf.sku}`} />
						<StockHistory variantId={historyOf.id} />
					</>
				)}
			</Modal>
			<ConfirmModal
				open={!!deactivating}
				onClose={() => setDeactivating(null)}
				tone="danger"
				icon="ban"
				title="غیرفعال کردن رنگ"
				text={
					deactivating
						? `رنگ ${deactivating.color.name} دیگر در سایت دیده نمی‌شود؛ سفارش‌های قبلی سالم می‌مانند${deactivating.isDefault ? " و رنگ فعال بعدی پیش‌فرض می‌شود" : ""}.`
						: undefined
				}
				confirmLabel="غیرفعال کن"
				loading={deactivate.isPending}
				onConfirm={() => deactivating && deactivate.mutate(deactivating)}
			/>
		</section>
	);
}
