/** Marketing as the panel edits it (kiva-openapi.yml 1.21.0 · Admin · Marketing, Content). */
import { StockStatus } from "./catalog.type";
import { ColorKey, IconName, MediaAsset, Money, SocialChannel } from "./common.type";
import { Color } from "./order.type";
import { PageMeta } from "./pageinate";

export type DiscountType = "PERCENT" | "FIXED";

export type DiscountCodeUpsertRequest = {
	code: string;
	type: DiscountType;
	/** Percent (1–100) or Toman. */
	value: number;
	label: string;
	minSubtotal?: Money | null;
	/** Cap of a percent code only (`MAX_DISCOUNT_NOT_ALLOWED` with `FIXED`). */
	maxDiscount?: Money | null;
	startsAt?: string | null;
	/** Works until (not at) this moment; after `startsAt`. */
	endsAt?: string | null;
	/** Total uses (unpaid orders in progress count too); `null` = no cap. */
	usageLimit?: number | null;
	/** Uses per shopper; `null` = no cap — 1.12.0 has no default (missing = `null`). */
	perUserLimit?: number | null;
	firstOrderOnly?: boolean;
	requiresLogin?: boolean;
	excludeSaleItems?: boolean;
	categoryIds?: number[];
	productIds?: number[];
	isActive?: boolean;
};

export type DiscountCode = Required<Pick<DiscountCodeUpsertRequest, "code" | "type" | "value" | "label">> &
	Omit<DiscountCodeUpsertRequest, "code" | "type" | "value" | "label"> & {
		id: number;
		/** Paid, not cancelled orders with this code. */
		usedCount: number;
		totalDiscountGiven: Money;
		createdAt: string;
		updatedAt: string;
	};

export type DiscountCodeList = { items: DiscountCode[]; meta: PageMeta };

/** What the panel's pickers need of a storefront product card (`ProductSummary`). */
export type StoreProduct = {
	id: number;
	slug: string;
	sku: string;
	name: string;
	image: MediaAsset | null;
	price: { price: Money; compareAtPrice: Money | null; discountPercent?: number };
	colors?: { variantId: number; color: Color; stockStatus?: StockStatus }[];
};

/** The storefront's `ProductVariant` — only what the panel reads. */
export type StoreVariant = {
	id: number;
	sku: string;
	color: Color;
	price: { price: Money; compareAtPrice: Money | null };
	stock: { status: StockStatus; availableQuantity?: number | null; label?: string };
};

/** The storefront's `ProductDetail` (`GET /products/{idOrSlug}`, published products only) — only what the panel reads. */
export type StoreProductDetail = StoreProduct & { variants: StoreVariant[] };

/** Display only — a campaign never changes a price (each product's discount is its own `compareAtPrice`). */
export type Campaign = {
	id: number;
	slug: string;
	title: string;
	subtitle: string | null;
	icon: IconName | null;
	startsAt: string;
	endsAt: string;
	/** The computed list: `productIds` (or every published product) with a discount and a colour in stock, biggest discount first. */
	products: StoreProduct[];
	/** Always `/products?campaign={slug}`. */
	seeAllUrl?: string;
	isActive: boolean;
};

/** 1.5.0 `AdminCampaign` — plus the stored choice; empty `productIds` = every discounted product. */
export type AdminCampaign = Campaign & { productIds: number[] };

/**
 * `PUT` replaces everything (an optional field left out = `null` / default). `slug` ≤ 60 and unique (`409 DUPLICATE_SLUG`);
 * two active campaigns may not overlap (`409 CAMPAIGN_OVERLAP`, `meta.campaignId`).
 */
export type CampaignUpsertRequest = {
	slug: string;
	/** 1–80. */
	title: string;
	/** ≤ 120. */
	subtitle?: string | null;
	icon?: IconName | null;
	startsAt: string;
	/** After `startsAt` (`DATE_RANGE_INVALID`). */
	endsAt: string;
	/** Empty = every discounted product; at most 200, no repeats, none archived. */
	productIds?: number[];
	/** Default `true`. */
	isActive?: boolean;
};

export type BannerPlacement = "HOME_HERO" | "HOME_PROMO" | "SHOP_TOP" | "PRODUCT_SIDEBAR" | "BLOG_TOP";
export type BannerTheme = "CREAM" | "PURPLE" | "LILAC" | "DARK" | "WHITE";

/** Seen while `startsAt ≤ now < endsAt` (either `null` = open); no `isActive` — to hide one, end it or delete it. */
export type Banner = {
	id: number;
	placement: BannerPlacement;
	theme: BannerTheme;
	tag: { label: string; icon: IconName | null } | null;
	title: string;
	text: string | null;
	/** `null` = a banner without a button. */
	cta: { label: string; url: string } | null;
	image: MediaAsset;
	overlay: { highlight: string | null; title: string | null; subtitle: string | null; channel: SocialChannel | null } | null;
	sortOrder: number;
	startsAt: string | null;
	endsAt: string | null;
};

/**
 * 1.21.0 — `PUT` replaces everything. The image is required (`IMAGE_REQUIRED`, a `BANNER` photo); `ctaLabel` and
 * `ctaUrl` both or neither (`CTA_INCOMPLETE`); all `overlay*` empty = no overlay.
 */
export type BannerUpsertRequest = {
	placement: BannerPlacement;
	/** Default `CREAM`. */
	theme?: BannerTheme;
	/** ≤ 30; without it `tag = null`. */
	tagLabel?: string | null;
	tagIcon?: IconName | null;
	/** 1–80. */
	title: string;
	/** ≤ 200. */
	text?: string | null;
	/** ≤ 30. */
	ctaLabel?: string | null;
	/** A full `https://` address or a path of this site starting with `/` (`URL_INVALID`). */
	ctaUrl?: string | null;
	imageMediaId: string;
	overlayHighlight?: string | null;
	overlayTitle?: string | null;
	overlaySubtitle?: string | null;
	overlayChannel?: SocialChannel | null;
	sortOrder?: number;
	startsAt?: string | null;
	endsAt?: string | null;
};

export type Announcement = {
	id: number;
	icon: IconName | null;
	text: string;
	url: string | null;
	/** The place in the list (0, 1, …) — made from the array order of the `PUT`. */
	sortOrder: number;
	startsAt: string | null;
	endsAt: string | null;
};

/**
 * 1.12.0 — one message in the body of `PUT /admin/announcements` (at most 10): with `id` the same message, without it a
 * new one. Order = array order. `text` 1–200; `url` `null`, `https://…` or a path starting with one `/`.
 */
export type AnnouncementInput = {
	id?: number | null;
	icon?: IconName | null;
	text: string;
	url?: string | null;
	startsAt?: string | null;
	endsAt?: string | null;
};

export type Testimonial = {
	id: number;
	customerName: string;
	customerInitial?: string;
	city: string | null;
	source: SocialChannel;
	sourceName?: string;
	message: string;
	/** `HH:MM` on the screenshot. */
	messageTime: string | null;
	receivedAt: string | null;
	rating: number;
	product: { id: number; slug: string; name: string; imageUrl?: string; colorKey?: ColorKey | null } | null;
	color: Color | null;
	screenshotUrl: string | null;
};

/** 1.5.0 `AdminTestimonial` — plus what only the edit form needs (unpublished ones are listed too). */
export type AdminTestimonial = Testimonial & {
	isPublished: boolean;
	sortOrder: number;
	/** The screenshot's media id, so the form can keep it; `null` without one. */
	screenshotMediaId: string | null;
	createdAt: string;
};

/**
 * 1.21.0 — `PUT` replaces everything. `customerName` 1–40, `city` ≤ 40, `message` 1–500 (plain text), `messageTime`
 * `HH:MM`, `receivedAt` not in the future (`DATE_IN_FUTURE`); a not-archived product (`PRODUCT_NOT_FOUND`) and one of
 * its colours (`COLOR_NOT_FOUND`); the screenshot a `TESTIMONIAL` photo.
 */
export type TestimonialUpsertRequest = {
	customerName: string;
	city?: string | null;
	source: SocialChannel;
	message: string;
	messageTime?: string | null;
	receivedAt?: string | null;
	rating?: number;
	productId: number;
	colorKey?: ColorKey | null;
	screenshotMediaId?: string | null;
	isPublished?: boolean;
	sortOrder?: number;
};

export type NewsletterStatus = "ACTIVE" | "UNSUBSCRIBED";

/** A newsletter subscriber (`GET /admin/newsletter/subscriptions`, ADMIN only — e-mails are personal data). */
export type NewsletterSubscription = {
	id: number;
	/** Stored lower-case. */
	email: string;
	status: NewsletterStatus;
	/** Where the form was (`footer`, …). */
	source: string | null;
	subscribedAt: string;
	/** Unsubscribed ones are deleted 90 days later. */
	unsubscribedAt: string | null;
};

/** Newest `subscribedAt` first; the active count = `meta.totalItems` with `status=ACTIVE`. */
export type NewsletterList = { items: NewsletterSubscription[]; meta: PageMeta };
export type NewsletterFilters = { status?: NewsletterStatus; q?: string };
