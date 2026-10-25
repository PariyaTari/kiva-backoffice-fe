/**
 * `/admin/products*`, `/admin/inventory/adjustments`, `/admin/stock-alerts`, `/admin/categories*`, `/admin/colors*`, `/admin/materials*`
 * (ADMIN, CATALOG_MANAGER) and the public reads the panel's forms use (`/categories`, `/colors`, `/materials`).
 * Products carry a version: `ETag` on reads, `If-Match` on `PUT` (a stale one → 412). Only a `PUT` of the product
 * document moves it — status, colours and stock are their own resources.
 */
import { DAY, HOUR, SLUG, checker, fail, iso, listParam, normQ, notFound, paginate, route, toEn } from "../lib.mjs";
import { staff } from "../auth.mjs";
import { fullNameOf } from "../db.mjs";
import { assets } from "../media.mjs";
import {
	available, bagImage, categories, categoryById, categoryRef, colorByKey, colorView, colors, materialById, materials, productById, products,
	stockStatusOf, variantById, variantCompareAt, variantImage, variantPrice,
} from "../catalog.mjs";

const ROLES = ["CATALOG_MANAGER"];
const LOW = 5;
const BAG_TYPES = ["HOBO", "CROSSBODY", "BACKPACK", "SATCHEL", "CLUTCH", "TOTE", "BUCKET", "WALLET"];
const MEDIA_VIEWS = ["FRONT", "SIDE", "BACK", "DETAIL", "INTERIOR", "STYLE", "ON_MODEL", "SCALE"];
const VIEW_LABEL = { FRONT: "نمای جلو", SIDE: "نمای کنار", BACK: "پشت", DETAIL: "جزئیات", INTERIOR: "داخل کیف", STYLE: "استایل", ON_MODEL: "روی مدل", SCALE: "مقایسه‌ی اندازه" };
const REASONS = ["RESTOCK", "STOCKTAKE", "DAMAGED", "RETURNED", "MANUAL_CORRECTION"];
const FAMILIES = ["GENUINE_LEATHER", "FAUX_LEATHER", "CANVAS", "SUEDE", "FAUX_SUEDE", "SATIN", "VELVET", "COTTON", "OTHER"];
const NOW = Date.now();

let PRODUCT_SEQ = 18, VARIANT_SEQ = 5000, ADJ_SEQ = 700, CATEGORY_SEQ = 8;

// ───────────── views ─────────────
const priceInfo = (price, compareAt) => ({
	price, compareAtPrice: compareAt && compareAt > price ? compareAt : null, discountPercent: compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0,
	discountAmount: compareAt > price ? compareAt - price : 0, currency: "IRT",
});
const mediaView = (m) => {
	const a = assets.get(m.mediaId);
	return {
		id: m.mediaId, type: a?.type ?? m.type ?? "IMAGE", url: a?.url ?? m.url, thumbnailUrl: a?.thumbnailUrl ?? m.url, width: 1200, height: 1200, mimeType: a?.mimeType ?? "image/svg+xml",
		alt: m.alt ?? a?.alt ?? null, view: m.view ?? null, viewLabel: m.view ? VIEW_LABEL[m.view] : null, sortOrder: m.sortOrder ?? 0, isPrimary: !!m.isPrimary, isUnedited: true,
	};
};
const adminVariant = (p, v) => ({
	id: v.id, sku: v.sku, color: colorView(v.colorKey), isDefault: v.isDefault, price: priceInfo(variantPrice(p, v), variantCompareAt(p, v)),
	media: [...v.media].sort((a, b) => a.sortOrder - b.sortOrder).map(mediaView), hasVideo: v.media.some((m) => (assets.get(m.mediaId)?.type ?? m.type) === "VIDEO"),
	barcode: v.barcode, isActive: v.isActive, sortOrder: v.sortOrder, stockOnHand: v.stockOnHand, stockReserved: v.stockReserved, stockAvailable: available(v),
	soldCount: v.soldCount, stockAlertSubscribers: v.stockAlertSubscribers, priceOverride: v.priceOverride, compareAtPriceOverride: v.compareAtPriceOverride,
});
const etagOf = (p) => `"p${p.id}-v${p.version}"`;
function adminProduct(p) {
	const m = materialById(p.materialId);
	return {
		id: p.id, slug: p.slug, sku: p.sku, name: p.name, url: `/product/${p.slug}`, category: categoryRef(categoryById(p.categoryId)), bagType: p.bagType,
		price: priceInfo(p.price, p.compareAtPrice), material: m ? { id: m.id, slug: m.slug, name: m.name, family: m.family } : null, materialDescription: p.materialDescription,
		shortDescription: p.shortDescription, description: p.description, highlights: p.highlights, specs: p.specs, specTable: [], tags: p.tags,
		policies: { returnable: p.returnable, returnWindowDays: 7, reservable: p.reservable, reservationDays: 4, preShipmentPhoto: true, maxPerOrder: p.maxPerOrder },
		seo: p.seo, publishedAt: iso(p.publishedAt), updatedAt: iso(p.updatedAt), hasVideo: p.hasVideo, rating: p.rating, soldCount: p.soldCount,
		status: p.status, adminVariants: [...p.variants].sort((a, b) => a.sortOrder - b.sortOrder).map((v) => adminVariant(p, v)), variants: [],
		newUntil: p.newUntil, sortPriority: p.sortPriority, viewsCount: p.viewsCount, conversionRate: p.viewsCount ? Math.round((p.soldCount / p.viewsCount) * 1000) / 10 : 0,
		createdAt: iso(p.createdAt), createdBy: p.createdBy, etag: etagOf(p), publishAt: iso(p.publishAt ?? null),
	};
}
const totalAvailable = (p) => p.variants.filter((v) => v.isActive).reduce((s, v) => s + available(v), 0);
function listItem(p) {
	const def = p.variants.find((v) => v.isDefault) || p.variants[0];
	return {
		id: p.id, sku: p.sku, name: p.name, imageUrl: def ? variantImage(p, def) : null, category: categoryRef(categoryById(p.categoryId)), status: p.status,
		price: priceInfo(p.price, p.compareAtPrice), totalStock: totalAvailable(p), variantsCount: p.variants.length,
		lowStockVariants: p.variants.filter((v) => v.isActive && available(v) < LOW).length, soldCount: p.soldCount, rating: p.rating, updatedAt: iso(p.updatedAt),
	};
}
const categoryView = (c) => ({
	id: c.id, slug: c.slug, name: c.name, description: c.description, icon: { bagType: c.iconBagType, colorKey: c.iconColorKey, imageUrl: null },
	imageUrl: c.imageMediaId ? assets.get(c.imageMediaId)?.url ?? null : null, productCount: products.filter((p) => p.categoryId === c.id && p.status !== "ARCHIVED").length,
	sortOrder: c.sortOrder, showInMenu: c.showInMenu, seo: c.seo, imageMediaId: c.imageMediaId ?? null,
});
const materialView = (m) => ({ ...m, productCount: products.filter((p) => p.materialId === m.id).length });
const colorFull = (c) => ({ ...colorView(c.key), productCount: products.filter((p) => p.variants.some((v) => v.colorKey === c.key)).length });

const findProduct = (id) => productById(id) || notFound("PRODUCT_NOT_FOUND", "محصول پیدا نشد.");
const findVariant = (p, vid) => p.variants.find((v) => v.id === Number(vid)) || notFound("VARIANT_NOT_FOUND", "این رنگ پیدا نشد.");

// ───────────── validation ─────────────
const nonEmpty = (v) => String(v ?? "").trim().length > 0;
function checkProduct(b, { creating, self }) {
	const c = checker()
		.need(nonEmpty(b.name) && String(b.name).length <= 120, "name", "نام محصول لازمه (حداکثر ۱۲۰ حرف).")
		.need(SLUG.test(b.slug || ""), "slug", "slug فقط حروف کوچک لاتین، رقم و خط تیره؛ حداقل یک حرف.")
		.need(!!categoryById(b.categoryId), "categoryId", "دسته‌بندی رو انتخاب کن.")
		.need(BAG_TYPES.includes(b.bagType), "bagType", "نوع کیف رو انتخاب کن.")
		.need(!!materialById(b.materialId), "materialId", "متریال رو انتخاب کن.")
		.need(Number.isInteger(b.price) && b.price > 0, "price", "قیمت رو وارد کن.")
		.need(b.compareAtPrice == null || (Number.isInteger(b.compareAtPrice) && b.compareAtPrice > b.price), "compareAtPrice", "قیمت قبل از تخفیف باید از قیمت فروش بیشتر باشه.")
		.need(!b.shortDescription || String(b.shortDescription).length <= 300, "shortDescription", "توضیح کوتاه حداکثر ۳۰۰ حرف.")
		.need(!b.highlights || (b.highlights.length <= 8 && b.highlights.every((h) => String(h).length <= 160)), "highlights", "حداکثر ۸ مورد، هر کدام تا ۱۶۰ حرف.")
		.need(!b.seo?.description || String(b.seo.description).length <= 170, "seo.description", "توضیح SEO حداکثر ۱۷۰ حرف.")
		.need(b.maxPerOrder == null || (Number.isInteger(b.maxPerOrder) && b.maxPerOrder >= 1), "maxPerOrder", "سقف خرید حداقل ۱.")
		.need(!b.status || ["DRAFT", "ACTIVE", "ARCHIVED"].includes(b.status), "status", "وضعیت معتبر نیست.");
	if (creating) (b.variants || []).forEach((v, i) => c.need(!!colorByKey(v.colorKey), `variants.${i}.colorKey`, "رنگ رو انتخاب کن."));
	c.done();
	if (products.some((p) => p !== self && p.slug === b.slug)) fail(409, "DUPLICATE_SLUG", "این slug قبلاً برای محصول دیگری ثبت شده.", { errors: [{ field: "slug", code: "DUPLICATE_SLUG", message: "این slug تکراریه." }] });
	if (b.sku && products.some((p) => p !== self && p.sku === b.sku)) fail(409, "DUPLICATE_SKU", "این SKU قبلاً ثبت شده.", { errors: [{ field: "sku", code: "DUPLICATE_SKU", message: "این SKU تکراریه." }] });
	if (creating) {
		const keys = (b.variants || []).map((v) => v.colorKey);
		if (new Set(keys).size !== keys.length) fail(409, "COLOR_ALREADY_ON_PRODUCT", "یک رنگ دو بار اضافه شده.");
	}
}
const mediaOf = (list, bagType, colorKey) =>
	(list || []).map((m, i) => {
		if (!MEDIA_VIEWS.includes(m.view)) fail(400, "VALIDATION_ERROR", "زاویه‌ی عکس معتبر نیست.", { errors: [{ field: `media.${i}.view`, code: "INVALID", message: "زاویه‌ی عکس معتبر نیست." }] });
		const a = assets.get(m.mediaId);
		const known = a || String(m.mediaId).startsWith("bag_");
		if (!known) fail(400, "VALIDATION_ERROR", "یکی از فایل‌ها پیدا نشد؛ دوباره آپلودش کن.", { errors: [{ field: `media.${i}.mediaId`, code: "MEDIA_NOT_FOUND", message: "فایل پیدا نشد." }] });
		return { mediaId: m.mediaId, view: m.view, sortOrder: m.sortOrder ?? i, isPrimary: !!m.isPrimary, alt: m.alt ?? null, url: a?.url ?? bagImage(bagType, colorKey, i), type: a?.type ?? "IMAGE" };
	});
function applyProduct(p, b) {
	Object.assign(p, {
		name: String(b.name).trim(), slug: b.slug, sku: b.sku?.trim() || p.sku, categoryId: Number(b.categoryId), bagType: b.bagType, materialId: Number(b.materialId),
		materialDescription: b.materialDescription ?? null, price: b.price, compareAtPrice: b.compareAtPrice ?? null, shortDescription: b.shortDescription ?? null,
		description: b.description ?? null, highlights: b.highlights ?? [], specs: b.specs ?? p.specs ?? {}, tags: b.tags ?? [], newUntil: b.newUntil ?? null,
		maxPerOrder: b.maxPerOrder ?? 5, returnable: b.returnable ?? true, reservable: b.reservable ?? true, sortPriority: b.sortPriority ?? 0,
		seo: { title: null, description: null, canonicalUrl: null, ogImageUrl: null, noIndex: false, jsonLd: null, ...(b.seo || {}) }, updatedAt: Date.now(),
	});
	if (b.status) setStatus(p, b.status);
}
function setStatus(p, status) {
	if (status === "ACTIVE" && !p.variants.some((v) => v.isActive)) fail(422, "NO_ACTIVE_VARIANT", "محصول بدون رنگ فعال منتشر نمی‌شه؛ اول یک رنگ اضافه یا فعال کن.");
	if (status === "ACTIVE" && !p.publishedAt) p.publishedAt = Date.now();
	p.status = status;
	p.publishAt = null;
}
function variantFrom(p, b, creating) {
	const c = checker()
		.need(!!colorByKey(b.colorKey), "colorKey", "رنگ رو انتخاب کن.")
		.need(b.priceOverride == null || (Number.isInteger(b.priceOverride) && b.priceOverride > 0), "priceOverride", "قیمت اختصاصی معتبر نیست.")
		.need(b.compareAtPriceOverride == null || (Number.isInteger(b.compareAtPriceOverride) && b.compareAtPriceOverride > (b.priceOverride ?? p.price)), "compareAtPriceOverride", "قیمت قبل از تخفیف باید بیشتر از قیمت فروش باشه.");
	if (creating) c.need(b.stockQuantity == null || (Number.isInteger(b.stockQuantity) && b.stockQuantity >= 0), "stockQuantity", "موجودی اولیه عدد صحیح و نامنفی.");
	c.done();
	return {
		colorKey: b.colorKey, sku: b.sku?.trim() || `${p.sku}-${b.colorKey.slice(0, 3).toUpperCase()}`, barcode: b.barcode?.trim() || null,
		priceOverride: b.priceOverride ?? null, compareAtPriceOverride: b.compareAtPriceOverride ?? null, isActive: b.isActive ?? true, sortOrder: b.sortOrder ?? p.variants.length,
		media: mediaOf(b.media, p.bagType, b.colorKey),
	};
}
const makeDefault = (p, v) => p.variants.forEach((x) => (x.isDefault = x === v));

// ───────────── products ─────────────
const SORTS = {
	newest: (a, b) => b.createdAt - a.createdAt, updated: (a, b) => b.updatedAt - a.updatedAt, name: (a, b) => a.name.localeCompare(b.name, "fa"),
	price_asc: (a, b) => a.price - b.price, price_desc: (a, b) => b.price - a.price, bestselling: (a, b) => b.soldCount - a.soldCount, stock_asc: (a, b) => totalAvailable(a) - totalAvailable(b),
};
route("GET", "/admin/products", (ctx) => {
	staff(ctx, ...ROLES);
	const q = ctx.query;
	const term = q.q ? normQ(q.q).toLowerCase() : "";
	const cats = listParam(q.category);
	const list = products
		.filter((p) => !term || p.name.includes(normQ(q.q)) || p.sku.toLowerCase().includes(term) || p.slug.includes(term))
		.filter((p) => !q.status || p.status === q.status)
		.filter((p) => !cats.length || cats.includes(categoryById(p.categoryId)?.slug))
		.filter((p) => !q.stockStatus || stockStatusOf(totalAvailable(p), LOW) === q.stockStatus)
		.sort(SORTS[q.sort] || SORTS.updated);
	const { items, meta } = paginate(list, q, 20);
	return { items: items.map(listItem), meta };
});
route("POST", "/admin/products", (ctx) => {
	const me = staff(ctx, ...ROLES);
	const b = ctx.body || {};
	checkProduct(b, { creating: true });
	const id = ++PRODUCT_SEQ;
	const p = { id, sku: b.sku?.trim() || `KV-${1000 + id}`, createdAt: Date.now(), createdBy: fullNameOf(me) || me.phone, status: "DRAFT", publishedAt: null, publishAt: null, variants: [], hasVideo: false, viewsCount: 0, soldCount: 0, rating: { average: 0, count: 0 }, version: 1 };
	applyProduct(p, { ...b, status: undefined });
	(b.variants || []).forEach((vb, i) => {
		const v = { id: ++VARIANT_SEQ, ...variantFrom(p, vb, true), stockOnHand: vb.stockQuantity ?? 0, stockReserved: 0, isDefault: !!vb.isDefault, soldCount: 0, stockAlertSubscribers: 0 };
		v.sortOrder = vb.sortOrder ?? i;
		p.variants.push(v);
	});
	if (p.variants.length && !p.variants.some((v) => v.isDefault)) p.variants[0].isDefault = true;
	if (b.status && b.status !== "DRAFT") setStatus(p, b.status);
	products.push(p);
	ctx.status = 201;
	ctx.headers.ETag = etagOf(p);
	return adminProduct(p);
});
route("GET", "/admin/products/:id", (ctx) => {
	staff(ctx, ...ROLES);
	const p = findProduct(ctx.params.id);
	ctx.headers.ETag = etagOf(p);
	return adminProduct(p);
});
route("PUT", "/admin/products/:id", (ctx) => {
	staff(ctx, ...ROLES);
	const p = findProduct(ctx.params.id);
	const ifMatch = ctx.req.headers["if-match"];
	if (ifMatch && ifMatch !== etagOf(p)) fail(412, "CHANGED_BY_SOMEONE_ELSE", "این محصول بعد از باز شدن فرم تغییر کرده؛ هیچ‌چیز ذخیره نشد. صفحه رو دوباره بخون.");
	const b = ctx.body || {};
	checkProduct(b, { creating: false, self: p });
	applyProduct(p, b);
	p.version++;
	ctx.headers.ETag = etagOf(p);
	return adminProduct(p);
});
route("DELETE", "/admin/products/:id", (ctx) => {
	staff(ctx, ...ROLES);
	const p = findProduct(ctx.params.id);
	if (p.status === "ARCHIVED") fail(422, "PRODUCT_ALREADY_ARCHIVED", "این محصول قبلاً آرشیو شده.");
	p.status = "ARCHIVED";
	p.updatedAt = Date.now();
	ctx.status = 204;
});
route("PATCH", "/admin/products/:id/status", (ctx) => {
	staff(ctx, ...ROLES);
	const p = findProduct(ctx.params.id);
	const { status, publishAt = null } = ctx.body || {};
	if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) fail(400, "VALIDATION_ERROR", "وضعیت معتبر نیست.", { errors: [{ field: "status", code: "INVALID", message: "وضعیت معتبر نیست." }] });
	const at = publishAt ? Date.parse(publishAt) : null;
	if (status === "ACTIVE" && at && at > Date.now()) {
		// scheduled: stays as it is until then
		if (!p.variants.some((v) => v.isActive)) fail(422, "NO_ACTIVE_VARIANT", "محصول بدون رنگ فعال منتشر نمی‌شه.");
		p.publishAt = at;
	} else {
		if (p.status === status) fail(422, `PRODUCT_ALREADY_${status === "ACTIVE" ? "ACTIVE" : status}`, { ACTIVE: "این محصول همین الان منتشر شده.", DRAFT: "این محصول همین الان پیش‌نویسه.", ARCHIVED: "این محصول قبلاً آرشیو شده." }[status]);
		setStatus(p, status);
	}
	p.updatedAt = Date.now();
	ctx.headers.ETag = etagOf(p);
	return adminProduct(p);
});

// ───────────── variants ─────────────
route("POST", "/admin/products/:id/variants", (ctx) => {
	staff(ctx, ...ROLES);
	const p = findProduct(ctx.params.id);
	const b = ctx.body || {};
	if (p.variants.some((v) => v.colorKey === b.colorKey)) fail(409, "COLOR_ALREADY_ON_PRODUCT", "این رنگ قبلاً برای این محصول تعریف شده.");
	if (b.isDefault && b.isActive === false) fail(422, "INACTIVE_VARIANT_CANNOT_BE_DEFAULT", "رنگ غیرفعال نمی‌تونه پیش‌فرض باشه.");
	const v = { id: ++VARIANT_SEQ, ...variantFrom(p, b, true), stockOnHand: b.stockQuantity ?? 0, stockReserved: 0, isDefault: false, soldCount: 0, stockAlertSubscribers: 0 };
	if (p.variants.some((x) => x.sku === v.sku) || products.some((x) => x !== p && x.variants.some((y) => y.sku === v.sku))) fail(409, "DUPLICATE_SKU", "این SKU قبلاً ثبت شده.", { errors: [{ field: "sku", code: "DUPLICATE_SKU", message: "این SKU تکراریه." }] });
	p.variants.push(v);
	if (b.isDefault || p.variants.length === 1) makeDefault(p, v);
	p.updatedAt = Date.now();
	ctx.status = 201;
	return adminVariant(p, v);
});
route("PUT", "/admin/products/:id/variants/:vid", (ctx) => {
	staff(ctx, ...ROLES);
	const p = findProduct(ctx.params.id);
	const v = findVariant(p, ctx.params.vid);
	const b = ctx.body || {};
	if (b.colorKey !== v.colorKey && p.variants.some((x) => x !== v && x.colorKey === b.colorKey)) fail(409, "COLOR_ALREADY_ON_PRODUCT", "این رنگ قبلاً برای این محصول تعریف شده.");
	const next = variantFrom(p, b, false);
	if (b.isDefault && next.isActive === false) fail(422, "INACTIVE_VARIANT_CANNOT_BE_DEFAULT", "رنگ غیرفعال نمی‌تونه پیش‌فرض باشه.");
	if (v.isActive && next.isActive === false && p.status === "ACTIVE" && p.variants.filter((x) => x.isActive).length === 1) fail(422, "LAST_ACTIVE_VARIANT", "این آخرین رنگ فعال محصول منتشرشده است؛ اول محصول رو پیش‌نویس کن.");
	Object.assign(v, next);
	if (b.isDefault) makeDefault(p, v);
	else if (v.isDefault && !v.isActive) makeDefault(p, p.variants.find((x) => x.isActive) || v);
	p.updatedAt = Date.now();
	return adminVariant(p, v);
});
route("DELETE", "/admin/products/:id/variants/:vid", (ctx) => {
	staff(ctx, ...ROLES);
	const p = findProduct(ctx.params.id);
	const v = findVariant(p, ctx.params.vid);
	if (!v.isActive) fail(422, "VARIANT_ALREADY_INACTIVE", "این رنگ همین الان غیرفعاله.");
	if (p.status === "ACTIVE" && p.variants.filter((x) => x.isActive).length === 1) fail(422, "LAST_ACTIVE_VARIANT", "این آخرین رنگ فعال محصول منتشرشده است؛ اول محصول رو پیش‌نویس کن.");
	v.isActive = false;
	if (v.isDefault) makeDefault(p, p.variants.find((x) => x.isActive) || v);
	p.updatedAt = Date.now();
	ctx.status = 204;
});

// ───────────── «موجود شد خبرم کن» ─────────────
// one row per subscription (the storefront's POST /products/{id}/stock-alerts); a variant's `stockAlertSubscribers` counts its ACTIVE ones
let ALERT_SEQ = 900;
export const stockAlerts = [];
products.forEach((p) =>
	p.variants.forEach((v, k) => {
		for (let i = 0; i < v.stockAlertSubscribers; i++) stockAlerts.push({ id: ++ALERT_SEQ, productId: p.id, variantId: v.id, status: "ACTIVE", createdAt: NOW - (i * 2 + k + 1) * 9 * HOUR });
	}),
);
// «هر رنگی» — subscriptions to a whole product (no colour chosen)
[products[2], products[6]].forEach((p, i) => {
	for (let k = 0; k < 2 + i; k++) stockAlerts.push({ id: ++ALERT_SEQ, productId: p.id, variantId: null, status: "ACTIVE", createdAt: NOW - (k + 2) * DAY });
});

route("GET", "/admin/stock-alerts", (ctx) => {
	staff(ctx, ...ROLES);
	const q = ctx.query;
	const groups = new Map();
	for (const a of stockAlerts) {
		if (a.status !== "ACTIVE") continue;
		if (q.productId && a.productId !== Number(q.productId)) continue;
		const key = `${a.productId}:${a.variantId ?? "*"}`;
		const g = groups.get(key) || { productId: a.productId, variantId: a.variantId, waitingCount: 0, oldestAt: a.createdAt };
		g.waitingCount += 1;
		g.oldestAt = Math.min(g.oldestAt, a.createdAt);
		groups.set(key, g);
	}
	let list = [...groups.values()].map((g) => {
		const p = productById(g.productId);
		const v = g.variantId ? p.variants.find((x) => x.id === g.variantId) : null;
		const qty = v ? available(v) : p.variants.filter((x) => x.isActive).reduce((n, x) => n + available(x), 0);
		const def = v || p.variants.find((x) => x.isDefault) || p.variants[0];
		return {
			product: { id: p.id, slug: p.slug, sku: p.sku, name: p.name, imageUrl: def ? variantImage(p, def) : null, colorKey: v?.colorKey ?? null },
			variantId: g.variantId, color: v ? colorView(v.colorKey) : null, sku: v?.sku ?? null, waitingCount: g.waitingCount, oldestAt: iso(g.oldestAt),
			stockStatus: stockStatusOf(qty, LOW), availableQuantity: qty,
		};
	});
	if (q.inStock === "true") list = list.filter((x) => x.availableQuantity > 0);
	if (q.inStock === "false") list = list.filter((x) => x.availableQuantity === 0);
	list.sort((a, b) => b.waitingCount - a.waitingCount || a.oldestAt.localeCompare(b.oldestAt));
	return paginate(list, q, 20);
});

// ───────────── inventory ─────────────
const adjustments = [];
products.slice(0, 10).forEach((p, i) =>
	p.variants.slice(0, 2).forEach((v, k) =>
		adjustments.push({ id: ++ADJ_SEQ, variantId: v.id, sku: v.sku, delta: 10 + ((i + k) % 3) * 5, reason: "RESTOCK", note: "ورود کالا از کارگاه", stockAfter: v.stockOnHand, createdAt: NOW - (i * 2 + k + 1) * DAY, createdBy: "نیما رضایی" }),
	),
);
adjustments.push({ id: ++ADJ_SEQ, variantId: products[3].variants[0].id, sku: products[3].variants[0].sku, delta: -1, reason: "DAMAGED", note: "خط روی چرم", stockAfter: products[3].variants[0].stockOnHand, createdAt: NOW - 5 * HOUR, createdBy: "نیما رضایی" });
adjustments.sort((a, b) => b.createdAt - a.createdAt);
const adjustmentView = (a) => ({ ...a, createdAt: iso(a.createdAt) });

/**
 * One stock change and its log row; a colour that was sold out and comes back sends «موجود شد» to its waiting list.
 * Also used by a return's receipt (`RETURNED`, mock/admin/orders.mjs).
 */
export function adjustStock({ p, v }, delta, reason, note, by) {
	const wasOut = available(v) === 0;
	v.stockOnHand += delta;
	if (wasOut && available(v) > 0) {
		const waiting = stockAlerts.filter((x) => x.status === "ACTIVE" && (x.variantId === v.id || (x.variantId == null && x.productId === p.id)));
		if (waiting.length) console.log(`  [sms] «موجود شد» → ${waiting.length} مشترک ${v.sku}`);
		waiting.forEach((x) => (x.status = "NOTIFIED"));
		v.stockAlertSubscribers = stockAlerts.filter((x) => x.status === "ACTIVE" && x.variantId === v.id).length;
	}
	p.updatedAt = Date.now();
	const a = { id: ++ADJ_SEQ, variantId: v.id, sku: v.sku, delta, reason, note, stockAfter: v.stockOnHand, createdAt: Date.now(), createdBy: by };
	adjustments.unshift(a);
	return a;
}

route("POST", "/admin/inventory/adjustments", (ctx) => {
	const me = staff(ctx, ...ROLES);
	const { variantId, delta, reason, note = null } = ctx.body || {};
	checker()
		.need(Number.isInteger(delta) && delta !== 0, "delta", "تغییر موجودی باید عدد صحیح غیرصفر باشه.")
		.need(REASONS.includes(reason), "reason", "دلیل رو انتخاب کن.")
		.need(!note || String(note).length <= 300, "note", "یادداشت حداکثر ۳۰۰ حرف.")
		.done();
	const found = variantById(variantId) || notFound("VARIANT_NOT_FOUND", "این رنگ پیدا نشد.");
	if (found.v.stockOnHand + delta < 0) fail(422, "QUANTITY_EXCEEDS_STOCK", `موجودی فیزیکی فقط ${found.v.stockOnHand.toLocaleString("fa-IR")} عدده.`, { meta: { stockOnHand: found.v.stockOnHand } });
	ctx.status = 201;
	return adjustmentView(adjustStock(found, delta, reason, note?.trim() || null, fullNameOf(me) || me.phone));
});
route("GET", "/admin/inventory/adjustments", (ctx) => {
	staff(ctx, ...ROLES);
	const vid = ctx.query.variantId ? Number(ctx.query.variantId) : null;
	const { items, meta } = paginate(vid ? adjustments.filter((a) => a.variantId === vid) : adjustments, ctx.query, 20);
	return { items: items.map(adjustmentView), meta };
});

// ───────────── categories ─────────────
function checkCategory(b, self) {
	checker()
		.need(nonEmpty(b.name), "name", "نام دسته لازمه.")
		.need(SLUG.test(b.slug || ""), "slug", "slug فقط حروف کوچک لاتین، رقم و خط تیره؛ حداقل یک حرف.")
		.need(!b.iconBagType || BAG_TYPES.includes(b.iconBagType), "iconBagType", "نوع کیف آیکن معتبر نیست.")
		.need(!b.iconColorKey || !!colorByKey(b.iconColorKey), "iconColorKey", "رنگ آیکن معتبر نیست.")
		.need(!b.imageMediaId || assets.has(b.imageMediaId), "imageMediaId", "عکس پیدا نشد؛ دوباره آپلود کن.")
		.need(!b.seo?.description || String(b.seo.description).length <= 170, "seo.description", "توضیح SEO حداکثر ۱۷۰ حرف.")
		.done();
	if (categories.some((c) => c !== self && c.slug === b.slug)) fail(409, "DUPLICATE_SLUG", "این slug قبلاً برای دسته‌ی دیگری ثبت شده.", { errors: [{ field: "slug", code: "DUPLICATE_SLUG", message: "این slug تکراریه." }] });
}
const applyCategory = (c, b) =>
	Object.assign(c, {
		name: String(b.name).trim(), slug: b.slug, description: b.description ?? null, iconBagType: b.iconBagType || c.iconBagType || "HOBO", iconColorKey: b.iconColorKey || c.iconColorKey || "lilac",
		imageMediaId: "imageMediaId" in b ? b.imageMediaId : (c.imageMediaId ?? null), sortOrder: b.sortOrder ?? c.sortOrder ?? categories.length + 1, showInMenu: b.showInMenu ?? true,
		seo: { title: null, description: null, canonicalUrl: null, ogImageUrl: null, noIndex: false, jsonLd: null, ...(b.seo || {}) },
	});
const sortedCategories = () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder).map(categoryView);

route("GET", "/categories", () => sortedCategories().filter((c) => c.showInMenu));
route("GET", "/admin/categories", (ctx) => {
	staff(ctx, ...ROLES);
	return sortedCategories();
});
route("POST", "/admin/categories", (ctx) => {
	staff(ctx, ...ROLES);
	const b = ctx.body || {};
	checkCategory(b);
	const c = applyCategory({ id: ++CATEGORY_SEQ }, b);
	categories.push(c);
	ctx.status = 201;
	return categoryView(c);
});
route("PUT", "/admin/categories/:id", (ctx) => {
	staff(ctx, ...ROLES);
	const c = categoryById(ctx.params.id) || notFound("NOT_FOUND", "دسته‌بندی پیدا نشد.");
	const b = ctx.body || {};
	checkCategory(b, c);
	applyCategory(c, b);
	return categoryView(c);
});
route("DELETE", "/admin/categories/:id", (ctx) => {
	staff(ctx, ...ROLES);
	const c = categoryById(ctx.params.id) || notFound("NOT_FOUND", "دسته‌بندی پیدا نشد.");
	const count = products.filter((p) => p.categoryId === c.id).length;
	if (count) fail(409, "IN_USE", `این دسته ${count.toLocaleString("fa-IR")} محصول دارد (با پیش‌نویس و آرشیو)؛ اول محصول‌ها را به دسته‌ی دیگری ببر.`, { meta: { productCount: count } });
	categories.splice(categories.indexOf(c), 1);
	ctx.status = 204;
});

// ───────────── colours & materials ─────────────
function checkColor(b) {
	checker()
		.need(/^[a-z][a-z0-9-]{1,30}$/.test(b.key || ""), "key", "کلید رنگ: حروف کوچک لاتین، رقم و خط تیره (مثل lilac).")
		.need(nonEmpty(b.name), "name", "نام رنگ لازمه.")
		.need(/^#[0-9A-Fa-f]{6}$/.test(b.hex || ""), "hex", "کد رنگ مثل #C8B6E2.")
		.done();
}
route("GET", "/colors", () => [...colors].sort((a, b) => a.sortOrder - b.sortOrder).map(colorFull));
route("POST", "/admin/colors", (ctx) => {
	staff(ctx, ...ROLES);
	const b = ctx.body || {};
	checkColor(b);
	if (colorByKey(b.key)) fail(409, "DUPLICATE_SLUG", "این کلید رنگ قبلاً ثبت شده.", { errors: [{ field: "key", code: "DUPLICATE", message: "این کلید تکراریه." }] });
	const c = { key: b.key, name: b.name.trim(), hex: b.hex.toUpperCase(), isLight: !!b.isLight, sortOrder: b.sortOrder ?? colors.length + 1 };
	colors.push(c);
	ctx.status = 201;
	return colorFull(c);
});
route("PUT", "/admin/colors/:key", (ctx) => {
	staff(ctx, ...ROLES);
	const c = colorByKey(ctx.params.key) || notFound("NOT_FOUND", "رنگ پیدا نشد.");
	const b = { ...ctx.body, key: c.key };
	checkColor(b);
	Object.assign(c, { name: b.name.trim(), hex: b.hex.toUpperCase(), isLight: !!b.isLight, sortOrder: b.sortOrder ?? c.sortOrder });
	return colorFull(c);
});
route("DELETE", "/admin/colors/:key", (ctx) => {
	staff(ctx, ...ROLES);
	const c = colorByKey(ctx.params.key) || notFound("NOT_FOUND", "رنگ پیدا نشد.");
	const count = products.filter((p) => p.variants.some((v) => v.colorKey === c.key)).length;
	if (count) fail(409, "IN_USE", `${count.toLocaleString("fa-IR")} محصول این رنگ را دارند؛ برای کنار گذاشتنش ورینت‌هایش را غیرفعال کن.`, { meta: { productCount: count } });
	colors.splice(colors.indexOf(c), 1);
	ctx.status = 204;
});
route("GET", "/materials", () => materials.map(materialView));
let MATERIAL_SEQ = Math.max(0, ...materials.map((m) => m.id));
function checkMaterial(b, self = null) {
	checker()
		.need(nonEmpty(b.name), "name", "نام متریال لازمه.")
		.need(SLUG.test(b.slug || ""), "slug", "slug فقط حروف کوچک لاتین، رقم و خط تیره؛ حداقل یک حرف.")
		.need(FAMILIES.includes(b.family), "family", "خانواده‌ی متریال رو انتخاب کن.")
		.done();
	if (materials.some((m) => m.slug === b.slug && m !== self)) fail(409, "DUPLICATE_SLUG", "این slug قبلاً ثبت شده.", { errors: [{ field: "slug", code: "DUPLICATE_SLUG", message: "این slug تکراریه." }] });
}
const materialFields = (b) => ({ name: b.name.trim(), slug: b.slug, family: b.family, description: b.description?.trim() || null, careInstructions: (b.careInstructions || []).map((x) => String(x).trim()).filter(Boolean) });
route("GET", "/admin/materials", (ctx) => {
	staff(ctx, ...ROLES);
	return materials.map(materialView);
});
route("PUT", "/admin/materials/:id", (ctx) => {
	staff(ctx, ...ROLES);
	const m = materialById(ctx.params.id) || notFound("NOT_FOUND", "متریال پیدا نشد.");
	const b = ctx.body || {};
	checkMaterial(b, m);
	Object.assign(m, materialFields(b));
	return materialView(m);
});
route("DELETE", "/admin/materials/:id", (ctx) => {
	staff(ctx, ...ROLES);
	const m = materialById(ctx.params.id) || notFound("NOT_FOUND", "متریال پیدا نشد.");
	const count = products.filter((p) => p.materialId === m.id).length;
	if (count) fail(409, "IN_USE", `${count.toLocaleString("fa-IR")} محصول از این متریال است (با پیش‌نویس و آرشیو).`, { meta: { productCount: count } });
	materials.splice(materials.indexOf(m), 1);
	ctx.status = 204;
});
route("POST", "/admin/materials", (ctx) => {
	staff(ctx, ...ROLES);
	const b = ctx.body || {};
	checkMaterial(b);
	const m = { id: ++MATERIAL_SEQ, ...materialFields(b) };
	materials.push(m);
	ctx.status = 201;
	return materialView(m);
});
