/** Marketing as the panel edits it (kiva-openapi.yml 1.4.0 · Admin · Marketing, Content). */
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
	/** Cap of a percent code. */
	maxDiscount?: Money | null;
	startsAt?: string | null;
	endsAt?: string | null;
	usageLimit?: number | null;
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
		usedCount: number;
		totalDiscountGiven: Money;
		createdAt: string;
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
	colors?: { variantId: number; color: Color }[];
};

export type Campaign = {
	id: number;
	slug: string;
	title: string;
	subtitle: string;
	icon: IconName;
	startsAt: string;
	endsAt: string;
	products: StoreProduct[];
	isActive: boolean;
	/** Not in the contract's `Campaign` (FEATURES §7 #21) — the chosen ids, when the server sends them. */
	productIds?: number[];
};

export type CampaignUpsertRequest = {
	slug: string;
	title: string;
	subtitle?: string;
	icon?: IconName;
	startsAt: string;
	endsAt: string;
	/** Empty = every discounted product. */
	productIds?: number[];
	isActive?: boolean;
};

export type BannerPlacement = "HOME_HERO" | "HOME_PROMO" | "SHOP_TOP" | "PRODUCT_SIDEBAR" | "BLOG_TOP";
export type BannerTheme = "CREAM" | "PURPLE" | "LILAC" | "DARK" | "WHITE";

export type Banner = {
	id: number;
	placement: BannerPlacement;
	theme: BannerTheme;
	tag: { label: string; icon: IconName | null } | null;
	title: string;
	text: string;
	cta: { label: string; url: string };
	image: MediaAsset | null;
	overlay: { highlight: string | null; title: string | null; subtitle: string | null; channel: SocialChannel | null } | null;
	sortOrder: number;
	startsAt: string | null;
	endsAt: string | null;
};

export type BannerUpsertRequest = {
	placement: BannerPlacement;
	theme?: BannerTheme;
	tagLabel?: string | null;
	tagIcon?: IconName | null;
	title: string;
	text?: string;
	ctaLabel?: string;
	ctaUrl?: string;
	imageMediaId?: string;
	overlayHighlight?: string | null;
	overlayTitle?: string | null;
	overlaySubtitle?: string | null;
	overlayChannel?: SocialChannel | null;
	sortOrder?: number;
	startsAt?: string | null;
	endsAt?: string | null;
};

export type Announcement = {
	id?: number;
	icon: IconName;
	text: string;
	url: string | null;
	sortOrder: number;
	startsAt: string | null;
	endsAt: string | null;
};

export type Testimonial = {
	id: number;
	customerName: string;
	customerInitial?: string;
	city: string;
	source: SocialChannel;
	sourceName?: string;
	message: string;
	messageTime: string;
	receivedAt: string;
	rating: number;
	product: { id: number; slug: string; name: string; imageUrl?: string; colorKey?: ColorKey | null } | null;
	color: Color | null;
	screenshotUrl: string | null;
	/** Not in the contract's `Testimonial` (FEATURES §7 #3) — present when the server sends them. */
	isPublished?: boolean;
	sortOrder?: number;
};

export type TestimonialUpsertRequest = {
	customerName: string;
	city?: string;
	source: SocialChannel;
	message: string;
	messageTime?: string;
	receivedAt?: string;
	rating?: number;
	productId: number;
	colorKey?: ColorKey;
	screenshotMediaId?: string | null;
	isPublished?: boolean;
	sortOrder?: number;
};
