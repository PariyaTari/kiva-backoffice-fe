/** Catalogue as the panel edits it (kiva-openapi.yml 1.12.0 · Catalog, Admin · Catalog). */
import { ColorKey, HtmlString, MediaAsset, MediaView, Money, SeoInput, SeoMeta } from "./common.type";
import { Color } from "./order.type";
import { PageMeta } from "./pageinate";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
export type BagType = "HOBO" | "CROSSBODY" | "BACKPACK" | "SATCHEL" | "CLUTCH" | "TOTE" | "BUCKET" | "WALLET";
export type MaterialFamily = "GENUINE_LEATHER" | "FAUX_LEATHER" | "CANVAS" | "SUEDE" | "FAUX_SUEDE" | "SATIN" | "VELVET" | "COTTON" | "OTHER";
export type ClosureType = "ZIPPER" | "DOUBLE_ZIPPER" | "ZIPPER_WITH_DECORATIVE_LOCK" | "MAGNETIC_FLAP" | "MAGNETIC_SNAP" | "DRAWSTRING" | "METAL_BUTTON" | "OPEN_TOP";
export type StrapType = "SHOULDER" | "CROSSBODY" | "TOP_HANDLE" | "CHAIN" | "BACKPACK_STRAPS" | "WRISTLET" | "NONE";
export type Occasion = "DAILY" | "UNIVERSITY" | "WORK" | "FORMAL" | "PARTY" | "TRAVEL" | "SHOPPING" | "GATHERING";
export type InventoryReason = "RESTOCK" | "STOCKTAKE" | "DAMAGED" | "RETURNED" | "MANUAL_CORRECTION";
export type ProductSort = "newest" | "updated" | "name" | "price_asc" | "price_desc" | "bestselling" | "stock_asc";

export type CategoryRef = { id: number; slug: string; name: string };
export type MaterialRef = { id: number; slug: string; name: string; family?: MaterialFamily };

export type Category = CategoryRef & {
	description: string | null;
	icon?: { bagType: BagType; colorKey: ColorKey; imageUrl: string | null };
	imageUrl: string | null;
	productCount: number;
	sortOrder: number;
	showInMenu: boolean;
	seo?: SeoMeta;
};

/**
 * 1.5.0 `AdminCategory` — plus the image's media id, so the edit form can keep the current image; 1.23.0 `seoInput`, the SEO
 * as saved (`seo` has the shop's fallbacks — the form edits and sends back `seoInput`).
 */
export type AdminCategory = Category & { imageMediaId: string | null; seoInput: SeoInput };

export type Material = MaterialRef & { description: string | null; careInstructions: string[]; productCount?: number };

export type PriceInfo = { price: Money; compareAtPrice: Money | null; discountPercent?: number; discountAmount?: Money; currency?: "IRT" };
export type RatingBrief = { average: number; count: number };

export type ProductMedia = MediaAsset & { view: MediaView | null; viewLabel?: string | null; sortOrder?: number; isPrimary?: boolean };

export type StrapInfo = {
	type?: StrapType;
	label?: string;
	lengthCm?: number | null;
	minLengthCm?: number | null;
	maxLengthCm?: number | null;
	adjustable?: boolean;
	detachable?: boolean;
	material?: string | null;
};

export type ProductSpecs = {
	dimensions?: { lengthCm: number; heightCm: number; widthCm: number } | null;
	weightGrams?: number | null;
	closure?: { type: ClosureType; label?: string } | null;
	straps?: StrapInfo[] | null;
	pockets?: {
		internal?: number;
		internalZip?: number;
		external?: number;
		phone?: number;
		cardSlots?: number;
		billSlots?: number;
		coinPocket?: boolean;
		detachablePouch?: boolean;
		laptopSleeve?: boolean;
		summary?: string;
	} | null;
	laptopMaxInch?: number | null;
	capacityLiters?: number | null;
	waterproof?: boolean;
	occasions?: { code: Occasion; label?: string }[];
	lining?: { material?: string; color?: string } | null;
	hardware?: { material?: string; finish?: string } | null;
	stitching?: string | null;
	handmade?: boolean;
	madeIn?: string;
	careInstructions?: string[];
	warranty?: { months?: number; description?: string } | null;
};

/** `ProductVariant` + the panel's exact stock and counters. */
export type AdminVariant = {
	id: number;
	sku: string;
	color: Color;
	isDefault: boolean;
	price: PriceInfo;
	media: ProductMedia[];
	hasVideo?: boolean;
	barcode: string | null;
	isActive: boolean;
	/** 1.23.0 — its place among the product's colours. */
	sortOrder: number;
	/** Physical count. */
	stockOnHand: number;
	/** Carts being paid + orders not shipped yet. */
	stockReserved: number;
	stockAvailable: number;
	soldCount: number;
	stockAlertSubscribers: number;
	/** 1.23.0 — the colour's own price as saved; `null` = it follows the product's (`price` is what it sells for). */
	priceOverride: Money | null;
	compareAtPriceOverride: Money | null;
};

export type AdminProduct = {
	id: number;
	slug: string;
	sku: string;
	name: string;
	url?: string;
	category: CategoryRef;
	bagType: BagType;
	price: PriceInfo;
	material: MaterialRef;
	materialDescription: string | null;
	shortDescription: string | null;
	description: HtmlString | null;
	highlights: string[];
	specs: ProductSpecs;
	tags: string[];
	policies?: { returnable?: boolean; reservable?: boolean; maxPerOrder?: number };
	/** What the shop shows (the default colour's price, SEO with fallbacks) — not the form's values. */
	seo: SeoMeta;
	/** 1.23.0 — the product's own price (`price` / `compareAtPrice` of the form); `price` above is the default colour's. */
	basePrice: Money;
	baseCompareAtPrice: Money | null;
	/** 1.23.0 — the SEO as saved; the form edits and sends back this one. */
	seoInput: SeoInput;
	publishedAt: string | null;
	updatedAt: string;
	hasVideo?: boolean;
	rating?: RatingBrief;
	soldCount?: number;
	// admin extras
	status: ProductStatus;
	adminVariants: AdminVariant[];
	newUntil: string | null;
	sortPriority: number;
	/** `null` until view statistics exist. */
	viewsCount: number | null;
	conversionRate: number | null;
	createdAt: string;
	/** The creator's display name (full name, else the masked mobile; «سیستم» for system work). */
	createdBy: string;
	/** `W/"{version}"` — the same as the `ETag` header; goes back as `If-Match`. */
	etag: string;
	/** 1.12.0 — a draft's scheduled publication (`PATCH …/status` with `publishAt`); `null` when none. */
	publishAt: string | null;
};

export type AdminProductListItem = {
	id: number;
	sku: string;
	name: string;
	imageUrl: string | null;
	category: CategoryRef;
	status: ProductStatus;
	price: PriceInfo;
	totalStock: number;
	variantsCount: number;
	lowStockVariants: number;
	soldCount: number;
	rating: RatingBrief | null;
	updatedAt: string;
};

export type AdminProductListResponse = { items: AdminProductListItem[]; meta: PageMeta };

export type AdminProductFilters = {
	q?: string;
	status?: ProductStatus;
	category?: string[];
	stockStatus?: StockStatus;
	sort: ProductSort;
};

// ── writes ──
export type ProductMediaInput = { mediaId: string; view: MediaView; sortOrder?: number; isPrimary?: boolean; alt?: string | null };

export type VariantUpsertRequest = {
	colorKey: ColorKey;
	sku?: string | null;
	barcode?: string | null;
	priceOverride?: Money | null;
	compareAtPriceOverride?: Money | null;
	/** Only when creating — later changes go through inventory adjustments. */
	stockQuantity?: number;
	isDefault?: boolean;
	isActive?: boolean;
	sortOrder?: number;
	media?: ProductMediaInput[];
};

export type ProductUpsertRequest = {
	name: string;
	slug: string;
	sku?: string | null;
	categoryId: number;
	bagType: BagType;
	materialId: number;
	materialDescription?: string | null;
	price: Money;
	compareAtPrice?: Money | null;
	shortDescription?: string | null;
	description?: HtmlString | null;
	highlights?: string[];
	specs?: ProductSpecs;
	tags?: string[];
	newUntil?: string | null;
	/** 1 to 20 — the product's cap across all its colours in one cart / order. */
	maxPerOrder?: number;
	returnable?: boolean;
	reservable?: boolean;
	sortPriority?: number;
	/** Only when creating (default `DRAFT`); ignored by `PUT`. */
	status?: ProductStatus;
	seo?: SeoInput;
	/** Only when creating; ignored by `PUT`. */
	variants?: VariantUpsertRequest[];
};

export type InventoryAdjustment = {
	id: number;
	variantId: number;
	sku: string;
	delta: number;
	reason: InventoryReason;
	note: string | null;
	stockAfter: number;
	createdAt: string;
	createdBy: string;
};

export type CategoryUpsertRequest = {
	name: string;
	slug: string;
	description?: string | null;
	/** 1.12.0 — required, like the icon colour. */
	iconBagType: BagType;
	iconColorKey: ColorKey;
	imageMediaId?: string | null;
	sortOrder?: number;
	showInMenu?: boolean;
	seo?: SeoInput;
};

export type ColorUpsertRequest = { key: ColorKey; name: string; hex: string; isLight?: boolean; sortOrder?: number };
export type MaterialUpsertRequest = { name: string; slug: string; family: MaterialFamily; description?: string | null; careInstructions?: string[] };

/**
 * `GET /admin/stock-alerts` — the active «موجود شد خبرم کن» subscriptions of one colour (or of the whole product when
 * the shopper wanted any colour), with the exact sellable stock now.
 */
export type AdminStockAlertGroup = {
	product: { id: number; slug: string; name: string; imageUrl?: string | null };
	/** `null` = any colour of this product. */
	variantId: number | null;
	color: Color | null;
	sku: string | null;
	waitingCount: number;
	oldestAt: string;
	stockStatus: StockStatus;
	/** For `variantId = null`, the sum of every colour. */
	availableQuantity: number;
};

export type StockAlertFilters = { productId?: number; inStock?: boolean };
