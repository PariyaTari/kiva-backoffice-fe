/**
 * The change log (1.21.0, `GET /admin/audit-log`, ADMIN only). Every successful write under `/admin/*` — except media
 * uploads — becomes one row: who, when, what, on which thing, and the sent fields as «→ to» (the mock keeps no
 * «before» copy, so `from` is only known for the seeded rows). `server.mjs` calls `recordAudit` after a handler succeeded.
 */
import { DAY, HOUR, fail, iso, paginate, route } from "../lib.mjs";
import { staff } from "../auth.mjs";
import { STAFF, fullNameOf, userById, userByPhone } from "../db.mjs";
import { products } from "../catalog.mjs";
import { orders } from "./orders.mjs";

const NOW = Date.now();
const KEEP_DAYS = 90;
let SEQ = 90400;
const entries = [];

const NAME = {
	PRODUCT: "محصول", VARIANT: "رنگ محصول", INVENTORY: "موجودی", CATEGORY: "دسته", COLOR: "رنگ", MATERIAL: "متریال", ORDER: "سفارش", RETURN: "مرجوعی",
	REFUND: "استرداد", DISCOUNT_CODE: "کد تخفیف", CAMPAIGN: "کمپین", BANNER: "بنر", ANNOUNCEMENT: "نوار اطلاعیه", TESTIMONIAL: "پیام رضایت", BLOG_POST: "مقاله",
	FAQ: "سوالات متداول", PAGE: "صفحه‌ی ثابت", SETTINGS: "تنظیمات", REVIEW: "نظر", CONTACT_MESSAGE: "پیام تماس", USER: "کاربر",
};
const TYPES = Object.keys(NAME).concat("MEDIA");

/**
 * Path → what changed. `id(match, out, body)` gives the entity id, `say(label, body, out)` the Persian sentence and
 * `action` the machine code (an open list in the contract).
 */
const RULES = [
	["PATCH", /^\/admin\/products\/(\d+)\/status$/, "PRODUCT", "PRODUCT_STATUS_CHANGED", (m) => m[1], (l, b) => `وضعیت «${l}» به ${b?.status ?? "—"} تغییر کرد`],
	["POST", /^\/admin\/products\/(\d+)\/variants$/, "VARIANT", "VARIANT_CREATED", (m, o) => o?.id, (l) => `رنگ تازه روی محصول اضافه شد (${l})`],
	["PUT", /^\/admin\/products\/(\d+)\/variants\/(\d+)$/, "VARIANT", "VARIANT_UPDATED", (m) => m[2], (l) => `رنگ «${l}» ویرایش شد`],
	["DELETE", /^\/admin\/products\/(\d+)\/variants\/(\d+)$/, "VARIANT", "VARIANT_DELETED", (m) => m[2], (l) => `رنگ «${l}» حذف شد`],
	["POST", /^\/admin\/inventory\/adjustments$/, "INVENTORY", "STOCK_ADJUSTED", (m, o, b) => b?.variantId, (l, b) => `موجودی ${b?.delta > 0 ? "+" : ""}${b?.delta ?? 0} (${b?.reason ?? "—"})`],
	["POST", /^\/admin\/orders\/([^/]+)\/status$/, "ORDER", "ORDER_STATUS_CHANGED", (m) => m[1], (l, b) => `وضعیت سفارش به ${b?.status ?? "—"} تغییر کرد`],
	["PUT", /^\/admin\/orders\/([^/]+)\/pre-shipment-media$/, "ORDER", "PRE_SHIPMENT_DRAFT_SAVED", (m) => m[1], (l, b) => `پیش‌نویس عکس قبل از ارسال ذخیره شد (${b?.items?.length ?? 0} فایل)`],
	["POST", /^\/admin\/orders\/([^/]+)\/pre-shipment-media\/send$/, "ORDER", "PRE_SHIPMENT_SENT", (m) => m[1], () => "ارسال عکس قبل از ارسال ثبت شد"],
	["POST", /^\/admin\/orders\/([^/]+)\/change-request\/resolution$/, "ORDER", "CHANGE_REQUEST_RESOLVED", (m) => m[1], (l, b) => `درخواست تغییر ${b?.decision === "REJECT" ? "رد" : "اجرا"} شد`],
	["PUT", /^\/admin\/orders\/([^/]+)\/shipment$/, "ORDER", "ORDER_SHIPPED", (m) => m[1], (l, b) => `ارسال ثبت شد (${b?.carrier ?? ""} ${b?.trackingCode ?? ""})`],
	["POST", /^\/admin\/orders\/([^/]+)\/notes$/, "ORDER", "ORDER_NOTE_ADDED", (m) => m[1], () => "یادداشت داخلی اضافه شد"],
	["POST", /^\/admin\/orders\/([^/]+)\/refunds$/, "REFUND", "REFUND_CREATED", (m, o) => o?.id, (l, b, o, m) => `استرداد ${Number(b?.amount ?? 0).toLocaleString("fa-IR")} تومان برای سفارش ${decodeURIComponent(m[1])} ثبت شد`],
	["PATCH", /^\/admin\/refunds\/(\d+)$/, "REFUND", "REFUND_UPDATED", (m) => m[1], (l, b) => `استرداد #${l} ← ${b?.status ?? "—"}`],
	["POST", /^\/admin\/returns\/(\d+)\/decision$/, "RETURN", "RETURN_DECIDED", (m) => m[1], (l, b) => `مرجوعی ${l} ${b?.approve ? "تأیید" : "رد"} شد`],
	["PUT", /^\/admin\/returns\/(\d+)\/pickup$/, "RETURN", "RETURN_PICKUP_SCHEDULED", (m) => m[1], (l) => `جمع‌آوری مرجوعی ${l} زمان‌بندی شد`],
	["POST", /^\/admin\/returns\/(\d+)\/receipt$/, "RETURN", "RETURN_RECEIVED", (m) => m[1], (l) => `مرجوعی ${l} به انبار رسید`],
	["POST", /^\/admin\/returns\/(\d+)\/close$/, "RETURN", "RETURN_CLOSED", (m) => m[1], (l) => `مرجوعی ${l} بدون استرداد بسته شد`],
	["POST", /^\/admin\/reviews\/(\d+)\/moderation$/, "REVIEW", "REVIEW_MODERATED", (m) => m[1], (l, b) => `نظر ${b?.action === "REJECT" ? "رد" : "تأیید"} شد`],
	["PUT", /^\/admin\/reviews\/(\d+)\/reply$/, "REVIEW", "REVIEW_REPLIED", (m) => m[1], () => "«پاسخ کیوا» ثبت شد"],
	["DELETE", /^\/admin\/reviews\/(\d+)\/reply$/, "REVIEW", "REVIEW_REPLY_DELETED", (m) => m[1], () => "«پاسخ کیوا» حذف شد"],
	["PATCH", /^\/admin\/contact-messages\/([^/]+)$/, "CONTACT_MESSAGE", "CONTACT_MESSAGE_UPDATED", (m) => m[1], (l, b) => (b?.reply ? `به پیام ${l} با ${b.replyChannel === "EMAIL" ? "ایمیل" : "پیامک"} پاسخ داده شد` : `پیام ${l} به‌روز شد`)],
	["PUT", /^\/admin\/customers\/(\d+)\/roles$/, "USER", "USER_ROLES_CHANGED", (m) => m[1], (l, b) => `نقش‌های ${l} ← ${(b?.roles ?? []).join("، ") || "فقط مشتری"}`],
	["PUT", /^\/admin\/announcements$/, "ANNOUNCEMENT", "ANNOUNCEMENTS_REPLACED", () => "all", (l, b) => `نوار اطلاعیه ذخیره شد (${Array.isArray(b) ? b.length : 0} پیام)`],
	["PUT", /^\/admin\/faq\/groups$/, "FAQ", "FAQ_REPLACED", () => "all", (l, b) => `سوالات متداول ذخیره شد (${Array.isArray(b) ? b.length : 0} گروه)`],
	["PUT", /^\/admin\/settings$/, "SETTINGS", "SETTINGS_UPDATED", () => "store", () => "تنظیمات فروشگاه ذخیره شد"],
];
/** Plain CRUD: `/admin/<collection>` and `/admin/<collection>/<id>`. */
const COLLECTIONS = {
	products: "PRODUCT", categories: "CATEGORY", colors: "COLOR", materials: "MATERIAL", "discount-codes": "DISCOUNT_CODE", campaigns: "CAMPAIGN", banners: "BANNER",
	testimonials: "TESTIMONIAL", "blog/posts": "BLOG_POST", pages: "PAGE",
};
const VERB = { POST: ["CREATED", "ساخته شد"], PUT: ["UPDATED", "ویرایش شد"], PATCH: ["UPDATED", "تغییر کرد"], DELETE: ["DELETED", "حذف شد"] };

const labelOf = (out, fallback) => out?.name ?? out?.title ?? out?.code ?? out?.ticketCode ?? out?.label ?? out?.text ?? fallback;
/** The sent fields as «→ to» — top-level plain values only (the mock keeps no copy of the before). */
const changesOf = (method, body) => {
	if (method === "DELETE" || !body || Array.isArray(body) || typeof body !== "object") return null;
	const list = Object.entries(body)
		.filter(([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v))
		.slice(0, 8)
		.map(([field, v]) => ({ field, from: null, to: v === null ? null : String(v).slice(0, 120) }));
	return list.length ? list : null;
};

export function recordAudit(ctx, method, path, out) {
	if (!ctx.user || method === "GET" || !path.startsWith("/admin/") || path === "/admin/media") return;
	let entityType, entityId, action, summary;
	for (const [m, re, type, code, id, say] of RULES) {
		const hit = m === method && path.match(re);
		if (!hit) continue;
		entityType = type;
		entityId = String(id(hit, out, ctx.body) ?? "");
		action = code;
		summary = say(labelOf(out, entityId), ctx.body, out, hit);
		break;
	}
	if (!entityType) {
		const hit = path.match(/^\/admin\/(blog\/posts|[a-z-]+)(?:\/([^/]+))?$/);
		const type = hit && COLLECTIONS[hit[1]];
		if (!type || !VERB[method]) return;
		const [verb, done] = VERB[method];
		entityType = type;
		entityId = String(hit[2] ?? out?.id ?? out?.key ?? out?.slug ?? "");
		action = `${type}_${verb}`;
		summary = `${NAME[type]} «${labelOf(out, entityId)}» ${done}`;
	}
	entries.unshift({
		id: ++SEQ, at: Date.now(), actorId: ctx.user.id, action, entityType, entityId, entityLabel: labelOf(out, null), summary,
		changes: changesOf(method, ctx.body), ip: String(ctx.req.socket?.remoteAddress ?? "").replace(/^::ffff:/, "") || null,
	});
}

// ───────────── seed: a few days of the staff's work ─────────────
{
	const by = (phone) => userByPhone(phone)?.id;
	const [admin, catalog, operator, content, support] = STAFF.map((s) => by(s.phone));
	const p = products.filter((x) => x.status === "ACTIVE");
	const shipped = orders.filter((o) => ["SHIPPED", "DELIVERED"].includes(o.status));
	const seed = [
		[0.2, operator, "ORDER_STATUS_CHANGED", "ORDER", shipped[0]?.code, shipped[0]?.code, "وضعیت سفارش به تحویل شده تغییر کرد", [{ field: "status", from: "SHIPPED", to: "DELIVERED" }]],
		[0.6, catalog, "PRODUCT_PRICE_CHANGED", "PRODUCT", p[0]?.id, p[0]?.name, `قیمت از ${(p[0]?.price + 100000).toLocaleString("fa-IR")} به ${p[0]?.price.toLocaleString("fa-IR")} تومان تغییر کرد`, [{ field: "price", from: String(p[0]?.price + 100000), to: String(p[0]?.price) }]],
		[1.1, operator, "ORDER_SHIPPED", "ORDER", shipped[1]?.code, shipped[1]?.code, "ارسال ثبت شد", [{ field: "trackingCode", from: null, to: shipped[1]?.trackingCode }]],
		[1.4, support, "REVIEW_MODERATED", "REVIEW", "5512", "نظر سمیرا", "نظر تأیید شد", [{ field: "status", from: "PENDING", to: "APPROVED" }]],
		[2.2, content, "BANNER_UPDATED", "BANNER", "1", "الان بخر، همه رو یکجا تحویل بگیر", "بنر «الان بخر…» ویرایش شد", [{ field: "ctaUrl", from: "/reserve", to: "/faq#reserve" }]],
		[2.9, catalog, "PRODUCT_UPDATED", "PRODUCT", p[1]?.id, p[1]?.name, `محصول «${p[1]?.name}» ویرایش شد`, [{ field: "name", from: `${p[1]?.name} قدیم`, to: p[1]?.name }]],
		[3.5, admin, "SETTINGS_UPDATED", "SETTINGS", "store", null, "تنظیمات فروشگاه ذخیره شد", [{ field: "freeShippingThreshold", from: "2500000", to: "3000000" }]],
		[4.2, admin, "USER_ROLES_CHANGED", "USER", String(support), "لیلا موسوی", "نقش‌های لیلا موسوی ← SUPPORT", [{ field: "roles", from: "CUSTOMER", to: "CUSTOMER,SUPPORT" }]],
		[5.0, content, "BLOG_POST_UPDATED", "BLOG_POST", "1", null, "مقاله ویرایش شد", null],
		[6.3, catalog, "COLOR_DELETED", "COLOR", "mint", "نعنایی", "رنگ «نعنایی» حذف شد", null],
	];
	seed.forEach(([daysAgo, actorId, action, entityType, entityId, entityLabel, summary, changes]) => {
		if (!actorId || entityId == null) return;
		entries.push({ id: ++SEQ, at: NOW - daysAgo * DAY - 3 * HOUR, actorId, action, entityType, entityId: String(entityId), entityLabel: entityLabel ?? null, summary, changes, ip: "5.160.12.34" });
	});
	entries.sort((a, b) => b.at - a.at || b.id - a.id);
}

/** `YYYY-MM-DD` of a moment in Tehran (+03:30). */
const tehranDay = (t) => new Date(t + 3.5 * HOUR).toISOString().slice(0, 10);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

route("GET", "/admin/audit-log", (ctx) => {
	staff(ctx); // ADMIN only
	const { entityType, entityId, actorId, from, to } = ctx.query;
	const errors = [];
	if (entityType && !TYPES.includes(entityType)) errors.push({ field: "entityType", code: "INVALID", message: "نوع معتبر نیست." });
	if (from && !DATE.test(from)) errors.push({ field: "from", code: "DATE_INVALID", message: "تاریخ معتبر نیست." });
	if (to && !DATE.test(to)) errors.push({ field: "to", code: "DATE_INVALID", message: "تاریخ معتبر نیست." });
	if (from && to && from > to) errors.push({ field: "to", code: "DATE_RANGE_INVALID", message: "«تا» باید بعد از «از» باشد." });
	if (errors.length) fail(400, "VALIDATION_ERROR", "چند تا از فیلترها رو باید درست کنی", { errors });
	const oldest = Date.now() - KEEP_DAYS * DAY;
	const list = entries.filter(
		(e) =>
			e.at >= oldest &&
			(!entityType || e.entityType === entityType) &&
			(!entityId || e.entityId === String(entityId)) &&
			(!actorId || e.actorId === Number(actorId)) &&
			(!from || tehranDay(e.at) >= from) &&
			(!to || tehranDay(e.at) <= to),
	);
	const { items, meta } = paginate(list, ctx.query, 20);
	return {
		// the actor is read from their **current** account (contract)
		items: items.map(({ actorId: id, at, ...e }) => {
			const u = userById(id);
			return { ...e, at: iso(at), actor: { id, fullName: u ? fullNameOf(u) : null, phone: u?.phone ?? "" } };
		}),
		meta,
	};
});
