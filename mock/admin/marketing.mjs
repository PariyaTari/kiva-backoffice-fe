/**
 * Marketing: `/admin/discount-codes*` (ADMIN), `/admin/campaigns*`, `/admin/banners*`, `/admin/announcements`,
 * `/admin/testimonials*` (ADMIN, CONTENT_EDITOR), and the public reads the panel shows them from: `/config`
 * (announcements), `/testimonials` (published only — FEATURES §7 #3) and a slim `/products` for product pickers.
 */
import { DAY, HOUR, checker, fail, iso, listParam, normQ, notFound, paginate, route, SLUG } from "../lib.mjs";
import { staff } from "../auth.mjs";
import { assets } from "../media.mjs";
import { available, bagImage, categoryById, colorView, productById, products, stockStatusOf, variantCompareAt, variantImage, variantPrice } from "../catalog.mjs";
import * as D from "../data.mjs";

const NOW = Date.now();
const MARKETING = ["CONTENT_EDITOR"];
const CHANNELS = ["RUBIKA", "TELEGRAM", "BALE", "INSTAGRAM"];
const PLACEMENTS = ["HOME_HERO", "HOME_PROMO", "SHOP_TOP", "PRODUCT_SIDEBAR", "BLOG_TOP"];
const THEMES = ["CREAM", "PURPLE", "LILAC", "DARK", "WHITE"];
const nonEmpty = (v) => String(v ?? "").trim().length > 0;
const validDate = (v) => v == null || !Number.isNaN(Date.parse(v));

// ───────────── public product summaries (pickers) ─────────────
const summary = (p) => {
	const def = p.variants.find((v) => v.isDefault) || p.variants[0];
	const url = def ? variantImage(p, def) : null;
	return {
		id: p.id, slug: p.slug, sku: p.sku, name: p.name, url: `/product/${p.slug}`, category: categoryById(p.categoryId) ? { id: p.categoryId, slug: categoryById(p.categoryId).slug, name: categoryById(p.categoryId).name } : null,
		bagType: p.bagType, price: { price: p.price, compareAtPrice: p.compareAtPrice, discountPercent: p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0, currency: "IRT" },
		colors: p.variants.filter((v) => v.isActive).map((v) => ({ variantId: v.id, color: colorView(v.colorKey), stockStatus: stockStatusOf(available(v)), imageUrl: variantImage(p, v), thumbnailUrl: variantImage(p, v) })),
		defaultColorKey: def?.colorKey ?? null, image: url ? { id: `img_${p.id}`, type: "IMAGE", url, thumbnailUrl: url, alt: p.name } : null,
	};
};
route("GET", "/products", (ctx) => {
	const q = ctx.query;
	const ids = listParam(q.ids).map(Number);
	let list = products.filter((p) => p.status === "ACTIVE");
	if (ids.length) list = ids.map((id) => list.find((p) => p.id === id)).filter(Boolean);
	if (q.q) list = list.filter((p) => p.name.includes(normQ(q.q)) || p.sku.toLowerCase().includes(normQ(q.q).toLowerCase()));
	if (q.onSale === "true") list = list.filter((p) => p.compareAtPrice);
	const { items, meta } = paginate(list, q, 24);
	return { items: items.map(summary), meta, title: "فروشگاه کیوا", subtitle: null, breadcrumbs: [], appliedFilters: [], sort: "newest", facets: null };
});

// The storefront's product page (only what the panel reads: variants with colour, price and stock) — published only.
const STOCK_LABEL = { IN_STOCK: "موجود", LOW_STOCK: (n) => `فقط ${n.toLocaleString("fa-IR")} عدد در انبار باقی مونده`, OUT_OF_STOCK: "ناموجود" };
const publicProduct = (idOrSlug) => {
	const p = /^\d+$/.test(idOrSlug) ? productById(idOrSlug) : products.find((x) => x.slug === idOrSlug || x.sku === idOrSlug);
	if (!p || p.status !== "ACTIVE") notFound("PRODUCT_NOT_FOUND", "محصول پیدا نشد.");
	return p;
};
route("GET", "/products/:idOrSlug", (ctx) => {
	const p = publicProduct(ctx.params.idOrSlug);
	const variants = p.variants
		.filter((v) => v.isActive)
		.map((v) => {
			const n = available(v);
			const status = stockStatusOf(n);
			return {
				id: v.id, sku: v.sku, color: colorView(v.colorKey), isDefault: v.isDefault,
				price: { price: variantPrice(p, v), compareAtPrice: variantCompareAt(p, v), currency: "IRT" },
				stock: { status, availableQuantity: status === "LOW_STOCK" ? n : null, maxOrderQuantity: Math.min(n, p.maxPerOrder), label: status === "LOW_STOCK" ? STOCK_LABEL.LOW_STOCK(n) : STOCK_LABEL[status] },
				media: [{ id: `img_${v.id}`, type: "IMAGE", url: variantImage(p, v), thumbnailUrl: variantImage(p, v), alt: p.name }], hasVideo: false,
			};
		});
	return { ...summary(p), shortDescription: p.shortDescription, description: p.description, highlights: p.highlights, variants, specTable: [], breadcrumbs: [], ratingSummary: { average: p.rating.average, count: p.rating.count } };
});
// «محصولات مشابه» — same category first, then best sellers (the storefront's change-request «مدل دیگه» picks from these).
route("GET", "/products/:id/related", (ctx) => {
	const p = publicProduct(ctx.params.id);
	const limit = Math.min(24, Math.max(1, Number(ctx.query.limit) || 8));
	const others = products.filter((x) => x.status === "ACTIVE" && x.id !== p.id);
	const same = others.filter((x) => x.categoryId === p.categoryId);
	const rest = others.filter((x) => x.categoryId !== p.categoryId).sort((a, b) => b.soldCount - a.soldCount);
	return [...same, ...rest].slice(0, limit).map(summary);
});

// ───────────── discount codes ─────────────
let DISCOUNT_SEQ = 20;
const discounts = Object.entries(D.CODES).map(([code, c], i) => ({
	id: ++DISCOUNT_SEQ, code, type: c.type, value: c.value, label: c.label, minSubtotal: c.min ?? null, maxDiscount: c.type === "PERCENT" ? 500000 : null,
	startsAt: iso(NOW - 40 * DAY), endsAt: code === "PAEEZ15" ? iso(NOW + 20 * DAY) : null, usageLimit: code === "WELCOME" ? null : 1000, perUserLimit: 1,
	firstOrderOnly: code === "WELCOME", requiresLogin: code === "WELCOME", excludeSaleItems: code === "PAEEZ15", categoryIds: [], productIds: [], isActive: true,
	usedCount: [132, 418, 57][i], totalDiscountGiven: [16_400_000, 62_700_000, 9_800_000][i], createdAt: iso(NOW - (60 - i * 10) * DAY), updatedAt: iso(NOW - (30 - i * 5) * DAY),
}));
discounts.push({
	id: ++DISCOUNT_SEQ, code: "YALDA1404", type: "PERCENT", value: 20, label: "۲۰٪ تخفیف یلدا", minSubtotal: 1500000, maxDiscount: 700000, startsAt: iso(NOW - 300 * DAY), endsAt: iso(NOW - 290 * DAY),
	usageLimit: 500, perUserLimit: 1, firstOrderOnly: false, requiresLogin: false, excludeSaleItems: true, categoryIds: [1, 2], productIds: [], isActive: false, usedCount: 500, totalDiscountGiven: 98_000_000, createdAt: iso(NOW - 320 * DAY), updatedAt: iso(NOW - 289 * DAY),
});
function checkDiscount(b, self) {
	checker()
		.need(/^[A-Z0-9_-]{3,32}$/.test(b.code || ""), "code", "کد: ۳ تا ۳۲ حرف بزرگ لاتین، رقم، _ یا -.")
		.need(["PERCENT", "FIXED"].includes(b.type), "type", "نوع تخفیف را انتخاب کن.")
		.need(Number.isInteger(b.value) && b.value > 0 && (b.type !== "PERCENT" || b.value <= 100), "value", b.type === "PERCENT" ? "درصد بین ۱ تا ۱۰۰." : "مبلغ تخفیف را وارد کن.")
		.need(nonEmpty(b.label), "label", "متن نمایشی را بنویس.")
		.need(validDate(b.startsAt) && validDate(b.endsAt) && !(b.startsAt && b.endsAt && Date.parse(b.endsAt) <= Date.parse(b.startsAt)), "endsAt", "پایان باید بعد از شروع باشد.")
		.need(b.usageLimit == null || (Number.isInteger(b.usageLimit) && b.usageLimit > 0), "usageLimit", "سقف کل باید عدد مثبت باشد.")
		.need(b.perUserLimit == null || (Number.isInteger(b.perUserLimit) && b.perUserLimit > 0), "perUserLimit", "سقف هر کاربر باید عدد مثبت باشد.")
		.done();
	if (discounts.some((d) => d !== self && d.code === b.code)) fail(409, "DUPLICATE_SLUG", "این کد قبلاً ساخته شده.", { errors: [{ field: "code", code: "DUPLICATE", message: "این کد تکراریه." }] });
}
const applyDiscount = (d, b) =>
	Object.assign(d, {
		code: b.code, type: b.type, value: b.value, label: b.label.trim(), minSubtotal: b.minSubtotal ?? null, maxDiscount: b.type === "PERCENT" ? (b.maxDiscount ?? null) : null,
		startsAt: b.startsAt ?? null, endsAt: b.endsAt ?? null, usageLimit: b.usageLimit ?? null, perUserLimit: b.perUserLimit ?? null, firstOrderOnly: !!b.firstOrderOnly,
		requiresLogin: !!b.requiresLogin, excludeSaleItems: !!b.excludeSaleItems, categoryIds: b.categoryIds ?? [], productIds: b.productIds ?? [], isActive: b.isActive ?? true, updatedAt: iso(Date.now()),
	});
route("GET", "/admin/discount-codes", (ctx) => {
	staff(ctx);
	const a = ctx.query.active;
	const list = discounts.filter((d) => a == null || a === "" || String(d.isActive) === a).sort((x, y) => Date.parse(y.createdAt) - Date.parse(x.createdAt));
	return paginate(list, ctx.query, 20);
});
route("POST", "/admin/discount-codes", (ctx) => {
	staff(ctx);
	const b = { ...ctx.body, code: String(ctx.body?.code ?? "").toUpperCase() };
	checkDiscount(b);
	const d = applyDiscount({ id: ++DISCOUNT_SEQ, usedCount: 0, totalDiscountGiven: 0, createdAt: iso(Date.now()) }, b);
	discounts.push(d);
	ctx.status = 201;
	return d;
});
route("PUT", "/admin/discount-codes/:id", (ctx) => {
	staff(ctx);
	const d = discounts.find((x) => x.id === Number(ctx.params.id)) || notFound("NOT_FOUND", "کد تخفیف پیدا نشد.");
	const b = { ...ctx.body, code: String(ctx.body?.code ?? "").toUpperCase() };
	checkDiscount(b, d);
	return applyDiscount(d, b);
});
route("DELETE", "/admin/discount-codes/:id", (ctx) => {
	staff(ctx);
	const d = discounts.find((x) => x.id === Number(ctx.params.id)) || notFound("NOT_FOUND", "کد تخفیف پیدا نشد.");
	d.isActive = false;
	ctx.status = 204;
});

// ───────────── campaigns ─────────────
let CAMPAIGN_SEQ = 4;
const campaigns = [
	{ id: ++CAMPAIGN_SEQ, slug: "paeez-1405", title: "جشنواره پاییزه", subtitle: "تا پایان جشنواره فرصت داری", icon: "fire", startsAt: NOW - 5 * DAY, endsAt: NOW + 6 * DAY + 5 * HOUR, productIds: [], isActive: true },
	{ id: ++CAMPAIGN_SEQ, slug: "yalda-1404", title: "یلدای کیوا", subtitle: "بلندترین شب، بیشترین تخفیف", icon: "sparkle", startsAt: NOW - 300 * DAY, endsAt: NOW - 296 * DAY, productIds: [2, 4, 7], isActive: false },
];
/** `productIds` (or every published product) with a discount and a colour in stock, biggest discount first. */
const campaignProducts = (c) =>
	(c.productIds.length ? c.productIds.map(productById).filter(Boolean) : products)
		.filter((p) => p.status === "ACTIVE" && p.compareAtPrice && p.variants.some((v) => v.isActive && available(v) > 0))
		.sort((a, b) => b.compareAtPrice / b.price - a.compareAtPrice / a.price);
// `AdminCampaign` = `Campaign` + the stored choice of products (1.5.0)
const campaignView = (c) => ({
	id: c.id, slug: c.slug, title: c.title, subtitle: c.subtitle, icon: c.icon, startsAt: iso(c.startsAt), endsAt: iso(c.endsAt), serverTime: iso(Date.now()),
	products: campaignProducts(c).slice(0, 24).map(summary), seeAllUrl: `/products?campaign=${c.slug}`, isActive: c.isActive, productIds: c.productIds,
});
function checkCampaign(b, self) {
	const ids = (b.productIds || []).map(Number);
	const c = checker()
		.need(SLUG.test(b.slug || "") && String(b.slug).length <= 60, "slug", "slug فقط حروف کوچک لاتین، رقم و خط تیره (حداکثر ۶۰).", "SLUG_INVALID")
		.need(nonEmpty(b.title) && String(b.title).trim().length <= 80, "title", "عنوان ۱ تا ۸۰ حرف.")
		.need(!b.subtitle || String(b.subtitle).length <= 120, "subtitle", "زیرعنوان حداکثر ۱۲۰ حرف.")
		.need(!!b.startsAt && validDate(b.startsAt), "startsAt", "زمان شروع را وارد کن.")
		.need(!!b.endsAt && validDate(b.endsAt) && Date.parse(b.endsAt) > Date.parse(b.startsAt), "endsAt", "پایان باید بعد از شروع باشد.", "DATE_RANGE_INVALID")
		.need(ids.length <= 200, "productIds", "حداکثر ۲۰۰ محصول.")
		.need(new Set(ids).size === ids.length, "productIds", "محصول تکراری در لیست است.", "LIST_ITEM_DUPLICATE");
	ids.forEach((id, i) => c.need(!!productById(id) && productById(id).status !== "ARCHIVED", `productIds.${i}`, "این محصول پیدا نشد یا بایگانی شده.", "PRODUCT_NOT_FOUND"));
	c.done();
	if (campaigns.some((x) => x !== self && x.slug === b.slug)) fail(409, "DUPLICATE_SLUG", "این slug قبلاً استفاده شده.", { errors: [{ field: "slug", code: "DUPLICATE_SLUG", message: "این slug تکراریه." }] });
	// two active campaigns never overlap — only one runs on the site at a time
	const from = Date.parse(b.startsAt), to = Date.parse(b.endsAt);
	const clash = (b.isActive ?? true) && campaigns.find((x) => x !== self && x.isActive && x.startsAt < to && from < x.endsAt);
	if (clash) fail(409, "CAMPAIGN_OVERLAP", "بازه‌ی این کمپین با یک کمپین فعال دیگر هم‌پوشانی دارد.", { meta: { campaignId: clash.id } });
}
// `PUT` replaces everything (1.21.0): an optional field left out is `null` / its default
const applyCampaign = (c, b) =>
	Object.assign(c, { slug: b.slug, title: b.title.trim(), subtitle: b.subtitle?.trim() || null, icon: b.icon || null, startsAt: Date.parse(b.startsAt), endsAt: Date.parse(b.endsAt), productIds: (b.productIds || []).map(Number), isActive: b.isActive ?? true });
route("GET", "/campaigns/active", (ctx) => {
	const c = campaigns.find((x) => x.isActive && x.startsAt <= Date.now() && x.endsAt > Date.now());
	if (!c) {
		ctx.status = 204;
		return;
	}
	return campaignView(c);
});
route("GET", "/admin/campaigns", (ctx) => {
	staff(ctx, ...MARKETING);
	return [...campaigns].sort((a, b) => b.startsAt - a.startsAt).map(campaignView);
});
route("POST", "/admin/campaigns", (ctx) => {
	staff(ctx, ...MARKETING);
	checkCampaign(ctx.body || {});
	const c = applyCampaign({ id: ++CAMPAIGN_SEQ }, ctx.body);
	campaigns.push(c);
	ctx.status = 201;
	return campaignView(c);
});
route("PUT", "/admin/campaigns/:id", (ctx) => {
	staff(ctx, ...MARKETING);
	const c = campaigns.find((x) => x.id === Number(ctx.params.id)) || notFound("NOT_FOUND", "کمپین پیدا نشد.");
	checkCampaign(ctx.body || {}, c);
	return campaignView(applyCampaign(c, ctx.body));
});
// display only — deleting one changes no price
route("DELETE", "/admin/campaigns/:id", (ctx) => {
	staff(ctx, ...MARKETING);
	const i = campaigns.findIndex((x) => x.id === Number(ctx.params.id));
	if (i < 0) notFound("NOT_FOUND", "کمپین پیدا نشد.");
	campaigns.splice(i, 1);
	ctx.status = 204;
});

// ───────────── banners ─────────────
let BANNER_SEQ = 0;
const seedImage = (bag, color) => ({ id: `bn_${bag}_${color}`, type: "IMAGE", url: bagImage(bag, color, 1), thumbnailUrl: bagImage(bag, color, 1), alt: null });
const banners = [
	{ placement: "HOME_PROMO", theme: "CREAM", tagLabel: "رزرو ۴ روزه", tagIcon: "timer", title: "الان بخر،\nهمه رو یکجا تحویل بگیر", text: "پول کیف رو بده و تا ۴ روز رزروش کن؛ هر خرید دیگه‌ای هم داشتی، همه با یک هزینه ارسال می‌رسه.", ctaLabel: "بیشتر بدونم", ctaUrl: "/faq#reserve", image: seedImage("HOBO", "pink"), overlayHighlight: "4", overlayTitle: "روز رزرو", overlaySubtitle: "یک هزینه ارسال", overlayChannel: null, sortOrder: 1, startsAt: null, endsAt: null },
	{ placement: "HOME_PROMO", theme: "PURPLE", tagLabel: "امضای کیوا", tagIcon: "camera", title: "کیف خودت رو\nقبل از ارسال ببین", text: "پیام‌رسانت رو انتخاب کن؛ عکس و ویدیوی کیفی که برات بسته‌بندی می‌کنیم همون‌جا و توی حسابت می‌رسه.", ctaLabel: "چطوری؟", ctaUrl: "/#how", image: seedImage("SATCHEL", "olive"), overlayHighlight: null, overlayTitle: "عکس کیف شما", overlaySubtitle: "در بله ارسال شد", overlayChannel: "BALE", sortOrder: 2, startsAt: null, endsAt: null },
	{ placement: "SHOP_TOP", theme: "LILAC", tagLabel: "جشنواره پاییزه", tagIcon: "fire", title: "تا ۲۰٪ تخفیف کیف‌های پاییزی", text: "رنگ‌های گرم فصل با عکس واقعی قبل از ارسال.", ctaLabel: "دیدن حراج", ctaUrl: "/products?onSale=true", image: seedImage("TOTE", "caramel"), overlayHighlight: null, overlayTitle: null, overlaySubtitle: null, overlayChannel: null, sortOrder: 1, startsAt: iso(NOW - 5 * DAY), endsAt: iso(NOW + 6 * DAY) },
].map((b) => ({ id: ++BANNER_SEQ, ...b }));
const bannerView = (b) => ({
	id: b.id, placement: b.placement, theme: b.theme, tag: b.tagLabel ? { label: b.tagLabel, icon: b.tagIcon } : null, title: b.title, text: b.text || null,
	// a banner without a button: `cta = null` (1.21.0)
	cta: b.ctaLabel && b.ctaUrl ? { label: b.ctaLabel, url: b.ctaUrl } : null, image: b.image,
	overlay: b.overlayTitle || b.overlayHighlight || b.overlaySubtitle || b.overlayChannel ? { highlight: b.overlayHighlight, title: b.overlayTitle, subtitle: b.overlaySubtitle, channel: b.overlayChannel } : null,
	sortOrder: b.sortOrder, startsAt: b.startsAt, endsAt: b.endsAt,
});
function bannerFrom(b, prev) {
	const len = (v) => String(v ?? "").trim().length;
	checker()
		.need(PLACEMENTS.includes(b.placement), "placement", "جایگاه را انتخاب کن.")
		.need(!b.theme || THEMES.includes(b.theme), "theme", "تم معتبر نیست.")
		.need(len(b.title) >= 1 && len(b.title) <= 80, "title", "عنوان ۱ تا ۸۰ حرف.")
		.need(len(b.text) <= 200, "text", "متن حداکثر ۲۰۰ حرف.")
		.need(len(b.tagLabel) <= 30, "tagLabel", "برچسب حداکثر ۳۰ حرف.")
		.need(!len(b.ctaLabel) === !len(b.ctaUrl), "ctaUrl", "متن و لینک دکمه با هم، یا هیچ‌کدام.", "CTA_INCOMPLETE")
		.need(!len(b.ctaUrl) || /^(https:\/\/\S+|\/\S*)$/.test(String(b.ctaUrl).trim()), "ctaUrl", "آدرس کامل https:// یا مسیری از همین سایت با /.", "URL_INVALID")
		.need(!!b.imageMediaId, "imageMediaId", "عکس بنر را آپلود کن.", "IMAGE_REQUIRED")
		.need(!b.imageMediaId || assets.has(b.imageMediaId) || b.imageMediaId === prev?.image?.id, "imageMediaId", "عکس پیدا نشد؛ دوباره آپلود کن.", "MEDIA_NOT_FOUND")
		.need(!b.overlayChannel || CHANNELS.includes(b.overlayChannel), "overlayChannel", "پیام‌رسان معتبر نیست.")
		.need(validDate(b.startsAt) && validDate(b.endsAt) && !(b.startsAt && b.endsAt && Date.parse(b.endsAt) <= Date.parse(b.startsAt)), "endsAt", "پایان باید بعد از شروع باشد.", "DATE_RANGE_INVALID")
		.done();
	const a = assets.get(b.imageMediaId);
	return {
		placement: b.placement, theme: b.theme || "CREAM", tagLabel: b.tagLabel?.trim() || null, tagIcon: b.tagIcon || null, title: b.title.trim(), text: b.text?.trim() || null,
		ctaLabel: b.ctaLabel?.trim() || null, ctaUrl: b.ctaUrl?.trim() || null,
		image: a ? { id: a.id, type: a.type, url: a.url, thumbnailUrl: a.thumbnailUrl, alt: a.alt } : prev?.image ?? null,
		overlayHighlight: b.overlayHighlight || null, overlayTitle: b.overlayTitle || null, overlaySubtitle: b.overlaySubtitle || null, overlayChannel: b.overlayChannel || null,
		sortOrder: b.sortOrder ?? 0, startsAt: b.startsAt ?? null, endsAt: b.endsAt ?? null,
	};
}
const sortedBanners = () => [...banners].sort((a, b) => PLACEMENTS.indexOf(a.placement) - PLACEMENTS.indexOf(b.placement) || a.sortOrder - b.sortOrder);
route("GET", "/banners", (ctx) => sortedBanners().filter((b) => (!ctx.query.placement || b.placement === ctx.query.placement) && (!b.startsAt || Date.parse(b.startsAt) <= Date.now()) && (!b.endsAt || Date.parse(b.endsAt) > Date.now())).map(bannerView));
route("GET", "/admin/banners", (ctx) => {
	staff(ctx, ...MARKETING);
	return sortedBanners().map(bannerView);
});
route("POST", "/admin/banners", (ctx) => {
	staff(ctx, ...MARKETING);
	const b = { id: ++BANNER_SEQ, ...bannerFrom(ctx.body || {}) };
	banners.push(b);
	ctx.status = 201;
	return bannerView(b);
});
route("PUT", "/admin/banners/:id", (ctx) => {
	staff(ctx, ...MARKETING);
	const b = banners.find((x) => x.id === Number(ctx.params.id)) || notFound("NOT_FOUND", "بنر پیدا نشد.");
	Object.assign(b, bannerFrom(ctx.body || {}, b));
	return bannerView(b);
});
route("DELETE", "/admin/banners/:id", (ctx) => {
	staff(ctx, ...MARKETING);
	const i = banners.findIndex((x) => x.id === Number(ctx.params.id));
	if (i < 0) notFound("NOT_FOUND", "بنر پیدا نشد.");
	banners.splice(i, 1);
	ctx.status = 204;
});

// ───────────── announcements (+ GET /config) ─────────────
let ANN_SEQ = 0;
export let announcements = [
	{ icon: "camera", text: "هرچی ببینی، همون می‌رسه — قبل از ارسال، عکس کیف خودت رو برات می‌فرستیم", url: "/#how" },
	{ icon: "truck", text: "ارسال رایگان با پست برای خریدهای بالای ۳ میلیون تومان", url: null },
	{ icon: "timer", text: "رزرو ۴ روزه: چند خرید، یک هزینه‌ی ارسال", url: "/faq#reserve" },
].map((a, i) => ({ id: ++ANN_SEQ, ...a, sortOrder: i + 1, startsAt: null, endsAt: null }));
/** `/config` — other parts (shipping, support, gateways…) come with the settings phase. */
export const configParts = { announcements: () => announcements.filter((a) => (!a.startsAt || Date.parse(a.startsAt) <= Date.now()) && (!a.endsAt || Date.parse(a.endsAt) > Date.now())) };
route("GET", "/config", () => Object.fromEntries(Object.entries(configParts).map(([k, f]) => [k, f()])));
// 1.5.0 — every message, scheduled and ended ones too, in their order
route("GET", "/admin/announcements", (ctx) => {
	staff(ctx, ...MARKETING);
	return announcements;
});
route("PUT", "/admin/announcements", (ctx) => {
	staff(ctx, ...MARKETING);
	const list = Array.isArray(ctx.body) ? ctx.body : fail(400, "VALIDATION_ERROR", "لیست پیام‌ها لازمه.");
	// a root array: errors at `{i}.field`
	const c = checker().need(list.length <= 10, "announcements", "حداکثر ۱۰ پیام.");
	list.forEach((a, i) => {
		c.need(nonEmpty(a.text) && String(a.text).length <= 200, `${i}.text`, "متن پیام لازم است (حداکثر ۲۰۰ حرف).");
		c.need(!a.url || /^(https:\/\/\S+|\/(?!\/)\S*)$/.test(a.url), `${i}.url`, "لینک با https:// یا مسیری از همین سایت با /.", "URL_INVALID");
		c.need(validDate(a.startsAt) && validDate(a.endsAt) && !(a.startsAt && a.endsAt && Date.parse(a.endsAt) <= Date.parse(a.startsAt)), `${i}.endsAt`, "پایان باید بعد از شروع باشد.");
	});
	c.done();
	// order = array order; with `id` the same message, without it a new one
	announcements = list.map((a, i) => ({ id: a.id ?? ++ANN_SEQ, icon: a.icon || null, text: a.text.trim(), url: a.url || null, sortOrder: i, startsAt: a.startsAt ?? null, endsAt: a.endsAt ?? null }));
	return announcements;
});

// ───────────── testimonials ─────────────
let TESTIMONIAL_SEQ = 0;
const testimonials = D.TESTIMONIALS.map((t, i) => ({
	id: ++TESTIMONIAL_SEQ, customerName: t.n, city: t.c, source: t.s, message: t.t, messageTime: `${10 + (i % 9)}:${String((i * 7) % 60).padStart(2, "0")}`,
	receivedAt: NOW - (i * 3 + 2) * DAY, rating: 5, productId: t.p, colorKey: t.col, screenshot: null, isPublished: true, sortOrder: i + 1,
}));
testimonials.push({ id: ++TESTIMONIAL_SEQ, customerName: "نرگس", city: "کرج", source: "TELEGRAM", message: "هنوز تأیید نشده — پیش‌نویس", messageTime: "09:40", receivedAt: NOW - DAY, rating: 4, productId: 6, colorKey: "cream", screenshot: null, isPublished: false, sortOrder: 99 });
const SOURCE_NAME = { RUBIKA: "روبیکا", TELEGRAM: "تلگرام", BALE: "بله", INSTAGRAM: "اینستاگرام" };
const testimonialView = (t) => {
	const p = productById(t.productId);
	return {
		id: t.id, customerName: t.customerName, customerInitial: t.customerName[0], city: t.city, source: t.source, sourceName: SOURCE_NAME[t.source], message: t.message,
		messageTime: t.messageTime, receivedAt: iso(t.receivedAt), rating: t.rating,
		product: p ? { id: p.id, slug: p.slug, sku: p.sku, name: p.name, imageUrl: variantImage(p, p.variants[0]), colorKey: t.colorKey } : null,
		color: t.colorKey ? colorView(t.colorKey) : null, screenshotUrl: t.screenshot?.url ?? null,
		// `AdminTestimonial` (1.5.0) — what only the edit form needs
		isPublished: t.isPublished, sortOrder: t.sortOrder, screenshotMediaId: t.screenshot?.id ?? null, createdAt: iso(t.createdAt ?? t.receivedAt ?? NOW),
	};
};
function testimonialFrom(b, prev) {
	const len = (v) => String(v ?? "").trim().length;
	const p = productById(b.productId);
	checker()
		.need(len(b.customerName) >= 1 && len(b.customerName) <= 40, "customerName", "نام مشتری ۱ تا ۴۰ حرف.")
		.need(len(b.city) <= 40, "city", "شهر حداکثر ۴۰ حرف.")
		.need(CHANNELS.includes(b.source), "source", "منبع پیام را انتخاب کن.")
		.need(len(b.message) >= 1 && String(b.message).length <= 500, "message", "متن پیام لازم است (حداکثر ۵۰۰ حرف).")
		.need(!!p && p.status !== "ARCHIVED", "productId", "این محصول پیدا نشد یا بایگانی شده.", "PRODUCT_NOT_FOUND")
		// the colour must be one of the product's (1.21.0)
		.need(!b.colorKey || !!p?.variants.some((v) => v.colorKey === b.colorKey), "colorKey", "این رنگ روی این محصول نیست.", "COLOR_NOT_FOUND")
		.need(b.rating == null || (Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5), "rating", "امتیاز ۱ تا ۵.")
		.need(!b.messageTime || /^\d{2}:\d{2}$/.test(b.messageTime), "messageTime", "ساعت مثل 09:17.")
		.need(!b.receivedAt || Date.parse(b.receivedAt) <= Date.now(), "receivedAt", "تاریخ دریافت بعد از الان نمی‌شود.", "DATE_IN_FUTURE")
		.need(!b.screenshotMediaId || assets.has(b.screenshotMediaId) || b.screenshotMediaId === prev?.screenshot?.id, "screenshotMediaId", "اسکرین‌شات پیدا نشد؛ دوباره آپلود کن.", "MEDIA_NOT_FOUND")
		.done();
	const shot = b.screenshotMediaId ? assets.get(b.screenshotMediaId) ?? prev?.screenshot ?? null : null;
	// `PUT` replaces everything: a field left out is `null` / its default
	return {
		customerName: b.customerName.trim(), city: b.city?.trim() || null, source: b.source, message: b.message.trim(), messageTime: b.messageTime || null,
		receivedAt: b.receivedAt ? Date.parse(b.receivedAt) : null, rating: b.rating ?? 5, productId: Number(b.productId),
		colorKey: b.colorKey || null, screenshot: shot, isPublished: b.isPublished ?? true, sortOrder: b.sortOrder ?? 0, createdAt: prev?.createdAt ?? Date.now(),
	};
}
// `sortOrder` up, then `receivedAt` down (undated last), then id down
const byTestimonialOrder = (a, b) => a.sortOrder - b.sortOrder || (b.receivedAt ?? -Infinity) - (a.receivedAt ?? -Infinity) || b.id - a.id;
route("GET", "/testimonials", (ctx) => {
	const list = testimonials.filter((t) => t.isPublished).sort(byTestimonialOrder);
	return { summary: { averageRating: 4.9, scale: 5, totalCount: 2480, metrics: [], sources: CHANNELS }, ...paginate(list.map(testimonialView), ctx.query, 20) };
});
// 1.5.0 — published and unpublished, same order as the storefront
route("GET", "/admin/testimonials", (ctx) => {
	staff(ctx, ...MARKETING);
	const { published } = ctx.query;
	if (published != null && published !== "" && !["true", "false"].includes(published)) fail(400, "VALIDATION_ERROR", "مقدار published معتبر نیست.", { errors: [{ field: "published", code: "BOOLEAN_INVALID", message: "فقط true یا false." }] });
	const list = testimonials.filter((t) => !published || String(t.isPublished) === published).sort(byTestimonialOrder);
	return paginate(list.map(testimonialView), ctx.query, 20);
});
route("POST", "/admin/testimonials", (ctx) => {
	staff(ctx, ...MARKETING);
	const t = { id: ++TESTIMONIAL_SEQ, ...testimonialFrom(ctx.body || {}) };
	testimonials.push(t);
	ctx.status = 201;
	return testimonialView(t);
});
route("PUT", "/admin/testimonials/:id", (ctx) => {
	staff(ctx, ...MARKETING);
	const t = testimonials.find((x) => x.id === Number(ctx.params.id)) || notFound("NOT_FOUND", "پیام رضایت پیدا نشد.");
	Object.assign(t, testimonialFrom(ctx.body || {}, t));
	return testimonialView(t);
});
route("DELETE", "/admin/testimonials/:id", (ctx) => {
	staff(ctx, ...MARKETING);
	const i = testimonials.findIndex((x) => x.id === Number(ctx.params.id));
	if (i < 0) notFound("NOT_FOUND", "پیام رضایت پیدا نشد.");
	testimonials.splice(i, 1);
	ctx.status = 204;
});

// ───────────── newsletter (ADMIN only — e-mails are personal data) ─────────────
const NEWSLETTER_NAMES = ["sara", "maryam", "niloofar", "zahra", "fatemeh", "reyhane", "mahsa", "elham", "parisa", "shirin", "negar", "yasaman", "ali", "reza", "hamid", "sina"];
const NEWSLETTER_HOSTS = ["gmail.com", "yahoo.com", "outlook.com", "chmail.ir"];
let NEWSLETTER_SEQ = 300;
const subscriptions = Array.from({ length: 46 }, (_, i) => {
	const off = i % 7 === 3;
	const at = NOW - (i * 2.3 + 0.4) * DAY;
	return {
		id: ++NEWSLETTER_SEQ, email: `${NEWSLETTER_NAMES[i % NEWSLETTER_NAMES.length]}${i > 15 ? i : ""}@${NEWSLETTER_HOSTS[i % NEWSLETTER_HOSTS.length]}`,
		status: off ? "UNSUBSCRIBED" : "ACTIVE", source: ["footer", "footer", "blog", null, "checkout"][i % 5], subscribedAt: at, unsubscribedAt: off ? at + 6 * DAY : null,
	};
});
route("GET", "/admin/newsletter/subscriptions", (ctx) => {
	staff(ctx); // ADMIN only
	const { status, q } = ctx.query;
	if (status && !["ACTIVE", "UNSUBSCRIBED"].includes(status)) fail(400, "VALIDATION_ERROR", "وضعیت معتبر نیست.", { errors: [{ field: "status", code: "INVALID", message: "وضعیت معتبر نیست." }] });
	const term = String(q ?? "").trim().toLowerCase();
	const list = subscriptions.filter((s) => (!status || s.status === status) && (!term || s.email.includes(term))).sort((a, b) => b.subscribedAt - a.subscribedAt);
	const { items, meta } = paginate(list, ctx.query, 20);
	return { items: items.map((s) => ({ ...s, subscribedAt: iso(s.subscribedAt), unsubscribedAt: iso(s.unsubscribedAt) })), meta };
});
