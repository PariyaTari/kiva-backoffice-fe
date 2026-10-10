/**
 * Support: `/admin/reviews*`, `/admin/contact-messages*`, `/admin/customers` (ADMIN, SUPPORT) and
 * `PUT /admin/customers/{id}/roles` (ADMIN — never your own: `422 ROLE_CHANGE_NOT_ALLOWED`; ends every session of that person).
 */
import { DAY, HOUR, checker, fail, iso, normQ, notFound, paginate, route } from "../lib.mjs";
import { endSessionsOf, staff } from "../auth.mjs";
import { fullNameOf, users } from "../db.mjs";
import { colorView, products } from "../catalog.mjs";
import { orders } from "./orders.mjs";
import * as D from "../data.mjs";

const ROLES = ["SUPPORT"];
const NOW = Date.now();
const PANEL_ROLES = ["ADMIN", "CATALOG_MANAGER", "OPERATOR", "CONTENT_EDITOR", "SUPPORT"];
const nonEmpty = (v) => String(v ?? "").trim().length > 0;
const customers = users.filter((u) => u.roles.length === 1);

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
	return {
		id: r.id, productId: r.productId, product: p ? { id: p.id, slug: p.slug, sku: p.sku, name: p.name, imageUrl: p.variants[0]?.media[0]?.url ?? null, colorKey: r.purchasedColorKey } : null,
		authorName: r.authorName, authorInitial: (r.authorName || "ک")[0], rating: r.rating, title: null, text: r.text, createdAt: iso(r.createdAt), status: r.status, statusLabel: STATUS_LABEL[r.status],
		rejectionReason: r.rejectionReason, isVerifiedBuyer: r.isVerifiedBuyer, purchasedColor: colorView(r.purchasedColorKey),
		reply: r.reply ? { ...r.reply, createdAt: iso(r.reply.createdAt) } : null, helpfulCount: r.helpfulCount, myHelpfulVote: null, media: [], isMine: false,
		customerId: r.customerId, contact: r.contact,
	};
};
const findReview = (id) => reviews.find((r) => r.id === Number(id)) || notFound("NOT_FOUND", "نظر پیدا نشد.");

route("GET", "/admin/reviews", (ctx) => {
	staff(ctx, ...ROLES);
	const q = ctx.query;
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
		.need(["APPROVE", "REJECT"].includes(action), "action", "تأیید یا رد را انتخاب کن.")
		.need(action !== "REJECT" || nonEmpty(rejectionReason), "rejectionReason", "دلیل رد را بنویس.")
		.need(!rejectionReason || String(rejectionReason).length <= 300, "rejectionReason", "دلیل حداکثر ۳۰۰ حرف.")
		.need(!reply || (String(reply).trim().length >= 2 && String(reply).length <= 1000), "reply", "پاسخ ۲ تا ۱۰۰۰ حرف.")
		.done();
	r.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
	r.rejectionReason = action === "REJECT" ? String(rejectionReason).trim() : null;
	if (reply) r.reply = { text: String(reply).trim(), authorName: "کیوا", createdAt: Date.now() };
	return reviewView(r);
});
route("PUT", "/admin/reviews/:id/reply", (ctx) => {
	staff(ctx, ...ROLES);
	const r = findReview(ctx.params.id);
	const text = String(ctx.body?.text ?? "").trim();
	checker().need(text.length >= 2 && text.length <= 1000, "text", "پاسخ ۲ تا ۱۰۰۰ حرف.").done();
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
	return {
		ticketCode: `CT-${++TICKET_SEQ}`, topic, fullName: fullNameOf(u), phone: u.phone, email: u.email, orderCode: ["ORDER_FOLLOWUP", "RETURN"].includes(topic) ? o?.code ?? null : null,
		message, status, reply: status === "CLOSED" ? "سلام، پیگیری شد و پیامک برات رفت. ممنون از صبرت 🌸" : null, replyChannel: status === "CLOSED" ? "SMS" : null,
		internalNote: status === "IN_PROGRESS" ? "با انبار هماهنگ شد؛ منتظر جواب." : null, userId: i % 4 ? u.id : null,
		createdAt: NOW - (i * 7 + 1) * HOUR, updatedAt: NOW - (i * 5 + 1) * HOUR,
	};
});
const ticketView = (t) => ({ ...t, createdAt: iso(t.createdAt), updatedAt: iso(t.updatedAt) });
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
	const { status, reply, replyChannel, internalNote } = ctx.body || {};
	checker()
		.need(!status || ["OPEN", "IN_PROGRESS", "CLOSED"].includes(status), "status", "وضعیت معتبر نیست.")
		.need(reply == null || String(reply).length <= 1000, "reply", "پاسخ حداکثر ۱۰۰۰ حرف.")
		.need(!reply || ["SMS", "EMAIL"].includes(replyChannel), "replyChannel", "کانال پاسخ را انتخاب کن.")
		.need(!(reply && replyChannel === "EMAIL" && !t.email), "replyChannel", "این پیام ایمیل ندارد؛ با پیامک پاسخ بده.")
		.need(internalNote == null || String(internalNote).length <= 1000, "internalNote", "یادداشت حداکثر ۱۰۰۰ حرف.")
		.done();
	if (status) t.status = status;
	if (reply) {
		t.reply = String(reply).trim();
		t.replyChannel = replyChannel;
		console.log(`  [${replyChannel}] پاسخ ${t.ticketCode} → ${replyChannel === "SMS" ? t.phone : t.email}`);
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
	const digits = q.replace(/\D/g, "");
	const list = users.filter((u) => !q || (digits && u.phone.includes(digits)) || (fullNameOf(u) || "").includes(q)).sort((a, b) => b.createdAt - a.createdAt);
	const { items, meta } = paginate(list, ctx.query, 20);
	return { items: items.map(customerView), meta };
});
route("PUT", "/admin/customers/:id/roles", (ctx) => {
	const me = staff(ctx); // ADMIN only
	const u = users.find((x) => x.id === Number(ctx.params.id)) || notFound("NOT_FOUND", "کاربر پیدا نشد.");
	const roles = ctx.body?.roles;
	if (!Array.isArray(roles) || roles.some((r) => r !== "CUSTOMER" && !PANEL_ROLES.includes(r)))
		fail(400, "VALIDATION_ERROR", "نقش‌ها معتبر نیستند.", { errors: [{ field: "roles", code: "INVALID", message: "نقش‌ها معتبر نیستند." }] });
	if (u.id === me.id) fail(422, "ROLE_CHANGE_NOT_ALLOWED", "نقش‌های خودت را نمی‌توانی عوض کنی.");
	u.roles = ["CUSTOMER", ...PANEL_ROLES.filter((r) => roles.includes(r))];
	endSessionsOf(u.phone);
	console.log(`  [security] نقش‌های ${u.phone} ← ${u.roles.join(",")} توسط ${me.phone}`);
	return customerView(u);
});
