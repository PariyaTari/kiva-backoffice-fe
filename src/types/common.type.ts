/** Shared building blocks of the contract (kiva-openapi.yml 1.4.0 · components/schemas) used across panel sections. */

/** Integer Toman. */
export type Money = number;

/** Tag colour of the design system (`.tag`, `.tag-sale`, …) — the server picks it for status labels. */
export type Tone = "DEFAULT" | "SALE" | "WARN" | "SUCCESS" | "CREAM" | "DARK" | "GLASS" | "DANGER";

/** `KV-218340`. */
export type OrderCode = string;

/** Stable key of a palette colour (`lilac`). */
export type ColorKey = string;

/** Name in the design's icon set (`camera`, `truck`, …). */
export type IconName = string;

/** Sanitized HTML (`p, b, strong, em, a, ul, ol, li, br, mark, h2, h3, blockquote`). */
export type HtmlString = string;

export type MediaAsset = {
	id: string;
	type: "IMAGE" | "VIDEO";
	url: string;
	thumbnailUrl: string | null;
	srcSet?: { width: number; url: string }[];
	posterUrl?: string | null;
	width?: number;
	height?: number;
	durationSec?: number | null;
	mimeType?: string;
	alt: string | null;
	blurhash?: string | null;
};

/** `POST /admin/media` `purpose`. */
export type MediaPurpose = "PRODUCT" | "PRE_SHIPMENT" | "BLOG" | "BANNER" | "CATEGORY" | "TESTIMONIAL";

export type MediaView = "FRONT" | "SIDE" | "BACK" | "DETAIL" | "INTERIOR" | "STYLE" | "ON_MODEL" | "SCALE";

/** Every entity the storefront renders as a page (product, category, post, static page) carries one. */
export type SeoMeta = {
	title?: string | null;
	/** Up to 170 characters. */
	description?: string | null;
	canonicalUrl?: string | null;
	ogImageUrl?: string | null;
	noIndex?: boolean;
	jsonLd?: Record<string, unknown> | null;
};

export type PhotoMessengerChannel = "RUBIKA" | "TELEGRAM" | "BALE";
export type SocialChannel = PhotoMessengerChannel | "INSTAGRAM";
export type ShippingMethodCode = "TIPAX" | "POST" | "COURIER";
export type PaymentGatewayCode = "ZARINPAL" | "SAMAN" | "MELLAT";
