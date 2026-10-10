/**
 * Catalogue tables of the admin mock — products with colour variants and exact stock, categories, colours,
 * materials — built from the storefront's sample data. Orders (phase 2) read products from here; the catalogue
 * routes (phase 3) edit them.
 */
import * as D from "./data.mjs";
import { DAY, ORIGIN } from "./lib.mjs";

const NOW = Date.now();

export const colors = D.COLORS.map((c) => ({ ...c }));
export const colorByKey = (k) => colors.find((c) => c.key === k);
export const colorView = (k) => {
	const c = colorByKey(k) || { key: k, name: k, hex: "#999999", isLight: false, sortOrder: 99 };
	return { key: c.key, name: c.name, hex: c.hex, isLight: !!c.isLight, sortOrder: c.sortOrder, productCount: null };
};

export const categories = D.CATEGORIES.map((c, i) => ({
	id: c.id, slug: c.slug, name: c.name, description: null, iconBagType: D.BAG_TYPE[c.bag], iconColorKey: c.color,
	imageMediaId: null, sortOrder: i + 1, showInMenu: true, seo: { title: `${c.name} | کیوا`, description: null, canonicalUrl: null, ogImageUrl: null, noIndex: false, jsonLd: null },
}));
export const categoryBySlug = (slug) => categories.find((c) => c.slug === slug);
export const categoryById = (id) => categories.find((c) => c.id === Number(id));
export const categoryRef = (c) => (c ? { id: c.id, slug: c.slug, name: c.name } : null);

const FAMILY = (name) =>
	/طبیعی/.test(name) ? "GENUINE_LEATHER" : /جیر/.test(name) ? (/مصنوعی/.test(name) ? "FAUX_SUEDE" : "SUEDE") : /چرم/.test(name) ? "FAUX_LEATHER" : /برزنت|کتان/.test(name) ? "CANVAS" : /ساتن/.test(name) ? "SATIN" : /مخمل/.test(name) ? "VELVET" : "OTHER";
const SLUG_OF = { GENUINE_LEATHER: "genuine-leather", FAUX_LEATHER: "faux-leather", CANVAS: "canvas", SUEDE: "suede", FAUX_SUEDE: "faux-suede", SATIN: "satin", VELVET: "velvet", COTTON: "cotton", OTHER: "other" };
export const materials = [];
for (const p of D.PRODUCTS) {
	if (materials.some((m) => m.name === p.mat)) continue;
	const family = FAMILY(p.mat);
	materials.push({
		id: materials.length + 1, name: p.mat, slug: `${SLUG_OF[family]}-${materials.length + 1}`, family, description: null,
		careInstructions: family === "GENUINE_LEATHER" ? ["با دستمال نرم و کمی مرطوب تمیز شود", "از الکل و دستمال مرطوب آرایشی استفاده نشود"] : ["با دستمال نرم تمیز شود"],
	});
}
export const materialById = (id) => materials.find((m) => m.id === Number(id));

export const bagImage = (bagType, colorKey, v = 0) => {
	const bag = Object.entries(D.BAG_TYPE).find(([, t]) => t === bagType)?.[0] || "hobo";
	return `${ORIGIN}/media/bag/${bag}/${colorKey}.svg?v=${v}&r=2`;
};
const VIEWS = ["FRONT", "SIDE", "BACK", "DETAIL", "INTERIOR"];
/** A variant's media as stored (`ProductMediaInput` + the asset). */
const seedMedia = (bagType, colorKey, count) =>
	Array.from({ length: count }, (_, v) => ({ mediaId: `bag_${bagType}_${colorKey}_${v}`, view: VIEWS[v], sortOrder: v, isPrimary: v === 0, alt: null, url: bagImage(bagType, colorKey, v) }));

const CLOSURE = { "زیپ فلزی": "ZIPPER", "زیپ دوطرفه": "DOUBLE_ZIPPER", "زیپ + قفل تزئینی": "ZIPPER_WITH_DECORATIVE_LOCK", "درب مگنتی": "MAGNETIC_FLAP", "دکمه مگنتی": "MAGNETIC_SNAP", "بند کشی": "DRAWSTRING", "دکمه فلزی": "METAL_BUTTON" };
const OCCASION = { "روزمره": "DAILY", "دانشگاه": "UNIVERSITY", "محل کار": "WORK", "رسمی": "FORMAL", "مهمانی": "PARTY", "مجالس": "PARTY", "سفر": "TRAVEL", "خرید": "SHOPPING", "دورهمی": "GATHERING" };
const num = (t) => Number(String(t || "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[^\d.]/g, "")) || null;
/** The design's spec strings → the structured `ProductSpecs` of the contract. */
function specsOf(spec, mat) {
	const dims = String(spec.dim || "").split("×").map(num);
	const occasions = [...new Set(String(spec.use || "").split(/،\s*/).map((w) => OCCASION[w.trim()]).filter(Boolean))];
	return {
		dimensions: dims.length === 3 && dims.every(Boolean) ? { lengthCm: dims[0], heightCm: dims[1], widthCm: dims[2] } : null,
		weightGrams: num(spec.w), closure: CLOSURE[spec.close] ? { type: CLOSURE[spec.close], label: spec.close } : null,
		straps: spec.strap ? [{ type: /زنجیر/.test(spec.strap) ? "CHAIN" : /دسته/.test(spec.strap) ? "TOP_HANDLE" : "SHOULDER", label: spec.strap, lengthCm: num(spec.strap), adjustable: /تنظیم/.test(spec.strap), detachable: /جداشونده/.test(spec.strap), material: null }] : [],
		pockets: spec.pockets ? { summary: spec.pockets } : null, laptopMaxInch: /لپ‌تاپ/.test(spec.pockets || "") ? 14 : null, waterproof: /ضدآب/.test(mat),
		occasions: occasions.map((code) => ({ code })), lining: null, hardware: null, stitching: null, handmade: false, madeIn: "ایران", careInstructions: [], warranty: null,
	};
}

let VARIANT_SPLIT = 0;
export const products = D.PRODUCTS.map((p) => {
	const bagType = D.BAG_TYPE[p.bag];
	const cat = categoryBySlug(p.cat);
	const mat = materials.find((m) => m.name === p.mat);
	const sku = `KV-${1000 + p.id}`;
	// the storefront's single stock number spread over the colours (the first gets the most)
	let left = p.stock;
	const variants = p.colors.map((k, i) => {
		const share = i === p.colors.length - 1 ? left : Math.min(left, Math.ceil(p.stock / (i + 2)));
		left -= share;
		VARIANT_SPLIT += 1;
		return {
			id: p.id * 100 + i + 1, colorKey: k, sku: `${sku}-${k.slice(0, 3).toUpperCase()}`, barcode: VARIANT_SPLIT % 3 ? null : `62${String(p.id * 100 + i).padStart(10, "0")}`,
			priceOverride: null, compareAtPriceOverride: null, stockOnHand: share + (share ? 1 : 0), stockReserved: share ? 1 : 0, isDefault: i === 0, isActive: true, sortOrder: i,
			media: seedMedia(bagType, k, i === 0 ? 4 : 2), soldCount: Math.round(p.sold / (i + 1.6)), stockAlertSubscribers: share === 0 ? 2 + ((p.id + i) % 6) : 0,
		};
	});
	const spec = D.SPEC[p.bag] || {};
	return {
		id: p.id, slug: p.slug, sku, name: p.n, categoryId: cat?.id ?? 1, bagType, materialId: mat?.id ?? 1, materialDescription: p.mat,
		price: p.price, compareAtPrice: p.old || null, shortDescription: `${p.n}؛ ${p.mat}، مناسب ${spec.use || "روزمره"}.`,
		description: `<p>${p.n} با ${p.mat} و دوخت دقیق، برای استفاده‌ی ${spec.use || "روزمره"} ساخته شده.</p><p>قبل از ارسال، از همین کیف برایت عکس و ویدیو می‌فرستیم.</p>`,
		highlights: ["عکس واقعی قبل از ارسال", `ابعاد ${spec.dim || "استاندارد"} سانتی‌متر`, spec.pockets || "جیب داخلی"].filter(Boolean),
		specs: specsOf(spec, p.mat),
		tags: [p.isNew ? "جدید" : null, p.old ? "حراج" : null].filter(Boolean),
		newUntil: p.isNew ? new Date(NOW + (20 - p.age) * DAY).toISOString() : null, maxPerOrder: 5, returnable: true, reservable: p.id !== 13, sortPriority: 0,
		status: "ACTIVE", publishedAt: NOW - (p.age + 5) * DAY, seo: { title: `${p.n} | کیوا`, description: `خرید ${p.n} با عکس واقعی قبل از ارسال.`, canonicalUrl: null, ogImageUrl: null, noIndex: false, jsonLd: null },
		hasVideo: !!p.video, viewsCount: p.sold * 23 + 410, soldCount: p.sold, rating: { average: 4 + ((p.id * 7) % 10) / 10, count: 3 + (p.id % 9) },
		createdAt: NOW - (p.age + 10) * DAY, updatedAt: NOW - (p.id % 5) * DAY, createdBy: "admin@kiva.ir", variants, version: 1,
	};
});
// two non-public ones, so the status filter has something to show
products.push(
	{ ...structuredClone(products[0]), id: 17, slug: "nava-mini-bag", sku: "KV-1017", name: "کیف مینی نوا", status: "DRAFT", publishedAt: null, soldCount: 0, viewsCount: 0, createdAt: NOW - DAY, updatedAt: NOW - 3 * 36e5, variants: products[0].variants.slice(0, 2).map((v, i) => ({ ...structuredClone(v), id: 1701 + i, sku: `KV-1017-${v.colorKey.slice(0, 3).toUpperCase()}`, soldCount: 0 })) },
	{ ...structuredClone(products[4]), id: 18, slug: "old-party-clutch", sku: "KV-1018", name: "کلاچ ستاره (قدیمی)", status: "ARCHIVED", soldCount: 61, createdAt: NOW - 300 * DAY, updatedAt: NOW - 40 * DAY, variants: products[4].variants.slice(0, 1).map((v) => ({ ...structuredClone(v), id: 1801, sku: "KV-1018-BLA" })) },
);

export const productById = (id) => products.find((p) => p.id === Number(id));
export function variantById(vid) {
	for (const p of products) {
		const v = p.variants.find((x) => x.id === Number(vid));
		if (v) return { p, v };
	}
	return null;
}
export const variantPrice = (p, v) => v.priceOverride ?? p.price;
export const variantCompareAt = (p, v) => v.compareAtPriceOverride ?? p.compareAtPrice;
export const variantImage = (p, v) => {
	const m = v.media.find((x) => x.isPrimary) || v.media[0];
	return m ? m.url : bagImage(p.bagType, v.colorKey);
};
export const imageAsset = (url, alt) => ({ id: `img_${Buffer.from(url).toString("base64url").slice(-10)}`, type: "IMAGE", url, thumbnailUrl: url, width: 1200, height: 1200, mimeType: "image/svg+xml", alt: alt || null });
export const stockStatusOf = (n, low = 5) => (n <= 0 ? "OUT_OF_STOCK" : n < low ? "LOW_STOCK" : "IN_STOCK");
export const available = (v) => Math.max(0, v.stockOnHand - v.stockReserved);
