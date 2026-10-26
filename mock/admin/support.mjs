/**
 * Support: `/admin/reviews*`, `/admin/contact-messages*`, `/admin/customers` (ADMIN, SUPPORT) and
 * `PUT /admin/customers/{id}/roles` (ADMIN — never your own: `422 ROLE_CHANGE_NOT_ALLOWED`; ends every session of that person).
 */
import { DAY, HOUR, checker, fail, iso, normQ, notFound, paginate, route } from "../lib.mjs";
import { endSessionsOf, staff } from "../auth.mjs";
import { actorNameOf, fullNameOf, userById, users } from "../db.mjs";
import { colorView, products, variantImage } from "../catalog.mjs";
import { listItem, orders } from "./orders.mjs";
import * as D from "../data.mjs";

const ROLES = ["SUPPORT"];
const NOW = Date.now();
const PANEL_ROLES = ["ADMIN", "CATALOG_MANAGER", "OPERATOR", "CONTENT_EDITOR", "SUPPORT"];
const customers = users.filter((u) => u.roles.length === 1 && !u.deletedAt);

// ───────────── reviews ─────────────
let REVIEW_SEQ = 5500;
const live = products.filter((p) => p.status === "ACTIVE");
const reviews = [];
live.forEach((p, i) => {
	D.REVIEW_SAMPLES.slice(0, 1 + (i % 3)).forEach((r, k) => {
		const u = customers[(i * 3 + k) % customers.length];
		const status = (i + k) % 7 === 0 ? "PENDING" : (i + k) % 11 === 0 ? "REJECTED" : "APPROVED";
		reviews.push({
			id: ++REVIEW_SEQ, productId: p.id, customerId: u.id, contact: u.phone, authorName: u.firstName || r.n, rating: r.r, text: r.t,
			createdAt: NOW - (r.daysAgo + i) * DAY, status, rejectionReason: status === "REJECTED" ? "حاوی اطلاعات تماس بود." : null,
			isVerifiedBuyer: k !== 2, purchasedColorKey: p.variants[k % p.variants.length].colorKey,
			reply: r.reply && status === "APPROVED" ? { text: r.reply, authorName: "کیوا", createdAt: NOW - (r.daysAgo + i - 1) * DAY } : null, helpfulCount: (i * 3 + k) % 9,
		});
	});
});
// a few fresh ones waiting
["کیفش خیلی خوش‌دوخته ولی بندش کمی کوتاهه.", "رنگش دقیقاً مثل عکس بود، ممنون!", "دیر رسید ولی ارزشش رو داشت."].forEach((text, k) => {
	const p = live[k + 2], u = customers[k + 10];
	reviews.push({ id: ++REVIEW_SEQ, productId: p.id, customerId: u.id, contact: u.phone, authorName: u.firstName, rating: 4 + (k % 2), text, createdAt: NOW - (k + 1) * 3 * HOUR, status: "PENDING", rejectionReason: null, isVerifiedBuyer: true, purchasedColorKey: p.variants[0].colorKey, reply: null, helpfulCount: 0 });
});
reviews.sort((a, b) => b.createdAt - a.createdAt);
const STATUS_LABEL = { PENDING: "در انتظار تأیید", APPROVED: "تأیید شد", REJECTED: "رد شد" };
const reviewView = (r) => {
	const p = products.find((x) => x.id === r.productId);
	// 1.22.0 — the panel gets `product` too, whatever state the product is in now
	return {
		id: r.id, productId: r.productId, product: p ? { id: p.id, slug: p.slug, sku: p.sku, name: p.name, imageUrl: p.variants[0] ? variantImage(p, p.variants[0]) : null, colorKey: r.purchasedColorKey } : null,
		authorName: r.authorName || "کاربر کیوا", authorInitial: (r.authorName || "ک")[0], rating: r.rating, title: null, text: r.text, createdAt: iso(r.createdAt), status: r.status, statusLabel: STATUS_LABEL[r.status],
		rejectionReason: r.rejectionReason, isVerifiedBuyer: r.isVerifiedBuyer, purchasedColor: p ? colorView(r.purchasedColorKey) : null,
		// the reply shows only while the review is approved (a rejection keeps it, hidden)
		reply: r.reply && r.status === "APPROVED" ? { ...r.reply, createdAt: iso(r.reply.createdAt) } : null, helpfulCount: r.helpfulCount, myHelpfulVote: null, media: [], isMine: false,
		customerId: r.customerId, contact: r.contact ?? userById(r.customerId)?.phone ?? null,
	};
};
const findReview = (id) => reviews.find((r) => r.id === Number(id)) || notFound("NOT_FOUND", "نظر پیدا نشد.");

route("GET", "/admin/reviews", (ctx) => {
	staff(ctx, ...ROLES);
	const q = ctx.query;
	if (q.status && !STATUS_LABEL[q.status]) fail(400, "VALIDATION_ERROR", "وضعیت نظر معتبر نیست.", { errors: [{ field: "status", code: "REVIEW_STATUS_INVALID", message: "وضعیت نظر معتبر نیست." }] });
	const list = reviews
		.filter((r) => !q.status || r.status === q.status)
		.filter((r) => !q.productId || r.productId === Number(q.productId))
		.filter((r) => q.hasReply == null || q.hasReply === "" || String(!!r.reply) === q.hasReply);
	const { items, meta } = paginate(list, q, 20);
	return { items: items.map(reviewView), meta, pendingCount: reviews.filter((r) => r.status === "PENDING").length };
});
route("POST", "/admin/reviews/:id/moderation", (ctx) => {
	staff(ctx, ...ROLES);
	const r = findReview(ctx.params.id);
	const { action, rejectionReason = null, reply = null } = ctx.body || {};
	checker()
		.need(["APPROVE", "REJECT"].includes(action), "action", "تأیید یا رد را انتخاب کن.", "MODERATION_ACTION_INVALID")
		.need(action !== "REJECT" || String(rejectionReason ?? "").trim().length >= 3, "rejectionReason", "دلیل رد را بنویس (دست‌کم ۳ حرف).", "REJECTION_REASON_REQUIRED")
		.need(!rejectionReason || String(rejectionReason).length <= 300, "rejectionReason", "دلیل حداکثر ۳۰۰ حرف.")
		.need(!reply || action !== "REJECT", "reply", "پاسخ کیوا فقط با تأیید ثبت می‌شود.", "REPLY_REQUIRES_APPROVAL")
		.need(!reply || (String(reply).trim().length >= 2 && String(reply).length <= 1000), "reply", "پاسخ ۲ تا ۱۰۰۰ حرف.")
		.done();
	const to = action === "APPROVE" ? "APPROVED" : "REJECTED";
	if (r.status === to) fail(422, "INVALID_STATUS_TRANSITION", to === "APPROVED" ? "این نظر قبلاً تأیید شده." : "این نظر قبلاً رد شده.");
	// approving a rejected one: its author may already have another live review of the product
	if (to === "APPROVED" && reviews.some((x) => x !== r && x.customerId === r.customerId && x.productId === r.productId && x.status !== "REJECTED"))
		fail(409, "REVIEW_ALREADY_EXISTS", "نویسنده‌ی این نظر برای همین محصول نظر دیگری در سایت یا در صف دارد.");
	r.status = to;
	r.rejectionReason = action === "REJECT" ? String(rejectionReason).trim() : null;
	if (reply) r.reply = { text: String(reply).trim(), authorName: "کیوا", createdAt: Date.now() };
	return reviewView(r);
});
route("PUT", "/admin/reviews/:id/reply", (ctx) => {
	staff(ctx, ...ROLES);
	const r = findReview(ctx.params.id);
	const text = String(ctx.body?.text ?? "").trim();
	checker().need(text.length >= 2 && text.length <= 1000, "text", "پاسخ ۲ تا ۱۰۰۰ حرف.").done();
	if (r.status !== "APPROVED") fail(422, "INVALID_STATUS_TRANSITION", "پاسخ کیوا فقط زیر نظر تأییدشده ثبت می‌شود.");
	r.reply = { text, authorName: "کیوا", createdAt: Date.now() };
	return reviewView(r);
});
route("DELETE", "/admin/reviews/:id/reply", (ctx) => {
	staff(ctx, ...ROLES);
	findReview(ctx.params.id).reply = null;
	ctx.status = 204;
});

// ───────────── contact messages ─────────────
const SAMPLE = [
	["ORDER_FOLLOWUP", "سلام، سفارشم هنوز عکسش برام ارسال نشده. کی می‌فرستید؟"],
	["PRODUCT_QUESTION", "کوله‌ی سورا لپ‌تاپ ۱۵ اینچ رو جا می‌ده؟"],
	["RETURN", "کیف رسید ولی رنگش با عکس فرق داره؛ چطور برگردونم؟"],
	["COLLABORATION", "سلام، فروشگاه حضوری داریم و دوست داریم محصولات کیوا رو عمده بخریم."],
	["OTHER", "پیشنهاد: کاش رنگ نعنایی هم داشتید!"],
	["ORDER_FOLLOWUP", "کد رهگیری تیپاکس کار نمی‌کنه."],
];
let TICKET_SEQ = 4800;
const tickets = Array.from({ length: 16 }, (_, i) => {
	const [topic, message] = SAMPLE[i % SAMPLE.length];
	const u = customers[(i * 5) % customers.length];
	const o = orders.find((x) => x.userId === u.id);
	const status = i < 6 ? "OPEN" : i < 10 ? "IN_PROGRESS" : "CLOSED";
	const closed = status === "CLOSED";
	return {
		// `CT-` and six digits (1.21.0)
		ticketCode: `CT-${482000 + (TICKET_SEQ += 37)}`, topic, fullName: fullNameOf(u), phone: u.phone, email: u.email, orderCode: ["ORDER_FOLLOWUP", "RETURN"].includes(topic) ? o?.code ?? null : null,
		message, status, reply: closed ? "سلام، پیگیری شد و تلفنی هم خبر دادیم. ممنون از صبرت 🌸" : null, replyChannel: closed ? (u.email ? "EMAIL" : "SMS") : null,
		repliedAt: closed ? NOW - (i * 5 + 2) * HOUR : null, repliedBy: closed ? "لیلا موسوی" : null,
		internalNote: status === "IN_PROGRESS" ? "با انبار هماهنگ شد؛ منتظر جواب." : null, userId: i % 4 ? u.id : null,
		createdAt: NOW - (i * 7 + 1) * HOUR, updatedAt: NOW - (i * 5 + 1) * HOUR,
	};
});
const ticketView = (t) => ({ ...t, repliedAt: iso(t.repliedAt), createdAt: iso(t.createdAt), updatedAt: iso(t.updatedAt) });
route("GET", "/admin/contact-messages", (ctx) => {
	staff(ctx, ...ROLES);
	const q = ctx.query;
	const list = tickets.filter((t) => (!q.status || t.status === q.status) && (!q.topic || t.topic === q.topic)).sort((a, b) => b.createdAt - a.createdAt);
	const { items, meta } = paginate(list, q, 20);
	return { items: items.map(ticketView), meta };
});
route("PATCH", "/admin/contact-messages/:code", (ctx) => {
	staff(ctx, ...ROLES);
	const t = tickets.find((x) => x.ticketCode === ctx.params.code) || notFound("NOT_FOUND", "پیام پیدا نشد.");
	const me = ctx.user;
	const { status, reply, replyChannel, internalNote } = ctx.body || {};
	const text = reply == null ? "" : String(reply).trim();
	checker()
		.need(!status || ["OPEN", "IN_PROGRESS", "CLOSED"].includes(status), "status", "وضعیت معتبر نیست.")
		.need(reply == null || (text.length >= 2 && text.length <= 1000), "reply", "پاسخ ۲ تا ۱۰۰۰ حرف.")
		// `reply` and `replyChannel` go together (1.21.0)
		.need(reply == null || !!replyChannel, "replyChannel", "کانال پاسخ را انتخاب کن.", "REPLY_CHANNEL_REQUIRED")
		.need(!replyChannel || reply != null, "reply", "متن پاسخ را بنویس.", "REPLY_REQUIRED")
		.need(!replyChannel || ["SMS", "EMAIL"].includes(replyChannel), "replyChannel", "کانال پاسخ معتبر نیست.")
		.need(!(replyChannel === "EMAIL" && !t.email), "replyChannel", "این پیام ایمیل ندارد؛ با پیامک پاسخ بده.", "EMAIL_NOT_AVAILABLE")
		.need(internalNote == null || String(internalNote).length <= 1000, "internalNote", "یادداشت حداکثر ۱۰۰۰ حرف.")
		.done();
	if (status) t.status = status;
	if (reply != null) {
		Object.assign(t, { reply: text, replyChannel, repliedAt: Date.now(), repliedBy: actorNameOf(me) });
		// SMS carries only the notice and the ticket code — never the reply text
		console.log(replyChannel === "SMS" ? `  [sms] «پشتیبانی کیوا به پیامت (${t.ticketCode}) رسیدگی کرد» → ${t.phone}` : `  [email] پاسخ ${t.ticketCode} → ${t.email}`);
	}
	if (internalNote !== undefined) t.internalNote = internalNote || null;
	t.updatedAt = Date.now();
	return ticketView(t);
});

// ───────────── customers & roles ─────────────
function customerView(u) {
	const mine = orders.filter((o) => o.userId === u.id && o.paidAt);
	return {
		id: u.id, phone: u.phone, fullName: fullNameOf(u), email: u.email, ordersCount: mine.length, totalSpent: mine.reduce((s, o) => s + o.totals.payable - o.totals.refunded, 0),
		lastOrderAt: mine.length ? iso(Math.max(...mine.map((o) => o.placedAt))) : null, defaultMessenger: u.defaultMessenger, marketingSmsOptIn: u.marketingSmsOptIn,
		roles: u.roles, createdAt: iso(u.createdAt),
	};
}
route("GET", "/admin/customers", (ctx) => {
	staff(ctx, ...ROLES);
	const q = ctx.query.q ? normQ(ctx.query.q) : "";
	const role = ctx.query.role;
	if (role && role !== "CUSTOMER" && !PANEL_ROLES.includes(role)) fail(400, "VALIDATION_ERROR", "نقش معتبر نیست.", { errors: [{ field: "role", code: "ROLE_INVALID", message: "نقش معتبر نیست." }] });
	const digits = q.replace(/\D/g, "");
	const list = users
		// deleted accounts never come back
		.filter((u) => !u.deletedAt)
		.filter((u) => !q || (digits && u.phone.includes(digits)) || (fullNameOf(u) || "").includes(q))
		// `role` = only people with that role; `CUSTOMER` = everyone
		.filter((u) => !role || role === "CUSTOMER" || u.roles.includes(role))
		.sort((a, b) => b.createdAt - a.createdAt);
	const { items, meta } = paginate(list, ctx.query, 20);
	return { items: items.map(customerView), meta };
});

/** The saved addresses of a shopper — the mock keeps none, so they are read back from the addresses of their orders. */
function addressesOf(u) {
	const seen = new Map();
	orders
		.filter((o) => o.userId === u.id)
		.sort((a, b) => b.placedAt - a.placedAt)
		.forEach((o) => {
			const a = o.address;
			if (seen.has(a.addressLine)) return;
			seen.set(a.addressLine, {
				id: 4000 + u.id * 10 + seen.size, title: seen.size ? null : "خانه", provinceId: 1, provinceName: a.provinceName, cityId: 1, cityName: a.cityName,
				addressLine: a.addressLine, plaque: null, unit: null, postalCode: a.postalCode, recipientName: a.recipientName || fullNameOf(u) || "—", recipientPhone: a.recipientPhone || u.phone,
				isSelfRecipient: true, isDefault: seen.size === 0, location: null, fullText: `${a.provinceName}، ${a.cityName}، ${a.addressLine}`, createdAt: iso(o.placedAt),
			});
		});
	return [...seen.values()];
}

route("GET", "/admin/customers/:id", (ctx) => {
	staff(ctx, ...ROLES);
	const u = users.find((x) => x.id === Number(ctx.params.id)) || notFound("NOT_FOUND", "این کاربر پیدا نشد.");
	if (u.deletedAt) notFound("CUSTOMER_DELETED", "این حساب حذف شده.");
	return {
		...customerView(u), firstName: u.firstName ?? null, lastName: u.lastName ?? null, birthDate: null, gender: "UNSPECIFIED",
		defaultMessengerPhone: u.defaultMessenger ? u.phone : null, addresses: addressesOf(u),
		// the last 5 in any state (unpaid ones too)
		recentOrders: orders.filter((o) => o.userId === u.id).sort((a, b) => b.placedAt - a.placedAt).slice(0, 5).map(listItem),
	};
});
route("PUT", "/admin/customers/:id/roles", (ctx) => {
	const me = staff(ctx); // ADMIN only
	const u = users.find((x) => x.id === Number(ctx.params.id)) || notFound("NOT_FOUND", "کاربر پیدا نشد.");
	if (u.deletedAt) notFound("CUSTOMER_DELETED", "این حساب حذف شده.");
	const roles = ctx.body?.roles;
	if (!Array.isArray(roles) || roles.some((r) => r !== "CUSTOMER" && !PANEL_ROLES.includes(r)))
		fail(400, "VALIDATION_ERROR", "نقش‌ها معتبر نیستند.", { errors: [{ field: "roles", code: "INVALID", message: "نقش‌ها معتبر نیستند." }] });
	if (u.id === me.id) fail(422, "ROLE_CHANGE_NOT_ALLOWED", "نقش‌های خودت را نمی‌توانی عوض کنی.");
	const next = ["CUSTOMER", ...PANEL_ROLES.filter((r) => roles.includes(r))];
	if (u.roles.includes("ADMIN") && !next.includes("ADMIN") && users.filter((x) => x.roles.includes("ADMIN")).length === 1)
		fail(422, "ROLE_CHANGE_NOT_ALLOWED", "این آخرین مدیر کل است؛ اول به کس دیگری نقش مدیر کل بده.", { meta: { reason: "LAST_ADMIN" } });
	u.roles = next;
	endSessionsOf(u.phone);
	console.log(`  [security] نقش‌های ${u.phone} ← ${u.roles.join(",")} توسط ${me.phone}`);
	return customerView(u);
});
