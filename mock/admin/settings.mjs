/**
 * `/admin/settings` (ADMIN) — what the storefront's `/config` publishes — and `/admin/reports/overview` (ADMIN),
 * computed from the seeded orders. Also `GET /site/stats` (the «درباره ما» counters come from the settings).
 */
import { DAY, checker, route } from "../lib.mjs";
import { staff } from "../auth.mjs";
import { users } from "../db.mjs";
import { productById, variantImage } from "../catalog.mjs";
import { configParts } from "./marketing.mjs";
import { orders, returns } from "./orders.mjs";
import * as D from "../data.mjs";

const WEEKDAYS = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const HHMM = /^\d{2}:\d{2}$/;

let settings = {
	shippingMethods: Object.entries(D.SHIPPING).map(([code, m]) => ({
		code, name: m.name, description: m.description, baseCost: m.baseCost, minDays: m.minDays, maxDays: m.maxDays, icon: m.icon,
		trackingUrlTemplate: `${m.trackingUrl}?code={code}`, isActive: true,
	})),
	freeShippingThreshold: D.FREE_POST,
	freeShippingMethods: ["POST"],
	reservationEnabled: true,
	reservationHoldDays: 4,
	returnWindowDays: 7,
	lowStockThreshold: 5,
	preShipmentFeedbackHours: 24,
	paymentPendingMinutes: 15,
	nonShippingWeekdays: ["FRIDAY"],
	supportPhone: "02191001234",
	supportEmail: "support@kiva.ir",
	supportHours: [
		{ label: "شنبه تا چهارشنبه", weekdays: ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY"], from: "09:00", to: "21:00", messengerOnly: false },
		{ label: "پنجشنبه", weekdays: ["THURSDAY"], from: "09:00", to: "14:00", messengerOnly: false },
		{ label: "جمعه و تعطیلات", weekdays: ["FRIDAY"], from: null, to: null, messengerOnly: true },
	],
	social: D.SOCIAL.map((s) => ({ channel: s.channel, name: s.name, url: s.url, handle: s.handle })),
	paymentGateways: D.GATEWAYS.map((g) => ({ code: g.code, name: g.name, isActive: g.available, isDefault: g.isDefault, available: g.available })),
	siteStats: { happyCustomers: 12000, preShipmentPhotos: 48000, photoMatchSatisfactionPercent: 98, productModels: 60 },
	features: { reviews: true, wishlistShare: true, newsletter: true, stockAlerts: true },
};

configParts.shipping = () => ({ methods: settings.shippingMethods.filter((m) => m.isActive), freeShippingThreshold: settings.freeShippingThreshold, nonShippingWeekdays: settings.nonShippingWeekdays });
configParts.support = () => ({ phone: settings.supportPhone, email: settings.supportEmail, hours: settings.supportHours });
configParts.social = () => settings.social;
configParts.paymentGateways = () => settings.paymentGateways;

route("GET", "/site/stats", () => ({ ...settings.siteStats, satisfaction: null }));
route("GET", "/admin/settings", (ctx) => {
	staff(ctx);
	return settings;
});
route("PUT", "/admin/settings", (ctx) => {
	staff(ctx);
	const b = ctx.body || {};
	const nonNeg = (v) => Number.isInteger(v) && v >= 0;
	const c = checker()
		.need(Array.isArray(b.shippingMethods) && b.shippingMethods.some((m) => m.isActive), "shippingMethods", "حداقل یک روش ارسال باید فعال باشد.")
		.need(nonNeg(b.freeShippingThreshold), "freeShippingThreshold", "آستانه‌ی ارسال رایگان عدد صحیح نامنفی.")
		.need(Number.isInteger(b.reservationHoldDays) && b.reservationHoldDays >= 1 && b.reservationHoldDays <= 14, "reservationHoldDays", "روزهای رزرو بین ۱ تا ۱۴.")
		.need(Number.isInteger(b.returnWindowDays) && b.returnWindowDays >= 0 && b.returnWindowDays <= 30, "returnWindowDays", "مهلت بازگشت بین ۰ تا ۳۰ روز.")
		.need(nonNeg(b.lowStockThreshold), "lowStockThreshold", "آستانه‌ی موجودی کم عدد صحیح نامنفی.")
		.need(Number.isInteger(b.preShipmentFeedbackHours) && b.preShipmentFeedbackHours >= 1, "preShipmentFeedbackHours", "مهلت پاسخ به عکس حداقل ۱ ساعت.")
		.need(Number.isInteger(b.paymentPendingMinutes) && b.paymentPendingMinutes >= 5 && b.paymentPendingMinutes <= 120, "paymentPendingMinutes", "مهلت پرداخت بین ۵ تا ۱۲۰ دقیقه.")
		.need((b.nonShippingWeekdays || []).every((d) => WEEKDAYS.includes(d)), "nonShippingWeekdays", "روز معتبر نیست.")
		.need(/^0\d{10}$/.test(b.supportPhone || ""), "supportPhone", "تلفن ۱۱ رقمی با ۰ شروع شود.")
		.need(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.supportEmail || ""), "supportEmail", "ایمیل معتبر نیست.")
		.need((b.paymentGateways || []).filter((g) => g.isDefault).length === 1, "paymentGateways", "دقیقاً یک درگاه پیش‌فرض لازم است.")
		.need((b.paymentGateways || []).some((g) => g.isDefault && g.isActive), "paymentGateways", "درگاه پیش‌فرض باید فعال باشد.");
	(b.shippingMethods || []).forEach((m, i) => {
		c.need(String(m.name ?? "").trim(), `shippingMethods.${i}.name`, "نام روش ارسال لازم است.");
		c.need(nonNeg(m.baseCost), `shippingMethods.${i}.baseCost`, "هزینه عدد صحیح نامنفی.");
		c.need(Number.isInteger(m.minDays) && Number.isInteger(m.maxDays) && m.minDays <= m.maxDays, `shippingMethods.${i}.maxDays`, "حداکثر روز باید بیشتر یا برابر حداقل باشد.");
	});
	(b.supportHours || []).forEach((h, i) => c.need(h.messengerOnly || (HHMM.test(h.from || "") && HHMM.test(h.to || "")), `supportHours.${i}.from`, "ساعت مثل 09:00."));
	c.done();
	settings = { ...settings, ...b };
	return settings;
});

// ───────────── report ─────────────
const tehranDay = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
route("GET", "/admin/reports/overview", (ctx) => {
	staff(ctx);
	const { from, to } = ctx.query;
	const date = /^\d{4}-\d{2}-\d{2}$/;
	checker().need(date.test(from || ""), "from", "تاریخ شروع لازم است.").need(date.test(to || "") && to >= from, "to", "تاریخ پایان باید بعد از شروع باشد.").done();
	const inRange = (t) => {
		const d = tehranDay(t);
		return d >= from && d <= to;
	};
	const paid = orders.filter((o) => o.paidAt && inRange(o.placedAt));
	const revenue = paid.reduce((s, o) => s + o.totals.payable - o.totals.refunded, 0);
	const withFeedback = paid.filter((o) => o.feedback);
	const mix = (key) => paid.reduce((m, o) => ({ ...m, [o[key]]: (m[o[key]] || 0) + 1 }), {});
	const units = new Map();
	paid.forEach((o) => o.items.forEach((it) => {
		const u = units.get(it.productId) || { units: 0, revenue: 0 };
		units.set(it.productId, { units: u.units + it.qty, revenue: u.revenue + it.unitPrice * it.qty });
	}));
	const days = [];
	for (let t = Date.parse(`${from}T00:00:00+03:30`); tehranDay(t) <= to && days.length < 370; t += DAY) days.push(tehranDay(t));
	const delivered = paid.filter((o) => o.deliveredAt).length;
	return {
		from, to, revenue, ordersCount: paid.length, averageOrderValue: paid.length ? Math.round(revenue / paid.length) : 0,
		newCustomers: users.filter((u) => u.roles.length === 1 && inRange(u.createdAt)).length,
		reservationShare: pct(paid.filter((o) => o.group).length, paid.length),
		mediaApprovalRate: pct(withFeedback.filter((o) => o.feedback.decision === "APPROVE").length, withFeedback.length),
		changeRequestRate: pct(withFeedback.filter((o) => o.feedback.decision === "REQUEST_CHANGE").length, withFeedback.length),
		returnRate: pct(returns.filter((r) => paid.some((o) => o.code === r.orderCode)).length, delivered),
		discountTotal: paid.reduce((s, o) => s + o.totals.codeDiscount + o.totals.productDiscount, 0),
		shippingMix: mix("shippingMethod"), messengerMix: mix("messenger"),
		topProducts: [...units.entries()].sort((a, b) => b[1].units - a[1].units).slice(0, 5).map(([id, u]) => {
			const p = productById(id);
			return { product: { id, slug: p?.slug, sku: p?.sku, name: p?.name ?? `#${id}`, imageUrl: p ? variantImage(p, p.variants[0]) : null }, unitsSold: u.units, revenue: u.revenue };
		}),
		dailySeries: days.map((d) => {
			const list = paid.filter((o) => tehranDay(o.placedAt) === d);
			return { date: d, revenue: list.reduce((s, o) => s + o.totals.payable - o.totals.refunded, 0), orders: list.length };
		}),
	};
});

