/**
 * Content (1.21.0): `/admin/blog/posts*` (every post as `AdminBlogPost`), `/admin/faq/groups`, `/admin/pages*`
 * (ADMIN, CONTENT_EDITOR) and the public reads (`/blog/posts`, `/blog/posts/{idOrSlug}`, `/blog/categories`, `/faq`,
 * `/pages/{slug}`) — those show published posts only (`PUBLISHED` and `publishedAt ≤ now`).
 */
import { DAY, HOUR, checker, fail, iso, normQ, notFound, paginate, route, SLUG } from "../lib.mjs";
import { staff } from "../auth.mjs";
import { actorNameOf } from "../db.mjs";
import { assets } from "../media.mjs";
import { bagImage, productById, variantImage } from "../catalog.mjs";
import * as D from "../data.mjs";

const ROLES = ["CONTENT_EDITOR"];
const BLOCK_TYPES = ["HEADING", "PARAGRAPH", "QUOTE", "TIP", "PRODUCT", "IMAGE", "LIST"];
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const nonEmpty = (v) => String(v ?? "").trim().length > 0;
/** Seen on the magazine: `PUBLISHED` and `publishedAt ≤ now` (a future one is scheduled). */
const isLive = (p) => p.status === "PUBLISHED" && p.publishedAt != null && p.publishedAt <= Date.now();

// ───────────── blog ─────────────
const blogCategories = [];
for (const p of D.POSTS) if (!blogCategories.some((c) => c.slug === p.catSlug)) blogCategories.push({ id: blogCategories.length + 1, slug: p.catSlug, name: p.cat });
const authors = [];
for (const p of D.POSTS) {
	const [name, title] = p.au.split(" — ");
	if (!authors.some((a) => a.name === name)) authors.push({ id: authors.length + 1, name, title: title || "تیم کیوا", initial: name[0], avatarUrl: null, bio: D.AUTHOR_BIO, isDefault: !authors.length });
}
let POST_SEQ = 100;
const posts = D.POSTS.map((p, i) => ({
	id: p.id, slug: p.slug, title: p.t, excerpt: p.ex, lead: p.ex, categoryId: blogCategories.find((c) => c.slug === p.catSlug).id,
	authorId: authors.find((a) => p.au.startsWith(a.name)).id, cover: { id: `cover_${p.id}`, type: "IMAGE", url: bagImage(Object.keys(D.BAG_TYPE).includes(p.bag) ? D.BAG_TYPE[p.bag] : "HOBO", p.c, 2), thumbnailUrl: null, alt: p.t },
	coverBackground: p.bg, readingMinutes: p.min, readingAuto: false,
	blocks: p.body.flatMap(([h, para], k) => [{ type: "HEADING", text: h, anchor: `s${k}` }, { type: "PARAGRAPH", html: `<p>${para}</p>` }]),
	tags: [p.cat], isFeatured: i === 0, status: i === 7 ? "DRAFT" : "PUBLISHED", publishedAt: i === 7 ? null : Date.parse(p.d), updatedAt: Date.parse(p.d) + DAY,
	seo: { title: `${p.t} | مجله کیوا`, description: p.ex.slice(0, 160), canonicalUrl: null, ogImageUrl: null, noIndex: false, jsonLd: null }, helpful: [120 - i * 9, 6 + i],
	createdAt: Date.parse(p.d) - 2 * DAY, createdBy: "پرهام نوری", updatedBy: "پرهام نوری",
	feedback: i === 0 ? [["کاش عکس‌های بیشتری از کیف روی مدل داشت.", 2], ["برای قد کوتاه راهنمایی نداشت.", 9]] : [],
}));
// the test aids of 1.21.0: a scheduled post, an archived one, and a «کارت محصول» whose product left the store (#999)
posts[1].status = "PUBLISHED";
posts[1].publishedAt = Date.now() + 3 * DAY;
posts[6].status = "ARCHIVED";
posts[2].blocks.splice(2, 0, { type: "PRODUCT", productId: 999 });
/** A «کارت محصول» of a product still in the store (not archived) — else `product = null`. */
const storeProduct = (id) => {
	const p = id ? productById(id) : null;
	return p && p.status !== "ARCHIVED" ? p : null;
};
const blockView = (b) => ({
	type: b.type, anchor: b.anchor ?? null, text: b.text ?? null, html: b.html ?? null, title: b.title ?? null, items: b.items ?? null,
	product: (() => { const p = storeProduct(b.productId); return p ? { id: p.id, slug: p.slug, sku: p.sku, name: p.name, price: { price: p.price, compareAtPrice: p.compareAtPrice }, image: { id: `img_${p.id}`, type: "IMAGE", url: variantImage(p, p.variants[0]), thumbnailUrl: null, alt: p.name }, colors: [] } : null; })(),
	image: b.image ?? null,
});
const summaryView = (p) => ({
	id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, category: { ...blogCategories.find((c) => c.id === p.categoryId), postCount: posts.filter((x) => x.categoryId === p.categoryId && isLive(x)).length },
	cover: p.cover, coverBackground: p.coverBackground, readingMinutes: p.readingMinutes, publishedAt: iso(p.publishedAt), author: authors.find((a) => a.id === p.authorId), isFeatured: p.isFeatured, tags: p.tags,
});
const detailView = (p, { panel = false } = {}) => ({
	...summaryView(p), lead: p.lead,
	// the storefront drops a «کارت محصول» whose product is gone; the panel keeps it (with `product = null`)
	blocks: p.blocks.filter((b) => panel || b.type !== "PRODUCT" || storeProduct(b.productId)).map(blockView),
	toc: p.blocks.filter((b) => b.type === "HEADING").map((b) => ({ anchor: b.anchor, title: b.text })),
	breadcrumbs: [], shareUrl: `https://kiva.ir/blog/${p.slug}`, shareLinks: [], helpfulStats: { helpfulCount: p.helpful[0], notHelpfulCount: p.helpful[1] }, seo: p.seo, updatedAt: iso(p.updatedAt),
});
/** 1.21.0 `AdminBlogPost` — the post in any state; in the list (`withContent = false`) `blocks` and `toc` are empty. */
const adminView = (p, withContent = true) => {
	const d = detailView(p, { panel: true });
	return {
		...d, ...(withContent ? {} : { blocks: [], toc: [] }),
		// 1.23.0 — the form's own values as saved (the seeded posts were written by hand)
		excerptInput: "excerptInput" in p ? p.excerptInput : p.excerpt, readingMinutesInput: "readingMinutesInput" in p ? p.readingMinutesInput : p.readingMinutes,
		seoInput: { title: p.seo?.title ?? null, description: p.seo?.description ?? null, noIndex: !!p.seo?.noIndex },
		status: p.status, scheduled: p.status === "PUBLISHED" && p.publishedAt != null && p.publishedAt > Date.now(),
		createdAt: iso(p.createdAt), createdBy: p.createdBy, updatedBy: p.updatedBy,
		unavailableProductIds: p.blocks.filter((b) => b.type === "PRODUCT" && b.productId && !storeProduct(b.productId)).map((b) => b.productId),
		feedbackComments: (p.feedback ?? []).map(([comment, daysAgo]) => ({ comment, createdAt: iso(Date.now() - daysAgo * DAY + HOUR) })),
	};
};
const findPost = (idOrSlug) => {
	const p = posts.find((x) => (String(x.id) === String(idOrSlug) || x.slug === idOrSlug) && isLive(x));
	return p || notFound("NOT_FOUND", "مقاله پیدا نشد.");
};
const findAdminPost = (id) => posts.find((x) => x.id === Number(id)) || notFound("NOT_FOUND", "مقاله پیدا نشد.");
function postFrom(b, prev, me) {
	const len = (v) => String(v ?? "").trim().length;
	const tags = Array.isArray(b.tags) ? b.tags.map((t) => String(t).trim()) : [];
	const c = checker()
		.need(len(b.title) >= 1 && len(b.title) <= 120, "title", "عنوان ۱ تا ۱۲۰ حرف.")
		.need(SLUG.test(b.slug || "") && String(b.slug).length <= 100, "slug", "slug فقط حروف کوچک لاتین، رقم و خط تیره (حداکثر ۱۰۰).")
		.need(blogCategories.some((x) => x.id === Number(b.categoryId)), "categoryId", "این دسته پیدا نشد.", "BLOG_CATEGORY_NOT_FOUND")
		.need(!b.authorId || authors.some((a) => a.id === Number(b.authorId)), "authorId", "نویسنده پیدا نشد.", "BLOG_AUTHOR_NOT_FOUND")
		.need(len(b.excerpt) <= 300, "excerpt", "خلاصه حداکثر ۳۰۰ حرف.")
		.need(len(b.lead) <= 600, "lead", "پاراگراف آغازین حداکثر ۶۰۰ حرف.")
		.need(!b.coverBackground || /^#[0-9A-Fa-f]{6}$/.test(b.coverBackground), "coverBackground", "رنگ مثل #E4D9F3.")
		.need(b.readingMinutes == null || (Number.isInteger(b.readingMinutes) && b.readingMinutes >= 1 && b.readingMinutes <= 60), "readingMinutes", "زمان مطالعه ۱ تا ۶۰ دقیقه، یا خالی.")
		.need(tags.length <= 10, "tags", "حداکثر ۱۰ برچسب.")
		.need(tags.every((t) => t.length >= 1 && t.length <= 30), "tags", "هر برچسب ۱ تا ۳۰ حرف.", "BLOG_TAG_EMPTY")
		.need(Array.isArray(b.blocks) && b.blocks.length > 0 && b.blocks.length <= 100, "blocks", "مقاله ۱ تا ۱۰۰ بلوک می‌خواهد.")
		.need(!b.status || STATUSES.includes(b.status), "status", "وضعیت معتبر نیست.", "BLOG_POST_STATUS_INVALID")
		.need(!b.coverMediaId || assets.has(b.coverMediaId) || b.coverMediaId === prev?.cover?.id, "coverMediaId", "کاور پیدا نشد؛ دوباره آپلود کن.", "MEDIA_NOT_FOUND")
		.need(len(b.seo?.title) <= 70, "seo.title", "عنوان SEO حداکثر ۷۰ حرف.")
		.need(len(b.seo?.description) <= 170, "seo.description", "توضیح SEO حداکثر ۱۷۰ حرف.");
	// field errors of a block sit at `blocks.{i}.{field}` (1.21.0)
	(b.blocks || []).forEach((k, i) => {
		c.need(BLOCK_TYPES.includes(k.type), `blocks.${i}.type`, "نوع بلوک معتبر نیست.", "BLOG_BLOCK_TYPE_INVALID");
		if (k.type === "PRODUCT") c.need(!!storeProduct(k.productId), `blocks.${i}.productId`, k.productId ? "این محصول دیگر در فروشگاه نیست." : "محصول بلوک را انتخاب کن.", "PRODUCT_NOT_FOUND");
		if (k.type === "IMAGE") c.need(!!k.imageMediaId, `blocks.${i}.imageMediaId`, "عکس بلوک را آپلود کن.");
		if (k.type === "LIST") c.need(Array.isArray(k.items) && k.items.some(nonEmpty) && k.items.length <= 20, `blocks.${i}.items`, "لیست ۱ تا ۲۰ مورد.");
		if (["HEADING", "QUOTE"].includes(k.type)) c.need(nonEmpty(k.text), `blocks.${i}.text`, "متن بلوک خالی است.");
		if (["PARAGRAPH", "TIP"].includes(k.type)) {
			c.need(nonEmpty(k.html) || nonEmpty(k.text), `blocks.${i}.html`, "متن بلوک خالی است.");
			c.need(!(nonEmpty(k.html) && nonEmpty(k.text)), `blocks.${i}.html`, "یا متن ساده یا HTML، نه هر دو.", "BLOG_BLOCK_TEXT_OR_HTML");
		}
	});
	c.done();
	if (posts.some((x) => x !== prev && x.slug === b.slug)) fail(409, "DUPLICATE_SLUG", "این slug قبلاً برای مقاله‌ی دیگری ثبت شده.", { errors: [{ field: "slug", code: "DUPLICATE_SLUG", message: "این slug تکراریه." }] });
	const coverAsset = b.coverMediaId ? assets.get(b.coverMediaId) : null;
	const words = b.blocks.map((k) => [k.text, k.html, ...(k.items || [])].join(" ")).join(" ").split(/\s+/).length;
	const status = b.status || prev?.status || "DRAFT";
	let h = 0;
	return {
		title: b.title.trim(), slug: b.slug, excerpt: b.excerpt ?? "", lead: b.lead ?? "", categoryId: Number(b.categoryId), authorId: Number(b.authorId) || authors.find((a) => a.isDefault).id,
		cover: coverAsset ? { id: coverAsset.id, type: coverAsset.type, url: coverAsset.url, thumbnailUrl: coverAsset.thumbnailUrl, alt: b.title } : b.coverMediaId ? prev?.cover ?? null : null,
		coverBackground: b.coverBackground ?? null, readingMinutes: b.readingMinutes ?? Math.max(1, Math.round(words / 180)),
		excerptInput: String(b.excerpt ?? "").trim() || null, readingMinutesInput: b.readingMinutes ?? null,
		blocks: b.blocks.map((k) => {
			const a = k.imageMediaId ? assets.get(k.imageMediaId) : null;
			const prevImage = prev?.blocks.find((x) => x.image?.id === k.imageMediaId)?.image;
			return {
				type: k.type, text: k.text ?? null, html: k.html ?? null, title: k.title ?? null, items: k.items ?? null, productId: k.productId ?? null,
				image: a ? { id: a.id, type: a.type, url: a.url, thumbnailUrl: a.thumbnailUrl, alt: k.text ?? null } : prevImage ?? null, anchor: k.type === "HEADING" ? `s${h++}` : null,
			};
		}),
		tags: [...new Set(tags)], isFeatured: !!b.isFeatured, status, publishedAt: status === "PUBLISHED" ? (b.publishedAt ? Date.parse(b.publishedAt) : prev?.publishedAt ?? Date.now()) : (b.publishedAt ? Date.parse(b.publishedAt) : null),
		// canonical, share image and JSON-LD are built here (what was sent is ignored)
		seo: { title: b.seo?.title ?? null, description: b.seo?.description ?? null, canonicalUrl: `https://kiva.ir/blog/${b.slug}`, ogImageUrl: null, noIndex: !!b.seo?.noIndex, jsonLd: null },
		updatedAt: Date.now(), updatedBy: actorNameOf(me), ...(prev ? {} : { createdAt: Date.now(), createdBy: actorNameOf(me), feedback: [] }),
	};
}

/** At most one featured post: featuring this one takes it off the previous one. */
const keepOneFeatured = (p) => {
	if (p.isFeatured) posts.forEach((x) => x !== p && (x.isFeatured = false));
};

const matches = (p, q) => !q.q || p.title.includes(normQ(q.q)) || p.excerpt.includes(normQ(q.q));
const inCategory = (p, slug) => !slug || blogCategories.find((c) => c.id === p.categoryId)?.slug === slug;

route("GET", "/blog/categories", () => blogCategories.map((c) => ({ ...c, postCount: posts.filter((p) => p.categoryId === c.id && isLive(p)).length })));
route("GET", "/blog/posts", (ctx) => {
	const q = ctx.query;
	const list = posts.filter((p) => isLive(p) && inCategory(p, q.category) && matches(p, q)).sort((a, b) => b.publishedAt - a.publishedAt);
	const { items, meta } = paginate(list, q, 9);
	return { featured: null, items: items.map(summaryView), meta, emptyMessage: list.length ? null : "مقاله‌ای پیدا نشد." };
});
route("GET", "/blog/posts/:idOrSlug", (ctx) => detailView(findPost(ctx.params.idOrSlug)));

// 1.21.0 — the panel's own list and read: every post, newest edit first, as `AdminBlogPost`
route("GET", "/admin/blog/posts", (ctx) => {
	staff(ctx, ...ROLES);
	const q = ctx.query;
	if (q.status && !STATUSES.includes(q.status)) fail(400, "VALIDATION_ERROR", "وضعیت معتبر نیست.", { errors: [{ field: "status", code: "BLOG_POST_STATUS_INVALID", message: "وضعیت معتبر نیست." }] });
	const list = posts.filter((p) => (!q.status || p.status === q.status) && inCategory(p, q.category) && matches(p, q)).sort((a, b) => b.updatedAt - a.updatedAt);
	const { items, meta } = paginate(list, q, 20);
	return { items: items.map((p) => adminView(p, false)), meta };
});
// 1.22.0 — every author for the post form: the default one first, then by creation (no writes: authors are made by SQL)
route("GET", "/admin/blog/authors", (ctx) => {
	staff(ctx, ...ROLES);
	return [...authors].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.id - b.id);
});
route("GET", "/admin/blog/posts/:id", (ctx) => {
	staff(ctx, ...ROLES);
	return adminView(findAdminPost(ctx.params.id));
});
route("POST", "/admin/blog/posts", (ctx) => {
	const me = staff(ctx, ...ROLES);
	const p = { id: ++POST_SEQ, helpful: [0, 0], ...postFrom(ctx.body || {}, null, me) };
	posts.push(p);
	keepOneFeatured(p);
	ctx.status = 201;
	return adminView(p);
});
route("PUT", "/admin/blog/posts/:id", (ctx) => {
	const me = staff(ctx, ...ROLES);
	const p = findAdminPost(ctx.params.id);
	Object.assign(p, postFrom(ctx.body || {}, p, me));
	keepOneFeatured(p);
	return adminView(p);
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
route("GET", "/admin/faq/groups", (ctx) => {
	staff(ctx, ...ROLES);
	return faqGroups.map(faqView);
});
route("PUT", "/admin/faq/groups", (ctx) => {
	staff(ctx, ...ROLES);
	const list = Array.isArray(ctx.body) ? ctx.body : fail(400, "VALIDATION_ERROR", "لیست گروه‌ها لازمه.");
	// a root array: errors at `{i}.field` / `{i}.questions.{k}.field`
	const c = checker().need(list.length <= 20, "groups", "حداکثر ۲۰ گروه.");
	const ids = new Set();
	list.forEach((g, i) => {
		c.need(/^[a-z][a-z0-9-]{1,30}$/.test(g.id || ""), `${i}.id`, "شناسه‌ی گروه (anchor): حروف کوچک لاتین و خط تیره.");
		c.need(!ids.has(g.id), `${i}.id`, "شناسه‌ی گروه تکراری است.");
		ids.add(g.id);
		c.need(nonEmpty(g.name), `${i}.name`, "نام گروه را بنویس.");
		c.need((g.questions || []).length <= 50, `${i}.questions`, "هر گروه حداکثر ۵۰ سؤال.");
		(g.questions || []).forEach((q, k) => {
			c.need(nonEmpty(q.question), `${i}.questions.${k}.question`, "متن سؤال خالی است.");
			c.need(nonEmpty(q.answer), `${i}.questions.${k}.answer`, "پاسخ خالی است.");
		});
	});
	c.done();
	faqGroups = list.map((g, i) => ({
		id: g.id, name: g.name.trim(), icon: g.icon || null, isSignature: !!g.isSignature, sortOrder: i + 1,
		questions: (g.questions || []).map((q, k) => ({ id: q.id ?? ++FAQ_SEQ, question: q.question.trim(), answer: q.answer, sortOrder: k + 1 })),
	}));
	return faqGroups.map(faqView);
});

// ───────────── static pages ─────────────
const pageSeo = (slug, seo, title) => ({ title: seo?.title || `${title} | کیوا`, description: seo?.description ?? null, canonicalUrl: `https://kiva.ir/pages/${slug}`, ogImageUrl: null, noIndex: !!seo?.noIndex });
const pages = new Map([
	["terms", { slug: "terms", title: "قوانین و حریم خصوصی", content: "<h2>سفارش و پرداخت</h2><p>همه‌ی قیمت‌ها به تومان است…</p><h2>عکس قبل از ارسال</h2><p>قبل از بسته‌بندی، از همان کیف عکس می‌فرستیم…</p><h2>حریم خصوصی</h2><p>اطلاعات تماس شما فقط برای ارسال سفارش استفاده می‌شود.</p>", updatedAt: Date.now() - 20 * DAY, seo: pageSeo("terms", null, "قوانین و حریم خصوصی") }],
	["about", { slug: "about", title: "درباره‌ی کیوا", content: "<h2>هرچی ببینی، همون می‌رسه</h2><p>کیوا از یک کارگاه کوچک شروع شد…</p>", updatedAt: Date.now() - 45 * DAY, seo: pageSeo("about", null, "درباره‌ی کیوا") }],
]);
const pageView = (p) => ({ slug: p.slug, title: p.title, content: p.content, seo: p.seo, updatedAt: iso(p.updatedAt) });
/** 1.23.0 `AdminStaticPage` — the edit form's read: plus the SEO as saved. */
const adminPageView = (p) => ({ ...pageView(p), seoInput: { title: p.seoInput?.title ?? null, description: p.seoInput?.description ?? null, noIndex: !!p.seoInput?.noIndex } });
route("GET", "/pages/:slug", (ctx) => pageView(pages.get(ctx.params.slug) || notFound("PAGE_NOT_FOUND", "این صفحه پیدا نشد.")));
route("GET", "/admin/pages/:slug", (ctx) => {
	staff(ctx, ...ROLES);
	return adminPageView(pages.get(ctx.params.slug) || notFound("NOT_FOUND", "این صفحه پیدا نشد."));
});
route("GET", "/admin/pages", (ctx) => {
	staff(ctx, ...ROLES);
	return [...pages.values()].sort((a, b) => b.updatedAt - a.updatedAt).map((p) => ({ slug: p.slug, title: p.title, updatedAt: iso(p.updatedAt) }));
});
route("PUT", "/admin/pages/:slug", (ctx) => {
	staff(ctx, ...ROLES);
	const slug = ctx.params.slug;
	const b = ctx.body || {};
	checker()
		.need(SLUG.test(slug), "slug", "slug فقط حروف کوچک لاتین، رقم و خط تیره.")
		.need(b.slug == null || b.slug === slug, "slug", "slug ِ بدنه باید همان مسیر باشد.")
		.need(nonEmpty(b.title) && String(b.title).trim().length <= 120, "title", "عنوان ۱ تا ۱۲۰ حرف.")
		.need(nonEmpty(b.content) && String(b.content).length <= 50000, "content", "متن صفحه خالی است.")
		.need(!b.seo?.title || String(b.seo.title).length <= 70, "seo.title", "عنوان SEO حداکثر ۷۰ حرف.")
		.need(!b.seo?.description || String(b.seo.description).length <= 170, "seo.description", "توضیح SEO حداکثر ۱۷۰ حرف.")
		.done();
	const p = { slug, title: b.title.trim(), content: b.content, updatedAt: Date.now(), seo: pageSeo(slug, b.seo, b.title.trim()), seoInput: b.seo ?? null };
	pages.set(slug, p);
	return adminPageView(p);
});
