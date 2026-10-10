/**
 * Content: `/admin/blog/posts*`, `/admin/faq/groups`, `/admin/pages/{slug}` (ADMIN, CONTENT_EDITOR) and the public
 * reads the panel lists them from (`/blog/posts`, `/blog/posts/{idOrSlug}`, `/blog/categories`, `/faq`, `/pages/{slug}`).
 * The contract has no admin blog list (FEATURES §7 #1): the public list shows published posts only, and — an
 * assumption of this mock, asked of the backend in docs/PLAN.md — a post read by id/slug with a staff token is
 * returned in any status, so a draft can still be opened for editing right after it was created.
 */
import { DAY, checker, fail, iso, normQ, notFound, paginate, route, SLUG } from "../lib.mjs";
import { staff } from "../auth.mjs";
import { assets } from "../media.mjs";
import { bagImage, productById, variantImage } from "../catalog.mjs";
import * as D from "../data.mjs";

const ROLES = ["CONTENT_EDITOR"];
const BLOCK_TYPES = ["HEADING", "PARAGRAPH", "QUOTE", "TIP", "PRODUCT", "IMAGE", "LIST"];
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const nonEmpty = (v) => String(v ?? "").trim().length > 0;
const isStaff = (ctx) => !!ctx.user && ctx.user.roles.some((r) => r !== "CUSTOMER");

// ───────────── blog ─────────────
const blogCategories = [];
for (const p of D.POSTS) if (!blogCategories.some((c) => c.slug === p.catSlug)) blogCategories.push({ id: blogCategories.length + 1, slug: p.catSlug, name: p.cat });
const authors = [];
for (const p of D.POSTS) {
	const [name, title] = p.au.split(" — ");
	if (!authors.some((a) => a.name === name)) authors.push({ id: authors.length + 1, name, title: title || "تیم کیوا", initial: name[0], avatarUrl: null, bio: D.AUTHOR_BIO });
}
let POST_SEQ = 100;
const posts = D.POSTS.map((p, i) => ({
	id: p.id, slug: p.slug, title: p.t, excerpt: p.ex, lead: p.ex, categoryId: blogCategories.find((c) => c.slug === p.catSlug).id,
	authorId: authors.find((a) => p.au.startsWith(a.name)).id, cover: { id: `cover_${p.id}`, type: "IMAGE", url: bagImage(Object.keys(D.BAG_TYPE).includes(p.bag) ? D.BAG_TYPE[p.bag] : "HOBO", p.c, 2), thumbnailUrl: null, alt: p.t },
	coverBackground: p.bg, readingMinutes: p.min, readingAuto: false,
	blocks: p.body.flatMap(([h, para], k) => [{ type: "HEADING", text: h, anchor: `s${k}` }, { type: "PARAGRAPH", html: `<p>${para}</p>` }]),
	tags: [p.cat], isFeatured: i === 0, status: i === 7 ? "DRAFT" : "PUBLISHED", publishedAt: i === 7 ? null : Date.parse(p.d), updatedAt: Date.parse(p.d) + DAY,
	seo: { title: `${p.t} | مجله کیوا`, description: p.ex.slice(0, 160), canonicalUrl: null, ogImageUrl: null, noIndex: false, jsonLd: null }, helpful: [120 - i * 9, 6 + i],
}));
const blockView = (b) => ({
	type: b.type, anchor: b.anchor ?? null, text: b.text ?? null, html: b.html ?? null, title: b.title ?? null, items: b.items ?? null,
	product: b.productId ? (() => { const p = productById(b.productId); return p ? { id: p.id, slug: p.slug, sku: p.sku, name: p.name, price: { price: p.price, compareAtPrice: p.compareAtPrice }, image: { id: `img_${p.id}`, type: "IMAGE", url: variantImage(p, p.variants[0]), thumbnailUrl: null, alt: p.name }, colors: [] } : null; })() : null,
	image: b.image ?? null,
});
const summaryView = (p) => ({
	id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, category: { ...blogCategories.find((c) => c.id === p.categoryId), postCount: posts.filter((x) => x.categoryId === p.categoryId && x.status === "PUBLISHED").length },
	cover: p.cover, coverBackground: p.coverBackground, readingMinutes: p.readingMinutes, publishedAt: iso(p.publishedAt), author: authors.find((a) => a.id === p.authorId), isFeatured: p.isFeatured, tags: p.tags,
	// not in `BlogPostSummary` — the panel shows it (FEATURES §7 #1)
	status: p.status,
});
const detailView = (p) => ({
	...summaryView(p), lead: p.lead, blocks: p.blocks.map(blockView), toc: p.blocks.filter((b) => b.type === "HEADING").map((b) => ({ anchor: b.anchor, title: b.text })),
	breadcrumbs: [], shareUrl: `https://kiva.ir/blog/${p.slug}`, shareLinks: [], helpfulStats: { helpfulCount: p.helpful[0], notHelpfulCount: p.helpful[1] }, seo: p.seo, updatedAt: iso(p.updatedAt),
});
const findPost = (idOrSlug, ctx) => {
	const p = posts.find((x) => String(x.id) === String(idOrSlug) || x.slug === idOrSlug);
	if (!p || (p.status !== "PUBLISHED" && !isStaff(ctx))) notFound("NOT_FOUND", "مقاله پیدا نشد.");
	return p;
};
function postFrom(b, prev) {
	const c = checker()
		.need(nonEmpty(b.title), "title", "عنوان را بنویس.")
		.need(SLUG.test(b.slug || ""), "slug", "slug فقط حروف کوچک لاتین، رقم و خط تیره.")
		.need(blogCategories.some((x) => x.id === Number(b.categoryId)), "categoryId", "دسته را انتخاب کن.")
		.need(!b.authorId || authors.some((a) => a.id === Number(b.authorId)), "authorId", "نویسنده پیدا نشد.")
		.need(!b.excerpt || String(b.excerpt).length <= 300, "excerpt", "خلاصه حداکثر ۳۰۰ حرف.")
		.need(Array.isArray(b.blocks) && b.blocks.length > 0, "blocks", "مقاله حداقل یک بلوک می‌خواهد.")
		.need(!b.status || STATUSES.includes(b.status), "status", "وضعیت معتبر نیست.")
		.need(!b.coverMediaId || assets.has(b.coverMediaId) || b.coverMediaId === prev?.cover?.id, "coverMediaId", "کاور پیدا نشد؛ دوباره آپلود کن.")
		.need(!b.seo?.description || String(b.seo.description).length <= 170, "seo.description", "توضیح SEO حداکثر ۱۷۰ حرف.");
	(b.blocks || []).forEach((k, i) => {
		c.need(BLOCK_TYPES.includes(k.type), `blocks[${i}].type`, "نوع بلوک معتبر نیست.");
		if (k.type === "PRODUCT") c.need(!!productById(k.productId), `blocks[${i}].productId`, "محصول بلوک را انتخاب کن.");
		if (k.type === "IMAGE") c.need(!!k.imageMediaId, `blocks[${i}].imageMediaId`, "عکس بلوک را آپلود کن.");
		if (k.type === "LIST") c.need(Array.isArray(k.items) && k.items.some(nonEmpty), `blocks[${i}].items`, "لیست خالی است.");
		if (["HEADING", "QUOTE"].includes(k.type)) c.need(nonEmpty(k.text), `blocks[${i}].text`, "متن بلوک خالی است.");
		if (["PARAGRAPH", "TIP"].includes(k.type)) c.need(nonEmpty(k.html) || nonEmpty(k.text), `blocks[${i}].html`, "متن بلوک خالی است.");
	});
	c.done();
	if (posts.some((x) => x !== prev && x.slug === b.slug)) fail(409, "DUPLICATE_SLUG", "این slug قبلاً برای مقاله‌ی دیگری ثبت شده.", { errors: [{ field: "slug", code: "DUPLICATE_SLUG", message: "این slug تکراریه." }] });
	const coverAsset = b.coverMediaId ? assets.get(b.coverMediaId) : null;
	const words = b.blocks.map((k) => [k.text, k.html, ...(k.items || [])].join(" ")).join(" ").split(/\s+/).length;
	const status = b.status || prev?.status || "DRAFT";
	let h = 0;
	return {
		title: b.title.trim(), slug: b.slug, excerpt: b.excerpt ?? "", lead: b.lead ?? "", categoryId: Number(b.categoryId), authorId: Number(b.authorId) || prev?.authorId || 1,
		cover: coverAsset ? { id: coverAsset.id, type: coverAsset.type, url: coverAsset.url, thumbnailUrl: coverAsset.thumbnailUrl, alt: b.title } : b.coverMediaId ? prev?.cover ?? null : null,
		coverBackground: b.coverBackground ?? null, readingMinutes: b.readingMinutes ?? Math.max(1, Math.round(words / 180)),
		blocks: b.blocks.map((k) => {
			const a = k.imageMediaId ? assets.get(k.imageMediaId) : null;
			const prevImage = prev?.blocks.find((x) => x.image?.id === k.imageMediaId)?.image;
			return {
				type: k.type, text: k.text ?? null, html: k.html ?? null, title: k.title ?? null, items: k.items ?? null, productId: k.productId ?? null,
				image: a ? { id: a.id, type: a.type, url: a.url, thumbnailUrl: a.thumbnailUrl, alt: k.text ?? null } : prevImage ?? null, anchor: k.type === "HEADING" ? `s${h++}` : null,
			};
		}),
		tags: b.tags ?? [], isFeatured: !!b.isFeatured, status, publishedAt: status === "PUBLISHED" ? (b.publishedAt ? Date.parse(b.publishedAt) : prev?.publishedAt ?? Date.now()) : (b.publishedAt ? Date.parse(b.publishedAt) : null),
		seo: { title: null, description: null, canonicalUrl: null, ogImageUrl: null, noIndex: false, jsonLd: null, ...(b.seo || {}) }, updatedAt: Date.now(),
	};
}

route("GET", "/blog/categories", () => blogCategories.map((c) => ({ ...c, postCount: posts.filter((p) => p.categoryId === c.id && p.status === "PUBLISHED").length })));
route("GET", "/blog/posts", (ctx) => {
	const q = ctx.query;
	const list = posts
		.filter((p) => p.status === "PUBLISHED")
		.filter((p) => !q.category || blogCategories.find((c) => c.id === p.categoryId)?.slug === q.category)
		.filter((p) => !q.q || p.title.includes(normQ(q.q)) || p.excerpt.includes(normQ(q.q)))
		.sort((a, b) => b.publishedAt - a.publishedAt);
	const { items, meta } = paginate(list, q, 9);
	return { featured: null, items: items.map(summaryView), meta, emptyMessage: list.length ? null : "مقاله‌ای پیدا نشد." };
});
route("GET", "/blog/posts/:idOrSlug", (ctx) => detailView(findPost(ctx.params.idOrSlug, ctx)));
route("POST", "/admin/blog/posts", (ctx) => {
	staff(ctx, ...ROLES);
	const p = { id: ++POST_SEQ, helpful: [0, 0], ...postFrom(ctx.body || {}) };
	posts.push(p);
	ctx.status = 201;
	return detailView(p);
});
route("PUT", "/admin/blog/posts/:id", (ctx) => {
	staff(ctx, ...ROLES);
	const p = posts.find((x) => x.id === Number(ctx.params.id)) || notFound("NOT_FOUND", "مقاله پیدا نشد.");
	Object.assign(p, postFrom(ctx.body || {}, p));
	return detailView(p);
});
route("DELETE", "/admin/blog/posts/:id", (ctx) => {
	staff(ctx, ...ROLES);
	const i = posts.findIndex((x) => x.id === Number(ctx.params.id));
	if (i < 0) notFound("NOT_FOUND", "مقاله پیدا نشد.");
	posts.splice(i, 1);
	ctx.status = 204;
});

// ───────────── FAQ ─────────────
let FAQ_SEQ = 0;
let faqGroups = D.FAQ_GROUPS.map((g, i) => ({
	id: g.id, name: g.name, icon: g.icon, isSignature: !!g.isSignature, sortOrder: i + 1,
	questions: g.q.map(([question, answer], k) => ({ id: ++FAQ_SEQ, question, answer: `<p>${answer}</p>`, sortOrder: k + 1 })),
}));
const faqView = (g) => ({ ...g, questions: g.questions.map((q) => ({ ...q, questionHighlighted: null, answerHighlighted: null })) });
route("GET", "/faq", () => ({ groups: faqGroups.map(faqView), totalMatches: faqGroups.reduce((s, g) => s + g.questions.length, 0), emptyMessage: null }));
route("PUT", "/admin/faq/groups", (ctx) => {
	staff(ctx, ...ROLES);
	const list = Array.isArray(ctx.body) ? ctx.body : fail(400, "VALIDATION_ERROR", "لیست گروه‌ها لازمه.");
	const c = checker();
	const ids = new Set();
	list.forEach((g, i) => {
		c.need(/^[a-z][a-z0-9-]{1,30}$/.test(g.id || ""), `[${i}].id`, "شناسه‌ی گروه (anchor): حروف کوچک لاتین و خط تیره.");
		c.need(!ids.has(g.id), `[${i}].id`, "شناسه‌ی گروه تکراری است.");
		ids.add(g.id);
		c.need(nonEmpty(g.name), `[${i}].name`, "نام گروه را بنویس.");
		(g.questions || []).forEach((q, k) => {
			c.need(nonEmpty(q.question), `[${i}].questions[${k}].question`, "متن سؤال خالی است.");
			c.need(nonEmpty(q.answer), `[${i}].questions[${k}].answer`, "پاسخ خالی است.");
		});
	});
	c.done();
	faqGroups = list.map((g, i) => ({
		id: g.id, name: g.name.trim(), icon: g.icon || "info", isSignature: !!g.isSignature, sortOrder: i + 1,
		questions: (g.questions || []).map((q, k) => ({ id: q.id ?? ++FAQ_SEQ, question: q.question.trim(), answer: q.answer, sortOrder: k + 1 })),
	}));
	return faqGroups.map(faqView);
});

// ───────────── static pages ─────────────
const pages = new Map([
	["terms", { slug: "terms", title: "قوانین و حریم خصوصی", content: "<h2>سفارش و پرداخت</h2><p>همه‌ی قیمت‌ها به تومان است…</p><h2>عکس قبل از ارسال</h2><p>قبل از بسته‌بندی، از همان کیف عکس می‌فرستیم…</p><h2>حریم خصوصی</h2><p>اطلاعات تماس شما فقط برای ارسال سفارش استفاده می‌شود.</p>", updatedAt: Date.now() - 20 * DAY, seo: { title: "قوانین و حریم خصوصی | کیوا", description: null, canonicalUrl: null, ogImageUrl: null, noIndex: false, jsonLd: null } }],
]);
const pageView = (p) => ({ ...p, updatedAt: iso(p.updatedAt) });
route("GET", "/pages/:slug", (ctx) => pageView(pages.get(ctx.params.slug) || notFound("PAGE_NOT_FOUND", "این صفحه پیدا نشد.")));
route("PUT", "/admin/pages/:slug", (ctx) => {
	staff(ctx, ...ROLES);
	const slug = ctx.params.slug;
	const b = ctx.body || {};
	checker()
		.need(SLUG.test(slug), "slug", "slug فقط حروف کوچک لاتین، رقم و خط تیره.")
		.need(nonEmpty(b.title), "title", "عنوان را بنویس.")
		.need(nonEmpty(b.content), "content", "متن صفحه خالی است.")
		.need(!b.seo?.description || String(b.seo.description).length <= 170, "seo.description", "توضیح SEO حداکثر ۱۷۰ حرف.")
		.done();
	const p = { slug, title: b.title.trim(), content: b.content, updatedAt: Date.now(), seo: { title: null, description: null, canonicalUrl: null, ogImageUrl: null, noIndex: false, jsonLd: null, ...(b.seo || {}) } };
	pages.set(slug, p);
	return pageView(p);
});
