/** Blog, FAQ and static pages as the panel edits them (kiva-openapi.yml 1.4.0 · Blog, FAQ, Admin · Content). */
import { HtmlString, IconName, MediaAsset, SeoMeta } from "./common.type";
import { StoreProduct } from "./marketing.type";
import { PageMeta } from "./pageinate";

export type BlogStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type BlogBlockType = "HEADING" | "PARAGRAPH" | "QUOTE" | "TIP" | "PRODUCT" | "IMAGE" | "LIST";

export type BlogCategory = { id: number; slug: string; name: string; postCount?: number };
export type BlogAuthor = { id: number; name: string; title?: string; initial?: string; avatarUrl?: string | null; bio?: string };

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
	/** Not in the contract's summary (FEATURES §7 #1) — present when the server sends it. */
	status?: BlogStatus;
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

export type BlogPostList = { featured: BlogPostSummary | null; items: BlogPostSummary[]; meta: PageMeta };

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

export type FaqItem = { id?: number; question: string; answer: HtmlString; sortOrder?: number };
export type FaqGroup = { id: string; name: string; icon: IconName; isSignature: boolean; sortOrder?: number; questions: FaqItem[] };

export type StaticPage = { slug: string; title: string; content: HtmlString; updatedAt?: string; seo?: SeoMeta };
