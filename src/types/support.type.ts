/** Reviews, contact messages and customers as the panel sees them (kiva-openapi.yml 1.21.0 · Admin · Support). */
import { MediaAsset, Money, OrderCode, PhotoMessengerChannel } from "./common.type";
import { AdminOrderListItem, Color } from "./order.type";
import { PageMeta } from "./pageinate";
import { Gender, UserRole } from "./user.type";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

/** A row of `GET /admin/reviews`: the full `Review` (with `rejectionReason`) plus who wrote it. */
export type AdminReview = {
	id: number;
	productId: number;
	/** 1.21.0 — only filled in the shopper's «نظرات من»; `null` here (the panel reads the names by id). */
	product: { id: number; slug: string; sku?: string; name: string; imageUrl?: string | null } | null;
	/** What the author typed, else «کاربر کیوا». */
	authorName: string;
	authorInitial: string;
	rating: number;
	/** Always `null` (no input for it). */
	title: string | null;
	/** Plain text — rendered as text, line breaks kept. */
	text: string;
	createdAt: string;
	status: ReviewStatus;
	statusLabel: string;
	rejectionReason: string | null;
	/** Tied to a delivered line of the author's own order. */
	isVerifiedBuyer: boolean;
	purchasedColor: Color | null;
	/** Only while the review is `APPROVED` (a later rejection keeps it, hidden). */
	reply: { text: string; authorName: string; createdAt: string } | null;
	helpfulCount: number;
	myHelpfulVote: boolean | null;
	media: MediaAsset[];
	isMine: boolean;
	customerId: number;
	/** The contact the author gave, else the account's current mobile; `null` when neither exists. */
	contact: string | null;
};

/** `pendingCount` = every `PENDING` review, whatever the filters. */
export type AdminReviewList = { items: AdminReview[]; meta: PageMeta; pendingCount: number };
export type ReviewFilters = { status?: ReviewStatus; productId?: number; hasReply?: boolean };
/** `PENDING` → either; `APPROVED` → `REJECT` (off the site); `REJECTED` → `APPROVE`. A `reply` only with `APPROVE`. */
export type ReviewModerationRequest = { action: "APPROVE" | "REJECT"; rejectionReason?: string | null; reply?: string | null };

export type ContactTopic = "ORDER_FOLLOWUP" | "PRODUCT_QUESTION" | "RETURN" | "COLLABORATION" | "OTHER";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";
export type ReplyChannel = "SMS" | "EMAIL";

export type AdminContactMessage = {
	/** `CT-` and six digits. */
	ticketCode: string;
	topic: ContactTopic;
	fullName: string;
	phone: string;
	email: string | null;
	orderCode: OrderCode | null;
	message: string;
	status: TicketStatus;
	reply: string | null;
	/** 1.21.0 — how the last reply went out; `SMS` carries only a notice with the ticket code, not the text. */
	replyChannel: ReplyChannel | null;
	repliedAt: string | null;
	/** Display name of the operator who replied last (full name, else the masked mobile). */
	repliedBy: string | null;
	internalNote: string | null;
	userId: number | null;
	createdAt: string;
	updatedAt: string;
};

export type ContactMessageList = { items: AdminContactMessage[]; meta: PageMeta };
/**
 * Every field optional (`{}` changes nothing). `reply` (2–1000, plain text) and `replyChannel` go together; a new reply
 * replaces the last one and is sent again. `internalNote` replaces the note (`null` clears it) and never reaches the shopper.
 */
export type ContactMessagePatch = { status?: TicketStatus; reply?: string; replyChannel?: ReplyChannel; internalNote?: string | null };

export type AdminCustomer = {
	id: number;
	phone: string;
	fullName: string | null;
	email: string | null;
	/** Orders whose money arrived (cancelled and returned later too); unpaid and expired ones not. */
	ordersCount: number;
	totalSpent: Money;
	lastOrderAt: string | null;
	defaultMessenger: PhotoMessengerChannel | null;
	marketingSmsOptIn: boolean;
	roles: UserRole[];
	createdAt: string;
};

export type CustomerList = { items: AdminCustomer[]; meta: PageMeta };
/** `role` = only people with that role (`CUSTOMER` = everyone). Deleted accounts never come back. */
export type CustomerFilters = { q?: string; role?: UserRole };

/** A saved address of a shopper (`Address`). */
export type CustomerAddress = {
	id: number;
	title: string | null;
	provinceId: number;
	provinceName: string;
	cityId: number;
	cityName: string;
	addressLine: string;
	plaque: string | null;
	unit: string | null;
	postalCode: string;
	recipientName: string;
	recipientPhone: string;
	isSelfRecipient?: boolean;
	isDefault: boolean;
	/** «استان، شهر، آدرس» and «پلاک …»، «واحد …» when given. */
	fullText: string;
	createdAt?: string;
};

/** `GET /admin/customers/{id}` — the customer page: the full profile, every address (default first) and the last 5 orders in any state. */
export type AdminCustomerDetail = AdminCustomer & {
	firstName: string | null;
	lastName: string | null;
	birthDate: string | null;
	gender: Gender;
	defaultMessengerPhone: string | null;
	addresses: CustomerAddress[];
	recentOrders: AdminOrderListItem[];
};
