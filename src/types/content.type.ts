/** Blog, FAQ and static pages as the panel edits them (kiva-openapi.yml 1.22.0 · Blog, FAQ, Admin · Content). */
import { HtmlString, IconName, MediaAsset, SeoInput, SeoMeta } from "./common.type";
import { StoreProduct } from "./marketing.type";
import { PageMeta } from "./pageinate";

export type BlogStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type BlogBlockType = "HEADING" | "PARAGRAPH" | "QUOTE" | "TIP" | "PRODUCT" | "IMAGE" | "LIST";

export type BlogCategory = { id: number; slug: string; name: string; postCount?: number };
export type BlogAuthor = { id: number; name: string; title?: string; initial?: string; avatarUrl?: string | null; bio?: string };
/** 1.22.0 `GET /admin/blog/authors` — `isDefault`: the author of a post saved without `authorId` (at most one). */
export type AdminBlogAuthor = BlogAuthor & { isDefault: boolean };

export type BlogPostSummary = {
	id: number;
	slug: string;
	title: string;
	excerpt: string;
	category: BlogCategory;
	cover: MediaAsset | null;
	coverBackground: string | null;
	readingMinutes: number;
	publishedAt: string | null;
	author: BlogAuthor | null;
	isFeatured: boolean;
	tags: string[];
};

export type BlogContentBlock = {
	type: BlogBlockType;
	anchor?: string | null;
	text?: string | null;
	html?: HtmlString | null;
	title?: string | null;
	items?: string[] | null;
	product?: StoreProduct | null;
	image?: MediaAsset | null;
};

export type BlogPostDetail = BlogPostSummary & {
	lead: string;
	blocks: BlogContentBlock[];
	helpfulStats?: { helpfulCount: number; notHelpfulCount: number };
	seo: SeoMeta;
	updatedAt: string;
};

/**
 * 1.21.0 `AdminBlogPost` — the post in the panel, in any state. In the list (`GET /admin/blog/posts`) `blocks` and `toc`
 * are empty; a «کارت محصول» whose product left the store stays with `product = null` and its id in `unavailableProductIds`.
 */
export type AdminBlogPost = BlogPostDetail & {
	status: BlogStatus;
	/** `PUBLISHED` with a future `publishedAt` — not on the magazine yet. */
	scheduled: boolean;
	createdAt: string;
	/** Full name, else the masked phone, or «سیستم». */
	createdBy?: string;
	updatedBy?: string;
	unavailableProductIds: number[];
	/** The last 50 «مفید نبود» comments, newest first — nothing about who wrote them. */
	feedbackComments: { comment: string; createdAt: string }[];
};

/** `GET /admin/blog/posts` — newest edit (`updatedAt`) first. */
export type AdminBlogPostList = { items: AdminBlogPost[]; meta: PageMeta };
export type AdminBlogFilters = { status?: BlogStatus; q?: string; category?: string };

/** A block as it is sent: product and image by id. */
export type BlogBlockInput = {
	type: BlogBlockType;
	text?: string | null;
	html?: string | null;
	title?: string | null;
	items?: string[] | null;
	productId?: number | null;
	imageMediaId?: string | null;
};

export type BlogPostUpsertRequest = {
	title: string;
	slug: string;
	excerpt?: string;
	lead?: string;
	categoryId: number;
	authorId?: number;
	coverMediaId?: string;
	coverBackground?: string | null;
	readingMinutes?: number | null;
	blocks: BlogBlockInput[];
	tags?: string[];
	isFeatured?: boolean;
	status?: BlogStatus;
	publishedAt?: string | null;
	seo?: SeoMeta;
};

/** `GET /admin/faq/groups` — the highlighted texts are always `null` here (they're for the storefront's `q`). */
export type FaqItem = { id: number; question: string; answer: HtmlString; questionHighlighted?: string | null; answerHighlighted?: string | null; sortOrder: number };
export type FaqGroup = { id: string; name: string; icon: IconName | null; isSignature: boolean; sortOrder: number; questions: FaqItem[] };

/** 1.12.0 — a question in `PUT /admin/faq/groups`: with `id` the same one (even moved to another group), without it a new one. */
export type FaqItemInput = { id?: number | null; question: string; answer: string };
/** 1.12.0 — a group in `PUT /admin/faq/groups` (at most 20, each up to 50 questions); order = array order. */
export type FaqGroupInput = { id: string; name: string; icon?: IconName | null; isSignature?: boolean; questions: FaqItemInput[] };

/** `GET /pages/{slug}` — `seo` is complete there (canonical built by the server, no share image yet). */
export type StaticPage = { slug: string; title: string; content: HtmlString; updatedAt: string; seo: SeoMeta };

/** 1.12.0 `StaticPageUpsertRequest` — `slug` absent or the path's own; title 1–120; content 1–50,000 after cleaning. */
export type StaticPageUpsertRequest = { slug?: string | null; title: string; content: string; seo?: SeoInput | null };

/** A row of `GET /admin/pages` (no content), by `slug`. */
export type AdminStaticPageSummary = { slug: string; title: string; updatedAt: string };
