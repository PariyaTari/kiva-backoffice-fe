"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TaxonomyEndpoints } from "@/app/(panel)/_api/taxonomyEndpoints";
import { Icon } from "@/app/_components/icon/icons";
import MediaUploader from "@/app/_components/panel/mediaUploader/mediaUploader";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import MoneyInput from "@/app/_components/panel/moneyInput/moneyInput";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import Select from "@/app/_components/ui/select/select";
import Switch from "@/app/_components/ui/switch/switch";
import { toast } from "@/store/notification.store";
import { AdminProduct, AdminVariant, VariantUpsertRequest } from "@/types/catalog.type";
import { MediaView } from "@/types/common.type";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { MEDIA_VIEW, optionsOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ProductsEndpoints } from "../../_api/productsEndpoints";

type MediaRow = { mediaId: string; url: string; thumb: string | null; video: boolean; view: MediaView; isPrimary: boolean; alt: string };

type VariantModalProps = {
	product: AdminProduct;
	/** `null` + `open` = a new colour. */
	variant: AdminVariant | null;
	open: boolean;
	onClose: () => void;
};

/**
 * One colour of a product (`VariantUpsertRequest`): colour, SKU and barcode, its own price, active/default, and its
 * gallery — uploads (`purpose=PRODUCT`) with view, order, primary and alt. Initial stock only when creating.
 */
export default function VariantModal({ product, variant, open, onClose }: VariantModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={760}>
			<VariantForm product={product} variant={variant} onClose={onClose} />
		</Modal>
	);
}

function VariantForm({ product, variant, onClose }: Omit<VariantModalProps, "open">) {
	const queryClient = useQueryClient();
	const creating = !variant;
	const [colorKey, setColorKey] = useState(variant?.color.key ?? "");
	const [sku, setSku] = useState(variant?.sku ?? "");
	const [barcode, setBarcode] = useState(variant?.barcode ?? "");
	const [priceOverride, setPriceOverride] = useState<number | null>(variant?.priceOverride ?? null);
	const [compareOverride, setCompareOverride] = useState<number | null>(variant?.compareAtPriceOverride ?? null);
	const [stock, setStock] = useState<number | null>(0);
	const [isDefault, setIsDefault] = useState(variant?.isDefault ?? !product.adminVariants.length);
	const [isActive, setIsActive] = useState(variant?.isActive ?? true);
	const [media, setMedia] = useState<MediaRow[]>(
		() =>
			variant?.media.map((m) => ({ mediaId: m.id, url: m.url, thumb: m.thumbnailUrl, video: m.type === "VIDEO", view: m.view ?? "FRONT", isPrimary: !!m.isPrimary, alt: m.alt ?? "" })) ?? [],
	);

	const colors = useQuery({
		queryKey: ["taxonomy", "colors"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getColors()),
		meta: { showNotification: true },
	});
	const taken = product.adminVariants.filter((v) => v.id !== variant?.id).map((v) => v.color.key);

	const payload = (): VariantUpsertRequest => ({
		colorKey,
		sku: sku.trim() || null,
		barcode: barcode.trim() || null,
		priceOverride,
		compareAtPriceOverride: compareOverride,
		...(creating ? { stockQuantity: stock ?? 0 } : {}),
		isDefault,
		isActive,
		sortOrder: variant?.sortOrder,
		media: media.map((m, i) => ({ mediaId: m.mediaId, view: m.view, sortOrder: i, isPrimary: m.isPrimary, alt: m.alt.trim() || null })),
	});

	const save = useMutation({
		mutationFn: () => withMappedError(() => (variant ? ProductsEndpoints.updateVariant(product.id, variant.id, payload()) : ProductsEndpoints.createVariant(product.id, payload()))),
		meta: { showNotification: true },
		onSuccess: (v) => {
			toast(creating ? `رنگ ${v.color.name} اضافه شد` : `رنگ ${v.color.name} ذخیره شد`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["products"] });
			onClose();
		},
	});

	const errors = fieldErrorsOf(save.error);
	const patch = (i: number, change: Partial<MediaRow>) => setMedia((list) => list.map((m, k) => (k === i ? { ...m, ...change } : m)));
	const move = (i: number, by: number) =>
		setMedia((list) => {
			const next = [...list];
			const [row] = next.splice(i, 1);
			next.splice(i + by, 0, row);
			return next;
		});
	const primary = (i: number) => setMedia((list) => list.map((m, k) => ({ ...m, isPrimary: k === i })));

	return (
		<>
			<ModalHead icon="palette" title={variant ? `رنگ ${variant.color.name}` : "رنگ جدید"} subtitle={product.name} />
			<div className="m-body">
				<div className="form-grid g3">
					<Select
						label="رنگ"
						placeholder={colors.isLoading ? "در حال بارگذاری…" : "انتخاب رنگ"}
						value={colorKey}
						onChange={(e) => setColorKey(e.target.value)}
						options={(colors.data ?? []).filter((c) => !taken.includes(c.key)).map((c) => ({ value: c.key, label: c.name }))}
						error={errors.colorKey}
					/>
					<Input label="SKU" labelNote="خالی = خودکار" direction="ltr" value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} error={errors.sku} placeholder={`${product.sku}-XXX`} />
					<Input label="بارکد" labelNote="اختیاری" direction="ltr" value={barcode} onChange={(e) => setBarcode(e.target.value)} error={errors.barcode} />
					<MoneyInput label="قیمت این رنگ" labelNote="خالی = قیمت محصول" value={priceOverride} onChange={setPriceOverride} error={errors.priceOverride} />
					<MoneyInput label="قیمت قبل از تخفیف" labelNote="اختیاری" value={compareOverride} onChange={setCompareOverride} error={errors.compareAtPriceOverride} />
					{creating ? (
						<NumberInput label="موجودی اولیه" value={stock} onChange={setStock} error={errors.stockQuantity} hint="تغییرات بعدی از «تغییر موجودی»" />
					) : (
						<div className="field">
							<label>موجودی</label>
							<span className="help" style={{ paddingTop: 12 }}>
								از دکمه‌ی «تغییر موجودی» در جدول رنگ‌ها.
							</span>
						</div>
					)}
				</div>
				<div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
					<Switch label="فعال" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
					<Switch label="رنگ پیش‌فرض" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
				</div>

				<div className="field">
					<label>عکس‌ها و ویدیوی این رنگ</label>
					<MediaUploader
						purpose="PRODUCT"
						accept="image/*,video/*"
						hint="عکس واقعی و بدون ادیت؛ اولین عکس یا «اصلی» روی کارت محصول می‌نشیند"
						onUploaded={(a) =>
							setMedia((list) => [
								...list,
								{ mediaId: a.id, url: a.url, thumb: a.thumbnailUrl, video: a.type === "VIDEO", view: list.length ? "SIDE" : "FRONT", isPrimary: !list.length, alt: a.alt ?? "" },
							])
						}
					/>
				</div>
				{!!media.length && (
					<div className="upl-grid">
						{media.map((m, i) => (
							<div key={m.mediaId} className="upl-item">
								<div className="ph">
									{m.video ? (
										<video src={m.url} muted />
									) : (
										// eslint-disable-next-line @next/next/no-img-element -- media URL
										<img src={m.thumb || m.url} alt={m.alt} />
									)}
								</div>
								{m.isPrimary && <span className="tag tag-sale prim">اصلی</span>}
								<button type="button" className="x" aria-label="حذف" onClick={() => setMedia((list) => list.filter((_, k) => k !== i))}>
									<Icon name="close" />
								</button>
								<div className="meta">
									<select className="select" aria-label="زاویه" value={m.view} onChange={(e) => patch(i, { view: e.target.value as MediaView })}>
										{optionsOf(MEDIA_VIEW).map((o) => (
											<option key={o.value} value={o.value}>
												{o.label}
											</option>
										))}
									</select>
									<input className="input" aria-label="متن جایگزین" placeholder="alt" maxLength={200} value={m.alt} onChange={(e) => patch(i, { alt: e.target.value })} />
									<span style={{ display: "flex", justifyContent: "space-between" }}>
										<button type="button" className="icon-btn" style={{ width: 28, height: 28 }} aria-label="جلوتر" disabled={!i} onClick={() => move(i, -1)}>
											<Icon name="right" />
										</button>
										{!m.isPrimary && (
											<button type="button" className="btn btn-link" style={{ fontSize: 11.5 }} onClick={() => primary(i)}>
												اصلی شود
											</button>
										)}
										<button type="button" className="icon-btn" style={{ width: 28, height: 28 }} aria-label="عقب‌تر" disabled={i === media.length - 1} onClick={() => move(i, 1)}>
											<Icon name="left" />
										</button>
									</span>
								</div>
							</div>
						))}
					</div>
				)}
				{Object.keys(errors).some((k) => k.startsWith("media")) && <p className="note danger">یکی از فایل‌ها پیدا نشد؛ حذفش کن و دوباره آپلود کن.</p>}
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={save.isPending}>
					انصراف
				</Button>
				<Button onClick={() => save.mutate()} isLoading={save.isPending} disabled={!colorKey}>
					{creating ? "افزودن رنگ" : "ذخیره‌ی رنگ"}
				</Button>
			</div>
		</>
	);
}
