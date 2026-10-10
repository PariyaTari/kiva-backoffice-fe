/** Catalogue as the panel edits it (kiva-openapi.yml 1.4.0 · Catalog, Admin · Catalog). */
import { ColorKey, HtmlString, MediaAsset, MediaView, Money, SeoMeta } from "./common.type";
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
	pockets?: { internal?: number; internalZip?: number; external?: number; phone?: number; cardSlots?: number; summary?: string } | null;
	laptopMaxInch?: number | null;
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
	sortOrder?: number;
	/** Physical count. */
	stockOnHand: number;
	/** Carts being paid + orders not shipped yet. */
	stockReserved: number;
	stockAvailable: number;
	soldCount: number;
	stockAlertSubscribers: number;
	/** Not in the contract's `AdminVariant`, but in `VariantUpsertRequest` — present when the server echoes them. */
	priceOverride?: Money | null;
	compareAtPriceOverride?: Money | null;
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
	seo: SeoMeta;
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
	viewsCount: number;
	conversionRate: number;
	createdAt: string;
	createdBy: string;
	etag: string;
	/** Scheduled publication (`PATCH …/status` with `publishAt`) — the mock echoes it. */
	publishAt?: string | null;
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
	maxPerOrder?: number;
	returnable?: boolean;
	reservable?: boolean;
	sortPriority?: number;
	status?: ProductStatus;
	seo?: SeoMeta;
	/** Only when creating. */
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
	iconBagType?: BagType;
	iconColorKey?: ColorKey;
	imageMediaId?: string | null;
	sortOrder?: number;
	showInMenu?: boolean;
	seo?: SeoMeta;
};

export type ColorUpsertRequest = { key: ColorKey; name: string; hex: string; isLight?: boolean; sortOrder?: number };
export type MaterialUpsertRequest = { name: string; slug: string; family: MaterialFamily; description?: string | null; careInstructions?: string[] };
