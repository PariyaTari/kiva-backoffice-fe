/**
 * Marketing: `/admin/discount-codes*` (ADMIN), `/admin/campaigns*`, `/admin/banners*`, `/admin/announcements`,
 * `/admin/testimonials*` (ADMIN, CONTENT_EDITOR), and the public reads the panel shows them from: `/config`
 * (announcements), `/testimonials` (published only — FEATURES §7 #3) and a slim `/products` for product pickers.
 */
import { DAY, HOUR, checker, fail, iso, listParam, normQ, notFound, paginate, route, SLUG } from "../lib.mjs";
import { staff } from "../auth.mjs";
import { assets } from "../media.mjs";
import { bagImage, categoryById, colorByKey, colorView, productById, products, variantImage } from "../catalog.mjs";
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
		colors: p.variants.filter((v) => v.isActive).map((v) => ({ variantId: v.id, color: colorView(v.colorKey), stockStatus: "IN_STOCK", imageUrl: variantImage(p, v), thumbnailUrl: variantImage(p, v) })),
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

// ───────────── discount codes ─────────────
let DISCOUNT_SEQ = 20;
const discounts = Object.entries(D.CODES).map(([code, c], i) => ({
	id: ++DISCOUNT_SEQ, code, type: c.type, value: c.value, label: c.label, minSubtotal: c.min ?? null, maxDiscount: c.type === "PERCENT" ? 500000 : null,
	startsAt: iso(NOW - 40 * DAY), endsAt: code === "PAEEZ15" ? iso(NOW + 20 * DAY) : null, usageLimit: code === "WELCOME" ? null : 1000, perUserLimit: 1,
	firstOrderOnly: code === "WELCOME", requiresLogin: code === "WELCOME", excludeSaleItems: code === "PAEEZ15", categoryIds: [], productIds: [], isActive: true,
	usedCount: [132, 418, 57][i], totalDiscountGiven: [16_400_000, 62_700_000, 9_800_000][i], createdAt: iso(NOW - (60 - i * 10) * DAY),
}));
discounts.push({
	id: ++DISCOUNT_SEQ, code: "YALDA1404", type: "PERCENT", value: 20, label: "۲۰٪ تخفیف یلدا", minSubtotal: 1500000, maxDiscount: 700000, startsAt: iso(NOW - 300 * DAY), endsAt: iso(NOW - 290 * DAY),
	usageLimit: 500, perUserLimit: 1, firstOrderOnly: false, requiresLogin: false, excludeSaleItems: true, categoryIds: [1, 2], productIds: [], isActive: false, usedCount: 500, totalDiscountGiven: 98_000_000, createdAt: iso(NOW - 320 * DAY),
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
		startsAt: b.startsAt ?? null, endsAt: b.endsAt ?? null, usageLimit: b.usageLimit ?? null, perUserLimit: b.perUserLimit ?? 1, firstOrderOnly: !!b.firstOrderOnly,
		requiresLogin: !!b.requiresLogin, excludeSaleItems: !!b.excludeSaleItems, categoryIds: b.categoryIds ?? [], productIds: b.productIds ?? [], isActive: b.isActive ?? true,
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
const campaignProducts = (c) => (c.productIds.length ? c.productIds.map(productById).filter(Boolean) : products.filter((p) => p.status === "ACTIVE" && p.compareAtPrice));
const campaignView = (c) => ({
	id: c.id, slug: c.slug, title: c.title, subtitle: c.subtitle, icon: c.icon, startsAt: iso(c.startsAt), endsAt: iso(c.endsAt), serverTime: iso(Date.now()),
	products: campaignProducts(c).map(summary), seeAllUrl: "/products?onSale=true", isActive: c.isActive,
	// not in `Campaign` — the panel needs the chosen ids back to edit them (FEATURES §7 #21)
	productIds: c.productIds,
});
function checkCampaign(b, self) {
	checker()
		.need(SLUG.test(b.slug || ""), "slug", "slug فقط حروف کوچک لاتین، رقم و خط تیره.")
		.need(nonEmpty(b.title), "title", "عنوان را بنویس.")
		.need(!!b.startsAt && validDate(b.startsAt), "startsAt", "زمان شروع را وارد کن.")
		.need(!!b.endsAt && validDate(b.endsAt) && Date.parse(b.endsAt) > Date.parse(b.startsAt), "endsAt", "پایان باید بعد از شروع باشد.")
		.need((b.productIds || []).every((id) => productById(id)), "productIds", "یکی از محصول‌ها پیدا نشد.")
		.done();
	if (campaigns.some((c) => c !== self && c.slug === b.slug)) fail(409, "DUPLICATE_SLUG", "این slug قبلاً استفاده شده.", { errors: [{ field: "slug", code: "DUPLICATE_SLUG", message: "این slug تکراریه." }] });
}
const applyCampaign = (c, b) =>
	Object.assign(c, { slug: b.slug, title: b.title.trim(), subtitle: b.subtitle ?? "", icon: b.icon || "fire", startsAt: Date.parse(b.startsAt), endsAt: Date.parse(b.endsAt), productIds: (b.productIds || []).map(Number), isActive: b.isActive ?? true });
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

// ───────────── banners ─────────────
let BANNER_SEQ = 0;
const seedImage = (bag, color) => ({ id: `bn_${bag}_${color}`, type: "IMAGE", url: bagImage(bag, color, 1), thumbnailUrl: bagImage(bag, color, 1), alt: null });
const banners = [
	{ placement: "HOME_PROMO", theme: "CREAM", tagLabel: "رزرو ۴ روزه", tagIcon: "timer", title: "الان بخر،\nهمه رو یکجا تحویل بگیر", text: "پول کیف رو بده و تا ۴ روز رزروش کن؛ هر خرید دیگه‌ای هم داشتی، همه با یک هزینه ارسال می‌رسه.", ctaLabel: "بیشتر بدونم", ctaUrl: "/faq#reserve", image: seedImage("HOBO", "pink"), overlayHighlight: "4", overlayTitle: "روز رزرو", overlaySubtitle: "یک هزینه ارسال", overlayChannel: null, sortOrder: 1, startsAt: null, endsAt: null },
	{ placement: "HOME_PROMO", theme: "PURPLE", tagLabel: "امضای کیوا", tagIcon: "camera", title: "کیف خودت رو\nقبل از ارسال ببین", text: "پیام‌رسانت رو انتخاب کن؛ عکس و ویدیوی کیفی که برات بسته‌بندی می‌کنیم همون‌جا و توی حسابت می‌رسه.", ctaLabel: "چطوری؟", ctaUrl: "/#how", image: seedImage("SATCHEL", "olive"), overlayHighlight: null, overlayTitle: "عکس کیف شما", overlaySubtitle: "در بله ارسال شد", overlayChannel: "BALE", sortOrder: 2, startsAt: null, endsAt: null },
	{ placement: "SHOP_TOP", theme: "LILAC", tagLabel: "جشنواره پاییزه", tagIcon: "fire", title: "تا ۲۰٪ تخفیف کیف‌های پاییزی", text: "رنگ‌های گرم فصل با عکس واقعی قبل از ارسال.", ctaLabel: "دیدن حراج", ctaUrl: "/products?onSale=true", image: seedImage("TOTE", "caramel"), overlayHighlight: null, overlayTitle: null, overlaySubtitle: null, overlayChannel: null, sortOrder: 1, startsAt: iso(NOW - 5 * DAY), endsAt: iso(NOW + 6 * DAY) },
].map((b) => ({ id: ++BANNER_SEQ, ...b }));
const bannerView = (b) => ({
	id: b.id, placement: b.placement, theme: b.theme, tag: b.tagLabel ? { label: b.tagLabel, icon: b.tagIcon } : null, title: b.title, text: b.text,
	cta: { label: b.ctaLabel, url: b.ctaUrl }, image: b.image, overlay: b.overlayTitle || b.overlayHighlight ? { highlight: b.overlayHighlight, title: b.overlayTitle, subtitle: b.overlaySubtitle, channel: b.overlayChannel } : null,
	sortOrder: b.sortOrder, startsAt: b.startsAt, endsAt: b.endsAt,
});
function bannerFrom(b, prev) {
	checker()
		.need(PLACEMENTS.includes(b.placement), "placement", "جایگاه را انتخاب کن.")
		.need(!b.theme || THEMES.includes(b.theme), "theme", "تم معتبر نیست.")
		.need(nonEmpty(b.title), "title", "عنوان را بنویس.")
		.need(!b.imageMediaId || assets.has(b.imageMediaId) || b.imageMediaId === prev?.image?.id, "imageMediaId", "عکس پیدا نشد؛ دوباره آپلود کن.")
		.need(!b.overlayChannel || CHANNELS.includes(b.overlayChannel), "overlayChannel", "پیام‌رسان معتبر نیست.")
		.need(validDate(b.startsAt) && validDate(b.endsAt) && !(b.startsAt && b.endsAt && Date.parse(b.endsAt) <= Date.parse(b.startsAt)), "endsAt", "پایان باید بعد از شروع باشد.")
		.done();
	const a = b.imageMediaId ? assets.get(b.imageMediaId) : null;
	return {
		placement: b.placement, theme: b.theme || "CREAM", tagLabel: b.tagLabel || null, tagIcon: b.tagIcon || null, title: b.title.trim(), text: b.text ?? "", ctaLabel: b.ctaLabel ?? "", ctaUrl: b.ctaUrl ?? "",
		image: a ? { id: a.id, type: a.type, url: a.url, thumbnailUrl: a.thumbnailUrl, alt: a.alt } : b.imageMediaId ? prev?.image ?? null : null,
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
route("PUT", "/admin/announcements", (ctx) => {
	staff(ctx, ...MARKETING);
	const list = Array.isArray(ctx.body) ? ctx.body : fail(400, "VALIDATION_ERROR", "لیست پیام‌ها لازمه.");
	const c = checker();
	list.forEach((a, i) => {
		c.need(nonEmpty(a.text) && String(a.text).length <= 200, `[${i}].text`, "متن پیام لازم است (حداکثر ۲۰۰ حرف).");
		c.need(validDate(a.startsAt) && validDate(a.endsAt), `[${i}].endsAt`, "تاریخ معتبر نیست.");
	});
	c.done();
	announcements = list.map((a, i) => ({ id: a.id ?? ++ANN_SEQ, icon: a.icon || "info", text: a.text.trim(), url: a.url || null, sortOrder: a.sortOrder ?? i + 1, startsAt: a.startsAt ?? null, endsAt: a.endsAt ?? null }));
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
		color: colorView(t.colorKey), screenshotUrl: t.screenshot?.url ?? null,
		// not in `Testimonial` — the panel's edit form needs them (FEATURES §7 #3)
		isPublished: t.isPublished, sortOrder: t.sortOrder,
	};
};
function testimonialFrom(b, prev) {
	checker()
		.need(nonEmpty(b.customerName), "customerName", "نام مشتری را بنویس.")
		.need(CHANNELS.includes(b.source), "source", "منبع پیام را انتخاب کن.")
		.need(nonEmpty(b.message) && String(b.message).length <= 500, "message", "متن پیام لازم است (حداکثر ۵۰۰ حرف).")
		.need(!!productById(b.productId), "productId", "محصول را انتخاب کن.")
		.need(!b.colorKey || !!colorByKey(b.colorKey), "colorKey", "رنگ معتبر نیست.")
		.need(b.rating == null || (Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5), "rating", "امتیاز ۱ تا ۵.")
		.need(!b.messageTime || /^\d{1,2}:\d{2}$/.test(b.messageTime), "messageTime", "ساعت مثل 11:17.")
		.need(!b.screenshotMediaId || assets.has(b.screenshotMediaId), "screenshotMediaId", "اسکرین‌شات پیدا نشد؛ دوباره آپلود کن.")
		.done();
	const shot = "screenshotMediaId" in b ? (b.screenshotMediaId ? assets.get(b.screenshotMediaId) : null) : prev?.screenshot ?? null;
	return {
		customerName: b.customerName.trim(), city: b.city ?? "", source: b.source, message: b.message.trim(), messageTime: b.messageTime || "12:00",
		receivedAt: b.receivedAt ? Date.parse(b.receivedAt) : prev?.receivedAt ?? Date.now(), rating: b.rating ?? 5, productId: Number(b.productId),
		colorKey: b.colorKey || productById(b.productId).variants[0]?.colorKey, screenshot: shot, isPublished: b.isPublished ?? true, sortOrder: b.sortOrder ?? prev?.sortOrder ?? testimonials.length + 1,
	};
}
route("GET", "/testimonials", (ctx) => {
	const list = testimonials.filter((t) => t.isPublished).sort((a, b) => a.sortOrder - b.sortOrder);
	return { summary: { averageRating: 4.9, scale: 5, totalCount: 2480, metrics: [], sources: CHANNELS }, ...paginate(list.map(testimonialView), ctx.query, 20) };
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
