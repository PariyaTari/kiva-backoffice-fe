"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TaxonomyEndpoints } from "@/app/(panel)/_api/taxonomyEndpoints";
import { Icon } from "@/app/_components/icon/icons";
import ChipsInput from "@/app/_components/panel/chipsInput/chipsInput";
import HtmlField from "@/app/_components/panel/htmlField/htmlField";
import JalaliDateTimeInput from "@/app/_components/panel/jalaliDateTimeInput/jalaliDateTimeInput";
import MoneyInput from "@/app/_components/panel/moneyInput/moneyInput";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import SeoFields from "@/app/_components/panel/seoFields/seoFields";
import UnsavedGuard from "@/app/_components/panel/unsavedGuard/unsavedGuard";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Select from "@/app/_components/ui/select/select";
import Switch from "@/app/_components/ui/switch/switch";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { AdminProduct } from "@/types/catalog.type";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { BAG_TYPE, optionsOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ProductsEndpoints } from "../../_api/productsEndpoints";
import { isStaleProductError } from "../../_utils/apiError";
import { ProductFormValues, toFormValues, toPayload, validateProduct } from "../../_utils/productForm";
import SpecsFields from "../specsFields/specsFields";

type ProductFormProps = {
	/** `null` = a new product. */
	product: AdminProduct | null;
	onCreated?: (product: AdminProduct) => void;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The product document (`ProductUpsertRequest`). Editing keeps the version it was opened with: a reload of the
 * product refreshes an untouched form, while a changed form keeps its edits and sends the old `etag` — if someone
 * saved meanwhile the server refuses (`412` / `CHANGED_BY_SOMEONE_ELSE`) and the form offers to start over.
 */
export default function ProductForm({ product, onCreated }: ProductFormProps) {
	const queryClient = useQueryClient();
	const creating = !product;
	const [base, setBase] = useState(() => ({ etag: product?.etag ?? "", values: toFormValues(product) }));
	const [values, setValues] = useState<ProductFormValues>(base.values);
	const [touched, setTouched] = useState(false);
	/** The version a save was refused for — the warning lasts until the form moves to a newer one. */
	const [refusedEtag, setRefusedEtag] = useState<string | null>(null);
	const dirty = !same(values, base.values);

	// the product was read again (after a colour / stock change, or «خواندن دوباره»): an untouched form follows it
	if (product && product.etag !== base.etag && !dirty) {
		const next = { etag: product.etag, values: toFormValues(product) };
		setBase(next);
		setValues(next.values);
	}
	const serverNewer = !!product && product.etag !== base.etag;

	const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

	const categories = useQuery({
		queryKey: ["taxonomy", "adminCategories"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getAdminCategories()),
		meta: { showNotification: true },
	});
	const materials = useQuery({
		queryKey: ["taxonomy", "materials"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getMaterials()),
		meta: { showNotification: true },
	});
	const colors = useQuery({
		queryKey: ["taxonomy", "colors"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getColors()),
		enabled: creating,
		meta: { showNotification: true },
	});

	const save = useMutation({
		mutationFn: () =>
			withMappedError(() =>
				product ? ProductsEndpoints.updateProduct(product.id, toPayload(values, false), base.etag) : ProductsEndpoints.createProduct(toPayload(values, true)),
			),
		meta: { showNotification: true },
		onSuccess: (saved) => {
			toast(creating ? "محصول ساخته شد (پیش‌نویس)" : "تغییرات ذخیره شد", { icon: "check" });
			const next = { etag: saved.etag, values: toFormValues(saved) };
			setBase(next);
			setValues(next.values);
			queryClient.invalidateQueries({ queryKey: ["products"] });
			onCreated?.(saved);
		},
		onError: (e) => {
			if (isStaleProductError(e)) setRefusedEtag(base.etag);
		},
	});

	const reread = () => {
		if (!product) return;
		// drop the edits; the untouched form then follows the fresh product
		setValues(base.values);
		queryClient.invalidateQueries({ queryKey: ["products", "detail", product.id] });
	};

	const local = validateProduct(values);
	const server = fieldErrorsOf(save.error);
	const err = (key: string) => (touched && local[key]) || server[key] || null;

	const submit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setTouched(true);
		if (Object.keys(local).length) {
			toast("چند فیلد را باید درست کنی", { type: "error" });
			return;
		}
		save.mutate();
	};

	const stale = serverNewer || refusedEtag === base.etag;
	const usedColors = values.variants.map((r) => r.colorKey);

	return (
		<form onSubmit={submit} noValidate>
			<section className="fsec">
				<h3>
					<Icon name="bag" /> اطلاعات اصلی
				</h3>
				<div className="form-grid" style={{ marginTop: 14 }}>
					<Input label="نام محصول" value={values.name} maxLength={120} onChange={(e) => set("name", e.target.value)} error={err("name")} wrapperClassName="full" />
					<Input
						label="slug"
						labelNote="آدرس در سایت"
						direction="ltr"
						value={values.slug}
						onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
						error={err("slug")}
						hint={values.slug ? `/product/${values.slug}` : "مثل mahak-shoulder-bag"}
					/>
					<Input label="SKU" labelNote="خالی = خودکار" direction="ltr" value={values.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} error={err("sku")} placeholder="KV-1001" />
					<Select
						label="دسته"
						placeholder={categories.isLoading ? "در حال بارگذاری…" : "انتخاب دسته"}
						value={values.categoryId}
						onChange={(e) => set("categoryId", e.target.value)}
						options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
						error={err("categoryId")}
					/>
					<Select label="نوع کیف" placeholder="انتخاب نوع" value={values.bagType} onChange={(e) => set("bagType", e.target.value as ProductFormValues["bagType"])} options={optionsOf(BAG_TYPE)} error={err("bagType")} />
					<Select
						label="متریال"
						placeholder={materials.isLoading ? "در حال بارگذاری…" : "انتخاب متریال"}
						value={values.materialId}
						onChange={(e) => set("materialId", e.target.value)}
						options={(materials.data ?? []).map((m) => ({ value: String(m.id), label: m.name }))}
						error={err("materialId")}
					/>
					<Input label="توضیح متریال" labelNote="روی صفحه‌ی محصول" maxLength={120} value={values.materialDescription} onChange={(e) => set("materialDescription", e.target.value)} placeholder="چرم مصنوعی مات درجه یک" />
				</div>
			</section>

			<section className="fsec">
				<h3>
					<Icon name="tag" /> قیمت
				</h3>
				<p className="d">قیمت هر رنگ می‌تواند جدا باشد (در ویرایش رنگ). برای تخفیف، قیمت قبل از تخفیف را بیشتر از قیمت فروش بگذار.</p>
				<div className="form-grid">
					<MoneyInput label="قیمت فروش" value={values.price} onChange={(v) => set("price", v)} error={err("price")} />
					<MoneyInput
						label="قیمت قبل از تخفیف"
						labelNote="خط‌خورده"
						value={values.compareAtPrice}
						onChange={(v) => set("compareAtPrice", v)}
						error={err("compareAtPrice")}
						hint={
							values.compareAtPrice && values.price && values.compareAtPrice > values.price
								? `${toPersianDigits(Math.round((1 - values.price / values.compareAtPrice) * 100))}٪ تخفیف`
								: "خالی = بدون تخفیف"
						}
					/>
				</div>
			</section>

			<section className="fsec">
				<h3>
					<Icon name="edit" /> توضیحات
				</h3>
				<div className="stack" style={{ marginTop: 14 }}>
					<Textarea
						label="توضیح کوتاه"
						maxLength={300}
						value={values.shortDescription}
						onChange={(e) => set("shortDescription", e.target.value)}
						error={err("shortDescription")}
						footer={<small className="muted">{toPersianDigits(values.shortDescription.length)} / ۳۰۰</small>}
						style={{ minHeight: 70 }}
					/>
					<HtmlField
						label="توضیحات (HTML)"
						labelNote="تب «توضیحات»"
						value={values.description}
						onChange={(e) => set("description", e.target.value)}
						style={{ minHeight: 160 }}
					/>
					<ChipsInput label="بولت‌های «چرا این کیف؟»" labelNote="حداکثر ۸" max={8} maxLength={160} value={values.highlights} onChange={(v) => set("highlights", v)} error={err("highlights")} />
					<ChipsInput label="برچسب‌ها" value={values.tags} onChange={(v) => set("tags", v)} placeholder="مینیمال، روزمره…" />
				</div>
			</section>

			<section className="fsec">
				<h3>
					<Icon name="ruler" /> مشخصات
				</h3>
				<p className="d">جدول «مشخصات» صفحه‌ی محصول و فیلترها از این‌ها ساخته می‌شوند.</p>
				<SpecsFields value={values.specs} onChange={(v) => set("specs", v)} />
			</section>

			<section className="fsec">
				<h3>
					<Icon name="gear" /> فروش
				</h3>
				<div className="form-grid g3" style={{ marginTop: 14 }}>
					<NumberInput label="سقف تعداد در هر سفارش" value={values.maxPerOrder} onChange={(v) => set("maxPerOrder", v)} error={err("maxPerOrder")} />
					<NumberInput label="اولویت چیدمان" labelNote="بزرگ‌تر = بالاتر" signed value={values.sortPriority} onChange={(v) => set("sortPriority", v)} />
					<div className="field">
						<label>تگ «جدید» تا</label>
						<JalaliDateTimeInput value={values.newUntil} onChange={(v) => set("newUntil", v)} defaultTime="23:59" ariaLabel="جدید تا" />
					</div>
				</div>
				<div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 14 }}>
					<Switch label="قابل بازگشت (۷ روزه)" checked={values.returnable} onChange={(e) => set("returnable", e.target.checked)} />
					<Switch label="قابل رزرو ۴ روزه" checked={values.reservable} onChange={(e) => set("reservable", e.target.checked)} />
				</div>
			</section>

			{creating && (
				<section className="fsec">
					<h3>
						<Icon name="palette" /> رنگ‌ها
					</h3>
					<p className="d">هر رنگ یک ورینت با موجودی خودش است. عکس‌های هر رنگ را بعد از ساخت، در صفحه‌ی محصول اضافه کن.</p>
					<div className="rows">
						{values.variants.map((r, i) => (
							<div key={i} className="row-card">
								<div className="form-grid g3">
									<Select
										label="رنگ"
										value={r.colorKey}
										onChange={(e) => set("variants", values.variants.map((x, k) => (k === i ? { ...x, colorKey: e.target.value } : x)))}
										options={(colors.data ?? []).filter((c) => c.key === r.colorKey || !usedColors.includes(c.key)).map((c) => ({ value: c.key, label: c.name }))}
									/>
									<NumberInput label="موجودی اولیه" value={r.stockQuantity} onChange={(n) => set("variants", values.variants.map((x, k) => (k === i ? { ...x, stockQuantity: n } : x)))} />
									<div className="field" style={{ justifyContent: "flex-end" }}>
										<div style={{ display: "flex", alignItems: "center", gap: 12, height: 50 }}>
											<label className="check">
												<input type="radio" name="defaultVariant" checked={r.isDefault} onChange={() => set("variants", values.variants.map((x, k) => ({ ...x, isDefault: k === i })))} /> پیش‌فرض
											</label>
											<button type="button" className="icon-btn" aria-label="حذف رنگ" onClick={() => set("variants", values.variants.filter((_, k) => k !== i))}>
												<Icon name="trash" />
											</button>
										</div>
									</div>
								</div>
							</div>
						))}
						{err("variants") && <span style={{ color: "var(--danger)", fontSize: 12 }}>{err("variants")}</span>}
						<button
							type="button"
							className="add-row"
							disabled={!colors.data}
							onClick={() => {
								const free = (colors.data ?? []).find((c) => !usedColors.includes(c.key));
								if (free) set("variants", [...values.variants, { colorKey: free.key, stockQuantity: 0, isDefault: !values.variants.length }]);
							}}
						>
							<Icon name="plus" /> افزودن رنگ
						</button>
					</div>
				</section>
			)}

			<section className="fsec">
				<h3>
					<Icon name="search" /> SEO
				</h3>
				<p className="d">خالی بماند، فروشگاه از نام و توضیح کوتاه محصول می‌سازد.</p>
				<SeoFields value={values.seo} onChange={(v) => set("seo", v)} errors={{ ...server, ...(touched ? local : {}) }} titlePlaceholder={values.name ? `${values.name} | کیوا` : undefined} />
			</section>

			<UnsavedGuard dirty={dirty} />
			<div className="savebar">
				<span className="msg">
					{stale ? (
						<span style={{ color: "var(--danger)" }}>
							این محصول جای دیگری ذخیره شده؛{" "}
							<button type="button" className="btn-link btn" onClick={reread}>
								خواندن دوباره (تغییرات این فرم از بین می‌رود)
							</button>
						</span>
					) : dirty ? (
						"تغییرات ذخیره‌نشده داری."
					) : creating ? (
						"محصول به‌صورت پیش‌نویس ساخته می‌شود."
					) : (
						"همه‌چیز ذخیره است."
					)}
				</span>
				{!creating && dirty && (
					<Button variant="white" size="sm" onClick={() => setValues(base.values)} disabled={save.isPending}>
						برگرداندن تغییرات
					</Button>
				)}
				<Button type="submit" size="sm" isLoading={save.isPending} disabled={!creating && !dirty}>
					{creating ? "ساخت محصول" : "ذخیره"}
				</Button>
			</div>
		</form>
	);
}
