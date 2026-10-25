import { AdminProduct, BagType, ProductSpecs, ProductUpsertRequest } from "@/types/catalog.type";
import { ColorKey, SeoMeta, toSeoInput } from "@/types/common.type";

/** A colour added together with a new product (create only — later colours have their own modal). */
export type NewVariantRow = { colorKey: ColorKey; stockQuantity: number | null; isDefault: boolean };

/** What the product form edits — the request's fields, with selects kept as strings. */
export type ProductFormValues = {
	name: string;
	slug: string;
	sku: string;
	categoryId: string;
	bagType: BagType | "";
	materialId: string;
	materialDescription: string;
	price: number | null;
	compareAtPrice: number | null;
	shortDescription: string;
	description: string;
	highlights: string[];
	tags: string[];
	specs: ProductSpecs;
	newUntil: string | null;
	maxPerOrder: number | null;
	returnable: boolean;
	reservable: boolean;
	sortPriority: number | null;
	seo: SeoMeta;
	variants: NewVariantRow[];
};

export const SLUG_PATTERN = /^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*$/;
/** Product and colour SKUs (`KV-1001`, `KV-1001-LILAC`) — stored in capitals; empty = made by the server. */
export const SKU_PATTERN = /^[A-Za-z][A-Za-z0-9]*(-[A-Za-z0-9]+)*$/;
/** `ProductUpsertRequest` caps (1.12.0). */
export const PRODUCT_LIMITS = { maxPerOrder: 20, tags: 20, tagLength: 30, description: 10_000 } as const;

export function toFormValues(p?: AdminProduct | null): ProductFormValues {
	return {
		name: p?.name ?? "",
		slug: p?.slug ?? "",
		sku: p?.sku ?? "",
		categoryId: p?.category ? String(p.category.id) : "",
		bagType: p?.bagType ?? "",
		materialId: p?.material ? String(p.material.id) : "",
		materialDescription: p?.materialDescription ?? "",
		price: p?.price.price ?? null,
		compareAtPrice: p?.price.compareAtPrice ?? null,
		shortDescription: p?.shortDescription ?? "",
		description: p?.description ?? "",
		highlights: p?.highlights ?? [],
		tags: p?.tags ?? [],
		specs: p?.specs ?? {},
		newUntil: p?.newUntil ?? null,
		maxPerOrder: p?.policies?.maxPerOrder ?? 5,
		returnable: p?.policies?.returnable ?? true,
		reservable: p?.policies?.reservable ?? true,
		sortPriority: p?.sortPriority ?? 0,
		seo: p?.seo ?? { title: null, description: null, canonicalUrl: null, ogImageUrl: null, noIndex: false },
		variants: [],
	};
}

/**
 * Form → `ProductUpsertRequest`. `status` is never sent from the form — it moves only through
 * `PATCH …/status` (publish / draft / archive), so an edit can't undo a publication made meanwhile. On `PUT` the slug and
 * SKU are the product's own (they can't change), and `seo` carries only what the server reads (`SeoInput`); the
 * server-built labels of closure and occasions are left out of `specs`.
 */
export function toPayload(v: ProductFormValues, creating: boolean): ProductUpsertRequest {
	return {
		name: v.name.trim(),
		slug: v.slug.trim(),
		sku: v.sku.trim() || null,
		categoryId: Number(v.categoryId),
		bagType: v.bagType as BagType,
		materialId: Number(v.materialId),
		materialDescription: v.materialDescription.trim() || null,
		price: v.price ?? 0,
		compareAtPrice: v.compareAtPrice || null,
		shortDescription: v.shortDescription.trim() || null,
		description: v.description.trim() || null,
		highlights: v.highlights,
		specs: {
			...v.specs,
			closure: v.specs.closure ? { type: v.specs.closure.type } : v.specs.closure,
			occasions: v.specs.occasions?.map((o) => ({ code: o.code })),
		},
		tags: v.tags,
		newUntil: v.newUntil,
		maxPerOrder: v.maxPerOrder ?? 5,
		returnable: v.returnable,
		reservable: v.reservable,
		sortPriority: v.sortPriority ?? 0,
		seo: toSeoInput(v.seo),
		...(creating ? { variants: v.variants.map((r, i) => ({ colorKey: r.colorKey, stockQuantity: r.stockQuantity ?? 0, isDefault: r.isDefault, sortOrder: i })) } : {}),
	};
}

/** The form's own checks before sending (the server repeats them and adds duplicates). */
export function validateProduct(v: ProductFormValues): Record<string, string> {
	const e: Record<string, string> = {};
	if (!v.name.trim()) e.name = "نام محصول را بنویس.";
	else if (v.name.length > 120) e.name = "حداکثر ۱۲۰ حرف.";
	if (!SLUG_PATTERN.test(v.slug.trim()) || v.slug.trim().length > 100) e.slug = "فقط حروف کوچک لاتین، رقم و خط تیره (حداکثر ۱۰۰)؛ حداقل یک حرف (مثل mahak-shoulder-bag).";
	if (v.sku.trim() && (!SKU_PATTERN.test(v.sku.trim()) || v.sku.trim().length > 40)) e.sku = "حرف و رقم لاتین با خط تیره، با حرف شروع شود (مثل KV-1001).";
	if (!v.categoryId) e.categoryId = "دسته را انتخاب کن.";
	if (!v.bagType) e.bagType = "نوع کیف را انتخاب کن.";
	if (!v.materialId) e.materialId = "متریال را انتخاب کن.";
	if (!v.price) e.price = "قیمت را وارد کن.";
	if (v.compareAtPrice && v.price && v.compareAtPrice <= v.price) e.compareAtPrice = "قیمت قبل از تخفیف باید از قیمت فروش بیشتر باشد.";
	if (v.shortDescription.length > 300) e.shortDescription = "حداکثر ۳۰۰ حرف.";
	if (v.description.length > PRODUCT_LIMITS.description) e.description = "حداکثر ۱۰٬۰۰۰ نویسه.";
	if (v.tags.length > PRODUCT_LIMITS.tags) e.tags = "حداکثر ۲۰ برچسب.";
	else if (v.tags.some((t) => !t.trim() || t.length > PRODUCT_LIMITS.tagLength)) e.tags = "هر برچسب ۱ تا ۳۰ حرف.";
	if ((v.seo.title ?? "").length > 70) e["seo.title"] = "حداکثر ۷۰ حرف.";
	if ((v.seo.description ?? "").length > 170) e["seo.description"] = "حداکثر ۱۷۰ حرف.";
	if (!v.maxPerOrder || v.maxPerOrder < 1 || v.maxPerOrder > PRODUCT_LIMITS.maxPerOrder) e.maxPerOrder = "بین ۱ و ۲۰.";
	if (new Set(v.variants.map((r) => r.colorKey)).size !== v.variants.length) e.variants = "یک رنگ دو بار اضافه شده.";
	return e;
}
