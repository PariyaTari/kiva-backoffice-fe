/**
 * `/admin/orders*` and `/admin/returns*` — a seeded queue with an order in every state (FEATURES §3.1–3.6):
 * waiting for photos, photos sent (some answered), change requested, reservation groups, shipped, delivered,
 * unpaid / failed / expired, cancelled with a refund, returns in each step.
 */
import { DAY, HOUR, MIN, checker, fail, iso, listParam, normQ, notFound, paginate, route, toEn } from "../lib.mjs";
import { staff } from "../auth.mjs";
import { fullNameOf, users } from "../db.mjs";
import { assets } from "../media.mjs";
import { available, colorView, imageAsset, products, variantById, variantCompareAt, variantImage, variantPrice } from "../catalog.mjs";
import { adjustStock } from "./catalog.mjs";
import * as D from "../data.mjs";

const NOW = Date.now();
const SHIP = { TIPAX: { name: "تیپاکس", cost: 145000, url: "https://tipaxco.com/tracking" }, POST: { name: "پست", cost: 75000, url: "https://tracking.post.ir/" }, COURIER: { name: "پیک", cost: 90000, url: null } };
const MESSENGER = { RUBIKA: "روبیکا", TELEGRAM: "تلگرام", BALE: "بله" };
const GATEWAYS = { ZARINPAL: "زرین‌پال", SAMAN: "بانک سامان", MELLAT: "بانک ملت" };
const FREE_POST = 3000000;
const FEEDBACK_HOURS = 24;

export const STATUS = {
	PENDING_PAYMENT: ["در انتظار پرداخت", "WARN"],
	PAYMENT_FAILED: ["پرداخت ناموفق", "DANGER"],
	EXPIRED: ["منقضی", "DANGER"],
	RESERVED: ["رزرو شده", "CREAM"],
	PROCESSING: ["در حال آماده‌سازی", "WARN"],
	PHOTO_SENT: ["عکس کیف ارسال شد", "DEFAULT"],
	CHANGE_REQUESTED: ["درخواست تغییر ثبت شد", "WARN"],
	SHIPPED: ["در مسیر", "DEFAULT"],
	DELIVERED: ["تحویل شده", "SUCCESS"],
	CANCELLED: ["لغو شده", "DANGER"],
	RETURN_REQUESTED: ["درخواست مرجوعی", "WARN"],
	RETURNED: ["مرجوع شد", "DEFAULT"],
	REFUNDED: ["وجه برگشت داده شد", "DEFAULT"],
};
/** What `POST …/status` may move an order to (photos and shipping have their own endpoints). */
const TRANSITIONS = {
	PENDING_PAYMENT: ["CANCELLED"],
	PAYMENT_FAILED: ["CANCELLED"],
	EXPIRED: [],
	RESERVED: ["CANCELLED"],
	PROCESSING: ["CANCELLED"],
	PHOTO_SENT: ["PROCESSING", "CANCELLED"],
	CHANGE_REQUESTED: ["CANCELLED"],
	SHIPPED: ["DELIVERED"],
	DELIVERED: [],
	CANCELLED: [],
	RETURN_REQUESTED: [],
	RETURNED: [],
	REFUNDED: [],
};
const PAID = (o) => !["PENDING_PAYMENT", "PAYMENT_FAILED", "EXPIRED"].includes(o.status) && o.paidAt;

// ───────────── seed ─────────────
let rnd = 42;
const rand = () => ((rnd = (rnd * 16807) % 2147483647) - 1) / 2147483646;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const digits = (n) => Array.from({ length: n }, () => Math.floor(rand() * 10)).join("");
let CHANGE_SEQ = 0;

const customers = users.filter((u) => u.roles.length === 1);
const live = products.filter((p) => p.status === "ACTIVE");
let NOTE_SEQ = 300, REFUND_SEQ = 40, RETURN_SEQ = 1012, ITEM_SEQ = 9000, CODE_SEQ = 220400;

export const orders = [];
export const returns = [];

function totalsOf(items, shippingMethod, { code = null, joined = false } = {}) {
	const compareAt = items.reduce((s, i) => s + (i.unitCompareAt ?? i.unitPrice) * i.qty, 0);
	const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
	const codeDiscount = code ? Math.round((subtotal * 0.1) / 1000) * 1000 : 0;
	const free = joined ? "RESERVATION_CONSOLIDATION" : shippingMethod === "POST" && subtotal >= FREE_POST ? "THRESHOLD" : null;
	const shippingCost = free ? 0 : SHIP[shippingMethod].cost;
	return {
		itemsCompareAtTotal: compareAt, productDiscount: compareAt - subtotal, subtotal, discountCode: code, codeDiscount, shippingCost,
		shippingFreeReason: free, giftWrapCost: 0, payable: subtotal - codeDiscount + shippingCost, refunded: 0, balanceDue: 0, currency: "IRT",
	};
}

function makeOrder(u, status, placedAgo, opts = {}) {
	const n = opts.items ?? (rand() < 0.65 ? 1 : rand() < 0.7 ? 2 : 3);
	const items = Array.from({ length: n }, () => {
		const p = pick(live);
		const v = pick(p.variants);
		return { id: ++ITEM_SEQ, productId: p.id, variantId: v.id, qty: rand() < 0.88 ? 1 : 2, unitPrice: variantPrice(p, v), unitCompareAt: variantCompareAt(p, v) };
	});
	const shippingMethod = opts.shippingMethod ?? (rand() < 0.62 ? "POST" : "TIPAX");
	const placedAt = NOW - placedAgo;
	const province = pick(D.PROVINCES.slice(0, 14));
	const city = province.cities[0];
	const o = {
		code: `KV-${(CODE_SEQ -= 1 + Math.floor(rand() * 9))}`, userId: u.id, status, placedAt, items, shippingMethod,
		messenger: u.defaultMessenger || pick(["TELEGRAM", "BALE", "RUBIKA"]), messengerPhone: u.phone,
		address: { provinceName: province.name, cityName: city.name, addressLine: `خیابان ${pick(["ولیعصر", "انقلاب", "آزادی", "فردوسی", "حافظ", "بهار"])}، کوچه ${pick(["نسترن", "یاس", "لاله", "مریم"])}، پلاک ${1 + Math.floor(rand() * 90)}`, postalCode: digits(10).replace(/^0/, "1"), recipientName: fullNameOf(u), recipientPhone: u.phone },
		totals: totalsOf(items, shippingMethod, { code: opts.code, joined: opts.joined }), paidAt: null, gateway: pick(["ZARINPAL", "ZARINPAL", "SAMAN", "MELLAT"]),
		payments: [], refunds: [], notes: [], media: [], mediaStatus: "WAITING", mediaSentAt: null, feedback: null, feedbackDeadline: null,
		carrier: null, trackingCode: null, shippedAt: null, deliveredAt: null, cancelledAt: null, group: null, events: [], customerNote: rand() < 0.15 ? "لطفاً بسته‌بندی کادویی باشه." : null,
	};
	const paidAt = placedAt + 2 * MIN;
	const pay = (st, at) => o.payments.push({ gateway: o.gateway, gatewayName: GATEWAYS[o.gateway], status: st, referenceId: st === "SUCCEEDED" ? digits(9) : null, paidAt: at ? iso(at) : null, cardMask: st === "SUCCEEDED" ? `6037-99**-****-${digits(4)}` : null });
	if (status === "PENDING_PAYMENT") pay("PENDING");
	else if (status === "PAYMENT_FAILED") pay("FAILED");
	else if (status === "EXPIRED") pay("EXPIRED");
	else {
		o.paidAt = paidAt;
		pay("SUCCEEDED", paidAt);
		event(o, opts.reserved ? "RESERVED" : "PROCESSING", paidAt);
	}
	const shoot = (at, approve) => {
		o.media = o.items.flatMap((it, k) => ["FRONT", "SIDE", "DETAIL"].map((view, j) => {
			const { p, v } = variantById(it.variantId);
			const url = variantImage(p, v).replace(/v=\d+/, `v=${j}`);
			return { mediaId: `shot_${o.code}_${k}_${j}`, orderItemId: it.id, view, sortOrder: k * 3 + j, url, type: "IMAGE", capturedAt: at };
		}));
		o.mediaStatus = "SENT";
		o.mediaSentAt = at;
		o.feedbackDeadline = at + FEEDBACK_HOURS * HOUR;
		event(o, "PHOTO_SENT", at);
		if (approve) {
			o.mediaStatus = "APPROVED";
			o.feedback = { decision: "APPROVE", note: null, at: iso(at + 3 * HOUR) };
		}
	};
	const ship = (at) => {
		o.carrier = o.shippingMethod;
		o.trackingCode = o.carrier === "TIPAX" ? `TPX48${digits(5)}` : digits(24);
		o.shippedAt = at;
		event(o, "SHIPPED", at);
	};
	if (["PHOTO_SENT", "CHANGE_REQUESTED", "SHIPPED", "DELIVERED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"].includes(status)) shoot(paidAt + 20 * HOUR, status !== "PHOTO_SENT" && status !== "CHANGE_REQUESTED");
	if (status === "PHOTO_SENT" && rand() < 0.5) {
		o.mediaStatus = "APPROVED";
		o.feedback = { decision: "APPROVE", note: rand() < 0.5 ? "عالیه، همین رو بفرستید 🙏" : null, at: iso(paidAt + 22 * HOUR) };
	}
	if (status === "CHANGE_REQUESTED") {
		const it = o.items[0];
		const { p } = variantById(it.variantId);
		// every other one asks for another model (a «محصولات مشابه» pick — same category), the rest for another colour
		const model = ++CHANGE_SEQ % 2 === 0 && products.find((x) => x.status === "ACTIVE" && x.id !== p.id && x.categoryId === p.categoryId);
		const other = model ? model.variants.find((v) => v.isDefault) || model.variants[0] : p.variants.find((v) => v.id !== it.variantId) || p.variants[0];
		const note = model ? `${model.name} ${colorView(other.colorKey).name} رو بیشتر می‌پسندم، می‌شه عوضش کنید؟` : `اگه ${colorView(other.colorKey).name}ش موجوده همون رو بفرستید.`;
		o.mediaStatus = "CHANGE_REQUESTED";
		o.feedback = { decision: "REQUEST_CHANGE", changeType: model ? "MODEL" : "COLOR", orderItemId: it.id, desiredVariantId: other.id, note, at: iso(paidAt + 23 * HOUR) };
		event(o, "CHANGE_REQUESTED", paidAt + 23 * HOUR);
	}
	if (["SHIPPED", "DELIVERED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"].includes(status)) ship(paidAt + 30 * HOUR);
	if (["DELIVERED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"].includes(status)) {
		o.deliveredAt = o.shippedAt + (o.carrier === "TIPAX" ? 1.2 : 3.4) * DAY;
		event(o, "DELIVERED", o.deliveredAt);
	}
	if (status === "CANCELLED") {
		o.cancelledAt = paidAt + 5 * HOUR;
		event(o, "CANCELLED", o.cancelledAt, "لغو توسط مشتری: منصرف شدم");
		o.refunds.push({ id: ++REFUND_SEQ, amount: o.totals.payable, method: "ORIGINAL_PAYMENT", status: rand() < 0.5 ? "PROCESSING" : "COMPLETED", reason: "ORDER_CANCELLED", expectedBy: iso(o.cancelledAt + 3 * DAY), completedAt: null, referenceId: null });
	}
	if (rand() < 0.2 && PAID(o)) o.notes.push({ id: ++NOTE_SEQ, text: pick(["مشتری تماس گرفت؛ ارسال سریع‌تر خواست.", "کیف با برچسب اسم کنار گذاشته شد.", "آدرس تلفنی تأیید شد."]), author: "سحر احمدی", createdAt: iso(paidAt + 4 * HOUR) });
	orders.push(o);
	return o;
}

function event(o, status, at, note = null) {
	o.events.push({ status, label: STATUS[status][0], at, note });
}

const PLAN = [
	["PROCESSING", 9, 0, 1.6], ["PHOTO_SENT", 7, 1, 2.5], ["CHANGE_REQUESTED", 2, 1.2, 2], ["SHIPPED", 9, 2, 5], ["DELIVERED", 18, 5, 30],
	["PENDING_PAYMENT", 3, 0, 0.01], ["PAYMENT_FAILED", 2, 0, 0.3], ["EXPIRED", 3, 1, 6], ["CANCELLED", 4, 1, 12],
	["RETURN_REQUESTED", 2, 3, 6], ["RETURNED", 1, 8, 12], ["REFUNDED", 1, 12, 20],
];
let ci = 0;
for (const [status, count, minDays, maxDays] of PLAN) {
	for (let k = 0; k < count; k++) {
		const ago = (minDays + rand() * (maxDays - minDays)) * DAY + (status === "PENDING_PAYMENT" ? 4 * MIN : 0);
		makeOrder(customers[ci++ % customers.length], status, ago, { code: rand() < 0.12 ? "KIVA10" : null });
	}
}
// a few PROCESSING orders already have photos uploaded (but not sent) — the rest are «باید عکاسی شود»
orders.filter((o) => o.status === "PROCESSING").slice(0, 2).forEach((o) => {
	o.media = o.items.map((it, k) => {
		const { p, v } = variantById(it.variantId);
		return { mediaId: `shot_${o.code}_${k}_0`, orderItemId: it.id, view: "FRONT", sortOrder: k, url: variantImage(p, v), type: "IMAGE", capturedAt: NOW - HOUR };
	});
});
// reservation groups: one with two orders (the second joined, free shipping), one alone
{
	const u = customers[3];
	const root = makeOrder(u, "RESERVED", 1.4 * DAY, { reserved: true, items: 1, shippingMethod: "POST" });
	const joined = makeOrder(u, "RESERVED", 0.5 * DAY, { reserved: true, items: 1, shippingMethod: "POST", joined: true });
	joined.address = root.address;
	const g = { code: "SG-3021", orderCodes: [root.code, joined.code], releaseAt: root.paidAt + 4 * DAY };
	root.group = joined.group = g;
	const alone = makeOrder(customers[7], "RESERVED", 3.1 * DAY, { reserved: true, items: 2 });
	alone.group = { code: "SG-3022", orderCodes: [alone.code], releaseAt: alone.paidAt + 4 * DAY };
}
orders.sort((a, b) => b.placedAt - a.placedAt);

// Test aid: a shopper just paid — `POST /api/v1/__mock/new-order` puts a fresh PROCESSING order on top of the queue
// (the panel's «سفارش تازه رسید» banner and the live counters).
let NEW_SEQ = 0;
route("POST", "/__mock/new-order", () => {
	const o = makeOrder(pick(customers), "PROCESSING", -Date.now() + NOW);
	o.code = `KV-${230000 + ++NEW_SEQ}`;
	orders.pop();
	orders.unshift(o);
	return { code: o.code };
});

// returns: one per returning order + a decided pair on delivered ones
function makeReturn(o, status, reason, ago) {
	const it = o.items[0];
	const r = {
		id: ++RETURN_SEQ, code: `RT-${RETURN_SEQ}`, orderCode: o.code, status, reason, description: reason === "NOT_AS_PICTURED" ? "رنگش با عکس قبل از ارسال فرق داشت." : reason === "MANUFACTURING_DEFECT" ? "دسته‌ی کیف از یک طرف شکافته." : "اندازه‌اش برام کوچیک بود.",
		items: [{ orderItemId: it.id, quantity: 1 }], media: [], shippingPaidBy: null, instructions: null, refundMethod: "ORIGINAL_PAYMENT", iban: null,
		refund: null, rejectionReason: null, createdAt: Math.min(o.deliveredAt + ago, NOW - 2 * HOUR), decidedAt: null,
		pickup: null, receipt: null, receivedAt: null, closedAt: null, closeReason: null,
	};
	if (status !== "REQUESTED") {
		r.decidedAt = r.createdAt + 5 * HOUR;
		if (status === "REJECTED") r.rejectionReason = "مهلت ۷ روزه‌ی بازگشت تمام شده بود.";
		else {
			r.shippingPaidBy = reason === "CHANGED_MIND" ? "CUSTOMER" : "KIVA";
			r.instructions = "کیف رو با بسته‌بندی اصلی با تیپاکس به انبار کیوا بفرست؛ کد پس‌کرایه برات پیامک شد.";
		}
	}
	returns.push(r);
	return r;
}
orders.filter((o) => o.status === "RETURN_REQUESTED").forEach((o, i) => makeReturn(o, "REQUESTED", i ? "CHANGED_MIND" : "NOT_AS_PICTURED", 1.5 * DAY));
orders.filter((o) => o.status === "RETURNED").forEach((o) => {
	const r = makeReturn(o, "RECEIVED", "MANUFACTURING_DEFECT", DAY);
	r.receivedAt = r.decidedAt + 2 * DAY;
	r.receipt = { items: r.items.map((ri) => ({ orderItemId: ri.orderItemId, receivedQuantity: ri.quantity, restockQuantity: 0 })), note: "دسته از محل دوخت شکافته؛ برگشت به کارگاه." };
	r.refundMethod = "BANK_TRANSFER";
	r.iban = "IR820540102680020817909002";
});
orders.filter((o) => o.status === "REFUNDED").forEach((o) => {
	const r = makeReturn(o, "REFUNDED", "NOT_AS_PICTURED", DAY);
	r.receivedAt = r.decidedAt + 2 * DAY;
	r.receipt = { items: r.items.map((ri) => ({ orderItemId: ri.orderItemId, receivedQuantity: ri.quantity, restockQuantity: ri.quantity })), note: null };
	const refund = { ...newRefund(o.totals.subtotal, "ORIGINAL_PAYMENT", `مرجوعی ${r.code}`, r.id), status: "COMPLETED", completedAt: iso(r.receivedAt + DAY), referenceId: digits(10) };
	r.refund = refund;
	o.refunds.push(refund);
});
{
	const delivered = orders.filter((o) => o.status === "DELIVERED");
	makeReturn(delivered[0], "APPROVED", "MANUFACTURING_DEFECT", 2 * DAY);
	delivered[0].status = "RETURN_REQUESTED";
	makeReturn(delivered[1], "REJECTED", "CHANGED_MIND", 9 * DAY);
	const picked = makeReturn(delivered[2], "PICKUP_SCHEDULED", "DAMAGED_IN_TRANSIT", DAY);
	delivered[2].status = "RETURN_REQUESTED";
	picked.pickup = { carrier: "TIPAX", scheduledFor: NOW + 20 * HOUR, trackingCode: `TPX48${digits(5)}`, note: "مأمور تیپاکس فردا بین ۱۰ تا ۱۴ مراجعه می‌کند." };
}
// refunds of the seed: 1.5.0 fields, and `totals.refunded` = what actually went back (COMPLETED)
for (const o of orders) {
	for (const r of o.refunds) {
		r.returnId ??= null;
		r.createdAt ??= iso((o.cancelledAt ?? o.placedAt) + HOUR);
		r.statusNote ??= null;
		if (r.status === "COMPLETED") {
			r.completedAt ??= iso((o.cancelledAt ?? o.placedAt) + 2 * DAY);
			r.referenceId ??= digits(12);
		}
	}
	o.totals.refunded = o.refunds.filter((r) => r.status === "COMPLETED").reduce((n, r) => n + r.amount, 0);
}
returns.sort((a, b) => b.createdAt - a.createdAt);

// ───────────── views ─────────────
const userOf = (o) => users.find((u) => u.id === o.userId);
const findOrder = (code) => orders.find((o) => o.code === toEn(code).toUpperCase()) || notFound("ORDER_NOT_FOUND", "سفارش پیدا نشد.");

function itemView(o, it) {
	const found = variantById(it.variantId);
	const p = found?.p, v = found?.v;
	return {
		id: it.id, productId: it.productId, variantId: it.variantId, sku: v?.sku ?? null, name: p?.name ?? "محصول حذف‌شده", slug: p?.slug ?? null,
		color: colorView(v?.colorKey ?? "black"), image: p ? imageAsset(variantImage(p, v), p.name) : null, quantity: it.qty, unitPrice: it.unitPrice,
		unitCompareAtPrice: it.unitCompareAt, lineTotal: it.unitPrice * it.qty, reviewed: false,
		returnableUntil: o.deliveredAt ? iso(o.deliveredAt + 7 * DAY) : null,
	};
}
const mediaItemView = (m) => {
	const a = assets.get(m.mediaId);
	const base = a || { id: m.mediaId, type: m.type || "IMAGE", url: m.url, thumbnailUrl: m.url, width: 1200, height: 1200, mimeType: "image/svg+xml", alt: null };
	return { ...base, orderItemId: m.orderItemId ?? null, view: m.view ?? null, capturedAt: iso(m.capturedAt ?? Date.now()) };
};
function preShipmentView(o) {
	return {
		status: o.mediaStatus, channel: o.messenger, channelName: MESSENGER[o.messenger], phone: o.messengerPhone, note: null, sentAt: iso(o.mediaSentAt),
		waitingMessage: o.mediaStatus === "WAITING" ? `قبل از ارسال، از کیف عکس و ویدیو می‌گیریم و توی ${MESSENGER[o.messenger]} می‌فرستیم.` : null,
		items: [...o.media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(mediaItemView), feedback: o.feedback, feedbackDeadline: iso(o.feedbackDeadline),
	};
}
function progressOf(o) {
	const at = (s) => o.events.find((e) => e.status === s)?.at ?? null;
	const steps = [["PLACED", "ثبت شد", "check", o.paidAt], ["PHOTO_SENT", "عکس ارسال شد", "camera", at("PHOTO_SENT")], ["SHIPPED", "تحویل پست شد", "truck", o.shippedAt], ["DELIVERED", "تحویل شد", "home", o.deliveredAt]];
	const cur = steps.reduce((idx, s, i) => (s[3] ? i : idx), 0);
	return { currentStepIndex: cur, steps: steps.map(([key, label, icon, t], i) => ({ key, label, icon, at: iso(t), state: i < cur || (i === cur && i === 3) ? "DONE" : i === cur && t ? "CURRENT" : "UPCOMING" })) };
}
/** The return cycle (contract §4): the next steps the panel may take; `REFUNDED` = «ثبت استرداد با returnId». */
function returnNext(r) {
	const activeRefund = r.refund && r.refund.status !== "FAILED";
	return {
		REQUESTED: ["APPROVED", "REJECTED"],
		APPROVED: ["PICKUP_SCHEDULED", "RECEIVED", "CLOSED"],
		PICKUP_SCHEDULED: ["PICKUP_SCHEDULED", "RECEIVED", "CLOSED"],
		RECEIVED: activeRefund ? [] : ["REFUNDED", "CLOSED"],
	}[r.status] ?? [];
}
export function returnView(r) {
	const o = orders.find((x) => x.code === r.orderCode);
	const u = o && userOf(o);
	return {
		id: r.id, code: r.code, orderCode: r.orderCode, status: r.status, statusLabel: { REQUESTED: "در حال بررسی", APPROVED: "تأیید شد", REJECTED: "رد شد", PICKUP_SCHEDULED: "زمان‌بندی ارسال", RECEIVED: "دریافت شد", REFUNDED: "وجه برگشت داده شد", CLOSED: "بسته شد" }[r.status],
		reason: r.reason, description: r.description,
		items: r.items.map((ri) => {
			const it = o?.items.find((x) => x.id === ri.orderItemId);
			const view = it ? itemView(o, it) : null;
			return { orderItemId: ri.orderItemId, name: view?.name ?? "—", color: view?.color ?? colorView("black"), quantity: ri.quantity };
		}),
		media: r.media, shippingPaidBy: r.shippingPaidBy, instructions: r.instructions, refundMethod: r.refundMethod, rejectionReason: r.rejectionReason,
		pickup: r.pickup ? { ...r.pickup, carrierName: SHIP[r.pickup.carrier].name, scheduledFor: iso(r.pickup.scheduledFor) } : null,
		refund: r.refund, createdAt: iso(r.createdAt), decidedAt: iso(r.decidedAt), receivedAt: iso(r.receivedAt), closedAt: iso(r.closedAt), closeReason: r.closeReason,
		customer: { id: u?.id, fullName: fullNameOf(u) || null, phone: u?.phone }, iban: r.refundMethod === "BANK_TRANSFER" ? r.iban : null, receipt: r.receipt,
		allowedTransitions: returnNext(r),
	};
}
function listItem(o) {
	return {
		code: o.code, placedAt: iso(o.placedAt), status: o.status, customerName: fullNameOf(userOf(o)) || "—", customerPhone: userOf(o)?.phone, city: o.address.cityName,
		itemsCount: o.items.reduce((s, i) => s + i.qty, 0), payable: o.totals.payable, shippingMethod: o.shippingMethod, messenger: o.messenger,
		reserved: o.status === "RESERVED", reservationExpiresAt: o.group && o.status === "RESERVED" ? iso(o.group.releaseAt) : null, shipmentGroupCode: o.group?.code ?? null,
		mediaCount: o.media.length, trackingCode: o.trackingCode,
	};
}
export function adminOrder(o) {
	const u = userOf(o);
	const [label, tone] = STATUS[o.status];
	return {
		code: o.code, placedAt: iso(o.placedAt), status: o.status, statusLabel: label, statusTone: tone, payable: o.totals.payable,
		shippingMethod: { code: o.shippingMethod, name: SHIP[o.shippingMethod].name }, itemsPreview: o.items.map((it) => { const v = itemView(o, it); return { productId: v.productId, name: v.name, colorKey: v.color.key, imageUrl: v.image?.url, quantity: v.quantity }; }),
		itemsCount: o.items.reduce((s, i) => s + i.qty, 0), progress: progressOf(o),
		reservation: o.group && o.status === "RESERVED" ? { active: true, orderCode: o.group.orderCodes[0], startedAt: iso(o.group.releaseAt - 4 * DAY), expiresAt: iso(o.group.releaseAt), remainingSeconds: Math.max(0, Math.round((o.group.releaseAt - Date.now()) / 1000)), groupOrderCodes: o.group.orderCodes, message: null } : null,
		shipment: { carrier: o.carrier ?? o.shippingMethod, carrierName: SHIP[o.carrier ?? o.shippingMethod].name, trackingCode: o.trackingCode, trackingUrl: o.trackingCode ? SHIP[o.carrier].url : null, shippedAt: iso(o.shippedAt), deliveredAt: iso(o.deliveredAt), waitingMessage: o.trackingCode ? null : "بعد از تحویل به حامل این‌جا نمایش داده می‌شه" },
		preShipmentMedia: { status: o.mediaStatus, channel: o.messenger, channelName: MESSENGER[o.messenger], count: o.media.length, hasVideo: o.media.some((m) => m.type === "VIDEO"), sentAt: iso(o.mediaSentAt) },
		actions: {},
		items: o.items.map((it) => itemView(o, it)),
		address: { ...o.address, fullText: `${o.address.provinceName}، ${o.address.cityName}، ${o.address.addressLine}` },
		totals: o.totals, payment: o.payments[o.payments.length - 1] ?? null, preShipmentMediaDetail: preShipmentView(o),
		timeline: o.events.map((e) => ({ status: e.status, label: e.label, at: iso(e.at), note: e.note })), customerNote: o.customerNote, gift: null,
		returns: returns.filter((r) => r.orderCode === o.code).map(returnView), invoiceUrl: null,
		customer: { id: u?.id, fullName: fullNameOf(u) || "—", phone: u?.phone, ordersCount: orders.filter((x) => x.userId === o.userId).length },
		shipmentGroup: o.group, payments: o.payments, refunds: o.refunds, notes: o.notes, allowedTransitions: TRANSITIONS[o.status],
	};
}

// ───────────── routes ─────────────
const ORDER_ROLES = ["OPERATOR"];
const author = (u) => fullNameOf(u) || u.phone;

route("GET", "/admin/orders", (ctx) => {
	staff(ctx, ...ORDER_ROLES);
	const q = ctx.query;
	const term = q.q ? normQ(q.q).toUpperCase() : "";
	const rest = orders.filter((o) => {
		const u = userOf(o);
		if (term && !(o.code.includes(term) || u?.phone.includes(term.replace(/\D/g, "") || "~") || (fullNameOf(u) || "").includes(normQ(q.q)))) return false;
		if (q.shippingMethod && o.shippingMethod !== q.shippingMethod) return false;
		if (q.reserved === "true" && o.status !== "RESERVED") return false;
		if (q.reserved === "false" && o.status === "RESERVED") return false;
		if (q.awaitingPhotos === "true" && !(o.status === "PROCESSING" && !o.media.length)) return false;
		const day = iso(o.placedAt).slice(0, 10);
		if (q.from && day < q.from) return false;
		if (q.to && day > q.to) return false;
		return true;
	});
	const statuses = listParam(q.status);
	const list = statuses.length ? rest.filter((o) => statuses.includes(o.status)) : rest;
	const statusCounts = {};
	rest.forEach((o) => (statusCounts[o.status] = (statusCounts[o.status] || 0) + 1));
	const { items, meta } = paginate(list, q, 20);
	return { items: items.map(listItem), meta, statusCounts };
});

route("GET", "/admin/orders/:code", (ctx) => {
	staff(ctx, ...ORDER_ROLES);
	return adminOrder(findOrder(ctx.params.code));
});

route("POST", "/admin/orders/:code/status", (ctx) => {
	const me = staff(ctx, ...ORDER_ROLES);
	const o = findOrder(ctx.params.code);
	const { status, note = null, notifyCustomer = true } = ctx.body || {};
	if (!STATUS[status]) fail(400, "VALIDATION_ERROR", "وضعیت معتبر نیست.", { errors: [{ field: "status", code: "INVALID", message: "وضعیت معتبر نیست." }] });
	if (note && String(note).length > 500) fail(400, "VALIDATION_ERROR", "یادداشت حداکثر ۵۰۰ حرف.", { errors: [{ field: "note", code: "TOO_LONG", message: "یادداشت حداکثر ۵۰۰ حرف." }] });
	if (!TRANSITIONS[o.status].includes(status)) fail(422, "INVALID_STATUS_TRANSITION", `سفارش از «${STATUS[o.status][0]}» به «${STATUS[status][0]}» نمی‌ره.`);
	const now = Date.now();
	if (status === "CANCELLED") {
		o.cancelledAt = now;
		if (PAID(o)) {
			const rest = o.totals.payable - o.totals.refunded;
			if (rest > 0) o.refunds.push(newRefund(rest, "ORIGINAL_PAYMENT", "ORDER_CANCELLED", null));
		o.totals.balanceDue = 0;
		}
	}
	if (status === "DELIVERED") o.deliveredAt = now;
	if (status === "PROCESSING") {
		// a new round of photos after a change request
		o.mediaStatus = "WAITING";
		o.feedback = null;
		o.feedbackDeadline = null;
	}
	o.status = status;
	event(o, status, now, [note, notifyCustomer ? "پیامک به مشتری رفت" : null].filter(Boolean).join(" · ") || null);
	console.log(`  [status] ${o.code} → ${status} by ${author(me)}`);
	return adminOrder(o);
});

route("PUT", "/admin/orders/:code/pre-shipment-media", (ctx) => {
	staff(ctx, ...ORDER_ROLES);
	const o = findOrder(ctx.params.code);
	const list = ctx.body?.items;
	if (!Array.isArray(list)) fail(400, "VALIDATION_ERROR", "لیست عکس‌ها لازمه.", { errors: [{ field: "items", code: "REQUIRED", message: "لیست عکس‌ها لازمه." }] });
	if (!["PROCESSING", "RESERVED", "PHOTO_SENT", "CHANGE_REQUESTED"].includes(o.status)) fail(422, "INVALID_STATUS_TRANSITION", "عکس قبل از ارسال فقط برای سفارش‌های آماده‌سازی ثبت می‌شه.");
	const c = checker();
	list.forEach((m, i) => {
		const known = assets.has(m.mediaId) || o.media.some((x) => x.mediaId === m.mediaId);
		c.need(known, `items[${i}].mediaId`, "این فایل پیدا نشد؛ دوباره آپلودش کن.", "MEDIA_NOT_FOUND");
		c.need(m.orderItemId == null || o.items.some((it) => it.id === Number(m.orderItemId)), `items[${i}].orderItemId`, "این قلم در سفارش نیست.");
	});
	c.done();
	o.media = list.map((m, i) => {
		const prev = o.media.find((x) => x.mediaId === m.mediaId);
		const a = assets.get(m.mediaId);
		return { mediaId: m.mediaId, orderItemId: m.orderItemId ?? null, view: m.view ?? null, sortOrder: m.sortOrder ?? i, url: prev?.url ?? a?.url, type: prev?.type ?? a?.type ?? "IMAGE", capturedAt: prev?.capturedAt ?? Date.now() };
	});
	return preShipmentView(o);
});

route("POST", "/admin/orders/:code/pre-shipment-media/send", (ctx) => {
	staff(ctx, ...ORDER_ROLES);
	const o = findOrder(ctx.params.code);
	if (!["PROCESSING", "PHOTO_SENT", "CHANGE_REQUESTED"].includes(o.status)) fail(422, "INVALID_STATUS_TRANSITION", "این سفارش در مرحله‌ی ارسال عکس نیست.");
	if (!o.media.length) fail(422, "INVALID_STATUS_TRANSITION", "اول عکس‌ها رو به سفارش وصل کن.");
	const { manual = false, channelOverride = null, message = null } = ctx.body || {};
	if (channelOverride && !MESSENGER[channelOverride]) fail(400, "VALIDATION_ERROR", "پیام‌رسان معتبر نیست.", { errors: [{ field: "channelOverride", code: "INVALID", message: "پیام‌رسان معتبر نیست." }] });
	const now = Date.now();
	if (channelOverride) o.messenger = channelOverride;
	o.status = "PHOTO_SENT";
	o.mediaStatus = "SENT";
	o.mediaSentAt = now;
	o.feedback = null;
	o.feedbackDeadline = now + FEEDBACK_HOURS * HOUR;
	event(o, "PHOTO_SENT", now, [manual ? "ارسال دستی" : `ارسال خودکار در ${MESSENGER[o.messenger]}`, message].filter(Boolean).join(" · "));
	return adminOrder(o);
});

route("POST", "/admin/orders/:code/change-request/resolution", (ctx) => {
	const me = staff(ctx, ...ORDER_ROLES);
	const o = findOrder(ctx.params.code);
	const { decision, variantId = null, note = null, notifyCustomer = true } = ctx.body || {};
	const fb = o.feedback;
	const type = fb?.changeType ?? "OTHER";
	const text = String(note ?? "").trim();
	checker()
		.need(["APPLY", "REJECT"].includes(decision), "decision", "اجرا یا رد رو انتخاب کن.")
		.need(!(decision === "REJECT" || (decision === "APPLY" && type === "OTHER")) || !!text, "note", "توضیح برای مشتری رو بنویس.")
		.need(text.length <= 500, "note", "حداکثر ۵۰۰ حرف.")
		.done();
	if (o.status !== "CHANGE_REQUESTED" || !fb) fail(422, "INVALID_STATUS_TRANSITION", "این سفارش درخواست تغییر بازی نداره.");
	const now = Date.now();
	let applied = null;
	let money = 0;
	const it = o.items.find((x) => x.id === fb.orderItemId) || o.items[0];
	if (decision === "APPLY" && (type === "COLOR" || type === "MODEL")) {
		const vid = Number(variantId ?? fb.desiredVariantId);
		const found = variantById(vid);
		if (!found || !found.v.isActive || found.p.status !== "ACTIVE") fail(422, "PRODUCT_UNAVAILABLE", "این رنگ/مدل الان قابل فروش نیست.");
		if (available(found.v) < it.qty) fail(422, "QUANTITY_EXCEEDS_STOCK", `از این رنگ فقط ${available(found.v).toLocaleString("fa-IR")} عدد موجوده.`, { meta: { availableQuantity: available(found.v) } });
		const old = variantById(it.variantId);
		if (old) old.v.stockReserved = Math.max(0, old.v.stockReserved - it.qty);
		found.v.stockReserved += it.qty;
		const price = variantPrice(found.p, found.v);
		money = (price - it.unitPrice) * it.qty;
		Object.assign(it, { productId: found.p.id, variantId: vid, unitPrice: price, unitCompareAt: variantCompareAt(found.p, found.v) });
		if (money < 0) o.refunds.push(newRefund(-money, "ORIGINAL_PAYMENT", "مابه‌التفاوت درخواست تغییر", null));
		if (money > 0) o.totals.balanceDue += money;
		applied = vid;
	} else if (decision === "APPLY" && type === "CANCEL_ITEM") {
		const old = variantById(it.variantId);
		if (old) old.v.stockReserved = Math.max(0, old.v.stockReserved - it.qty);
		if (o.items.length > 1) {
			o.items = o.items.filter((x) => x !== it);
			o.refunds.push(newRefund(it.unitPrice * it.qty, "ORIGINAL_PAYMENT", "حذف قلم با درخواست مشتری", null));
		} else {
			o.status = "CANCELLED";
			o.cancelledAt = now;
			o.refunds.push(newRefund(refundable(o), "ORIGINAL_PAYMENT", "ORDER_CANCELLED", null));
		}
	}
	o.feedback = { ...fb, resolution: { decision, variantId: applied, note: text || null, at: iso(now) } };
	if (o.status !== "CANCELLED") {
		o.status = "PROCESSING";
		o.mediaStatus = "WAITING";
		o.feedbackDeadline = null;
	}
	const what = decision === "REJECT" ? "درخواست تغییر رد شد" : "درخواست تغییر اجرا شد";
	const extra = money > 0 ? `مانده‌ی پرداخت ${money.toLocaleString("fa-IR")} تومان` : money < 0 ? `استرداد ${(-money).toLocaleString("fa-IR")} تومان` : null;
	event(o, o.status, now, [what, extra, text || null, notifyCustomer ? "پیامک به مشتری رفت" : null].filter(Boolean).join(" · "));
	console.log(`  [change] ${o.code} ${decision} by ${author(me)}`);
	return adminOrder(o);
});

route("PUT", "/admin/orders/:code/shipment", (ctx) => {
	staff(ctx, ...ORDER_ROLES);
	const o = findOrder(ctx.params.code);
	const { carrier, trackingCode, shippedAt = null, showInDailyList = true } = ctx.body || {};
	const code = toEn(trackingCode).trim();
	checker()
		.need(!!SHIP[carrier], "carrier", "حامل رو انتخاب کن.")
		.need(code.length >= 6 && code.length <= 40, "trackingCode", "کد رهگیری باید ۶ تا ۴۰ کاراکتر باشه.")
		.done();
	if (["SHIPPED", "DELIVERED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"].includes(o.status)) fail(422, "ORDER_ALREADY_SHIPPED", "این سفارش قبلاً ارسال شده.");
	if (!["PHOTO_SENT", "PROCESSING"].includes(o.status)) fail(422, "INVALID_STATUS_TRANSITION", `سفارش «${STATUS[o.status][0]}» رو نمی‌شه ارسال کرد.`);
	if (o.totals.balanceDue > 0) fail(422, "BALANCE_DUE", `مشتری هنوز ${o.totals.balanceDue.toLocaleString("fa-IR")} تومان مابه‌التفاوت رو نپرداخته.`, { meta: { balanceDue: o.totals.balanceDue } });
	const at = shippedAt ? Date.parse(shippedAt) : Date.now();
	// a reservation group leaves together, under one tracking code
	const group = o.group ? orders.filter((x) => x.group?.code === o.group.code && ["PHOTO_SENT", "PROCESSING"].includes(x.status)) : [o];
	for (const x of group) {
		x.carrier = carrier;
		x.trackingCode = code;
		x.shippedAt = at;
		x.showInDailyList = !!showInDailyList;
		x.status = "SHIPPED";
		event(x, "SHIPPED", at, `${SHIP[carrier].name} · ${code}`);
	}
	return adminOrder(o);
});

route("POST", "/admin/orders/:code/notes", (ctx) => {
	const me = staff(ctx, ...ORDER_ROLES);
	const o = findOrder(ctx.params.code);
	const text = String(ctx.body?.text ?? "").trim();
	checker().need(text.length >= 1, "text", "متن یادداشت خالیه.").need(text.length <= 1000, "text", "یادداشت حداکثر ۱۰۰۰ حرف.").done();
	const note = { id: ++NOTE_SEQ, text, author: author(me), createdAt: iso(Date.now()) };
	o.notes.push(note);
	ctx.status = 201;
	return note;
});

/** A refund as 1.5.0 has it — always starts `PENDING` and moves on with `PATCH /admin/refunds/{id}`. */
function newRefund(amount, method, reason, returnId) {
	return { id: ++REFUND_SEQ, amount, method, status: "PENDING", reason, returnId, createdAt: iso(Date.now()), expectedBy: iso(Date.now() + 3 * DAY), completedAt: null, referenceId: null, statusNote: null };
}
/** What may still be refunded: paid minus every refund that has not failed. */
const refundable = (o) => o.totals.payable - o.refunds.filter((r) => r.status !== "FAILED").reduce((n, r) => n + r.amount, 0);

route("POST", "/admin/orders/:code/refunds", (ctx) => {
	staff(ctx); // ADMIN only
	const o = findOrder(ctx.params.code);
	const { amount, reason, method = "ORIGINAL_PAYMENT", returnId = null } = ctx.body || {};
	const left = refundable(o);
	checker()
		.need(Number.isInteger(amount) && amount > 0, "amount", "مبلغ استرداد رو وارد کن.")
		.need(!(Number.isInteger(amount) && amount > left), "amount", `حداکثر ${Math.max(0, left).toLocaleString("fa-IR")} تومان قابل برگشته.`, "AMOUNT_EXCEEDS_PAID")
		.need(!!String(reason ?? "").trim() && String(reason).length <= 300, "reason", "دلیل استرداد رو بنویس (حداکثر ۳۰۰ حرف).")
		.need(["ORIGINAL_PAYMENT", "BANK_TRANSFER", "STORE_CREDIT"].includes(method), "method", "روش برگشت پول معتبر نیست.")
		.need(returnId == null || returns.some((r) => r.id === Number(returnId) && r.orderCode === o.code), "returnId", "این مرجوعی مال این سفارش نیست.")
		.done();
	if (!PAID(o)) fail(422, "INVALID_STATUS_TRANSITION", "سفارش پرداخت‌نشده استرداد نداره.");
	const r = returnId != null ? returns.find((x) => x.id === Number(returnId)) : null;
	if (r && r.status !== "RECEIVED") fail(422, "INVALID_STATUS_TRANSITION", "استرداد مرجوعی بعد از رسیدن کالا به انبار ثبت می‌شه.");
	const refund = newRefund(amount, method, String(reason).trim(), r ? r.id : null);
	o.refunds.push(refund);
	if (r) r.refund = refund;
	ctx.status = 201;
	return refund;
});

route("PATCH", "/admin/refunds/:id", (ctx) => {
	staff(ctx); // ADMIN only
	const id = Number(ctx.params.id);
	const o = orders.find((x) => x.refunds.some((r) => r.id === id)) || notFound("NOT_FOUND", "استرداد پیدا نشد.");
	const refund = o.refunds.find((r) => r.id === id);
	const { status, referenceId = null, note = null } = ctx.body || {};
	const ref = toEn(referenceId ?? "").trim();
	checker()
		.need(["PROCESSING", "COMPLETED", "FAILED"].includes(status), "status", "وضعیت تازه رو انتخاب کن.")
		.need(!(status === "COMPLETED" && refund.method !== "STORE_CREDIT" && !ref), "referenceId", "شماره‌ی پیگیری بانک رو وارد کن.")
		.need(ref.length <= 64, "referenceId", "حداکثر ۶۴ حرف.")
		.need(!note || String(note).length <= 300, "note", "یادداشت حداکثر ۳۰۰ حرف.")
		.done();
	const allowed = { PENDING: ["PROCESSING", "COMPLETED", "FAILED"], PROCESSING: ["COMPLETED", "FAILED"] }[refund.status] ?? [];
	if (!allowed.includes(status)) fail(422, "INVALID_STATUS_TRANSITION", "این استرداد قبلاً بسته شده؛ برای استرداد ناموفق یکی تازه ثبت کن.");
	refund.status = status;
	refund.statusNote = note?.trim() || null;
	if (ref) refund.referenceId = ref;
	if (status === "COMPLETED") {
		refund.completedAt = iso(Date.now());
		o.totals.refunded += refund.amount;
		const r = refund.returnId != null ? returns.find((x) => x.id === refund.returnId) : null;
		if (r) {
			r.status = "REFUNDED";
			o.status = "REFUNDED";
			event(o, "REFUNDED", Date.now(), `مرجوعی ${r.code}`);
		}
		console.log(`  [sms] استرداد ${refund.amount.toLocaleString("fa-IR")} تومان ${o.code} انجام شد`);
	}
	return refund;
});

route("GET", "/admin/returns", (ctx) => {
	staff(ctx, ...ORDER_ROLES);
	const status = ctx.query.status;
	const list = status ? returns.filter((r) => r.status === status) : returns;
	const { items, meta } = paginate(list, ctx.query, 20);
	return { items: items.map(returnView), meta };
});

route("POST", "/admin/returns/:id/decision", (ctx) => {
	staff(ctx, ...ORDER_ROLES);
	const r = returns.find((x) => x.id === Number(ctx.params.id)) || notFound("NOT_FOUND", "درخواست مرجوعی پیدا نشد.");
	const { approve, shippingPaidBy, instructions, rejectionReason } = ctx.body || {};
	checker()
		.need(typeof approve === "boolean", "approve", "تأیید یا رد رو انتخاب کن.")
		.need(!approve || !shippingPaidBy || ["KIVA", "CUSTOMER"].includes(shippingPaidBy), "shippingPaidBy", "پرداخت‌کننده‌ی هزینه‌ی برگشت معتبر نیست.")
		.need(!approve || !instructions || String(instructions).length <= 1000, "instructions", "راهنما حداکثر ۱۰۰۰ حرف.")
		.need(approve !== false || !!String(rejectionReason ?? "").trim(), "rejectionReason", "دلیل رد رو بنویس.")
		.done();
	if (r.status !== "REQUESTED") fail(422, "INVALID_STATUS_TRANSITION", "درباره‌ی این مرجوعی قبلاً تصمیم گرفته شده.");
	r.decidedAt = Date.now();
	const o = orders.find((x) => x.code === r.orderCode);
	if (approve) {
		r.status = "APPROVED";
		r.shippingPaidBy = shippingPaidBy || (r.reason === "CHANGED_MIND" ? "CUSTOMER" : "KIVA");
		r.instructions = instructions?.trim() || null;
	} else {
		r.status = "REJECTED";
		r.rejectionReason = String(rejectionReason).trim();
		if (o?.status === "RETURN_REQUESTED") o.status = "DELIVERED";
	}
	return returnView(r);
});

const findReturn = (id) => returns.find((x) => x.id === Number(id)) || notFound("NOT_FOUND", "درخواست مرجوعی پیدا نشد.");
const orderOfReturn = (r) => orders.find((x) => x.code === r.orderCode);
const step = (r, to) => {
	if (!returnNext(r).includes(to)) fail(422, "INVALID_STATUS_TRANSITION", "این مرجوعی الان در این مرحله نیست.");
};

route("PUT", "/admin/returns/:id/pickup", (ctx) => {
	staff(ctx, ...ORDER_ROLES);
	const r = findReturn(ctx.params.id);
	const { carrier, scheduledFor = null, trackingCode = null, note = null, notifyCustomer = true } = ctx.body || {};
	const code = toEn(trackingCode ?? "").trim();
	checker()
		.need(!!SHIP[carrier], "carrier", "حامل رو انتخاب کن.")
		.need(!code || (code.length >= 6 && code.length <= 40), "trackingCode", "کد رهگیری باید ۶ تا ۴۰ کاراکتر باشه.")
		.need(scheduledFor == null || !Number.isNaN(Date.parse(scheduledFor)), "scheduledFor", "زمان معتبر نیست.")
		.need(!note || String(note).length <= 500, "note", "حداکثر ۵۰۰ حرف.")
		.done();
	step(r, "PICKUP_SCHEDULED");
	r.status = "PICKUP_SCHEDULED";
	r.pickup = { carrier, scheduledFor: scheduledFor ? Date.parse(scheduledFor) : null, trackingCode: code || null, note: note?.trim() || null };
	if (notifyCustomer) console.log(`  [sms] جمع‌آوری مرجوعی ${r.code}`);
	return returnView(r);
});

route("POST", "/admin/returns/:id/receipt", (ctx) => {
	const me = staff(ctx, ...ORDER_ROLES);
	const r = findReturn(ctx.params.id);
	const { items, note = null } = ctx.body || {};
	const c = checker().need(Array.isArray(items) && items.length > 0, "items", "برای هر قلم تعداد رسیده رو بنویس.");
	(Array.isArray(items) ? items : []).forEach((x, i) => {
		const ri = r.items.find((y) => y.orderItemId === Number(x.orderItemId));
		c.need(!!ri, `items[${i}].orderItemId`, "این قلم در مرجوعی نیست.");
		c.need(Number.isInteger(x.receivedQuantity) && x.receivedQuantity >= 0 && (!ri || x.receivedQuantity <= ri.quantity), `items[${i}].receivedQuantity`, `بین ۰ و ${(ri?.quantity ?? 0).toLocaleString("fa-IR")}.`);
		c.need(Number.isInteger(x.restockQuantity) && x.restockQuantity >= 0 && x.restockQuantity <= (x.receivedQuantity ?? 0), `items[${i}].restockQuantity`, "برگشتی به انبار بیشتر از رسیده نمی‌شه.");
	});
	c.need(!note || String(note).length <= 1000, "note", "حداکثر ۱۰۰۰ حرف.").done();
	step(r, "RECEIVED");
	const o = orderOfReturn(r);
	for (const x of items) {
		if (!x.restockQuantity) continue;
		const it = o?.items.find((y) => y.id === Number(x.orderItemId));
		const found = it && variantById(it.variantId);
		if (found) adjustStock(found, x.restockQuantity, "RETURNED", `مرجوعی ${r.code}`, fullNameOf(me) || me.phone);
	}
	r.status = "RECEIVED";
	r.receivedAt = Date.now();
	r.receipt = { items: items.map((x) => ({ orderItemId: Number(x.orderItemId), receivedQuantity: x.receivedQuantity, restockQuantity: x.restockQuantity })), note: note?.trim() || null };
	if (o) {
		o.status = "RETURNED";
		event(o, "RETURNED", r.receivedAt, `مرجوعی ${r.code} به انبار رسید`);
	}
	return returnView(r);
});

route("POST", "/admin/returns/:id/close", (ctx) => {
	staff(ctx, ...ORDER_ROLES);
	const r = findReturn(ctx.params.id);
	const { reason, notifyCustomer = true } = ctx.body || {};
	const text = String(reason ?? "").trim();
	checker().need(text.length >= 3 && text.length <= 500, "reason", "دلیل بستن رو بنویس (۳ تا ۵۰۰ حرف).").done();
	step(r, "CLOSED");
	r.status = "CLOSED";
	r.closedAt = Date.now();
	r.closeReason = text;
	const o = orderOfReturn(r);
	if (o) {
		o.status = "DELIVERED";
		event(o, "DELIVERED", r.closedAt, `مرجوعی ${r.code} بدون استرداد بسته شد`);
	}
	if (notifyCustomer) console.log(`  [sms] بستن مرجوعی ${r.code}`);
	return returnView(r);
});
