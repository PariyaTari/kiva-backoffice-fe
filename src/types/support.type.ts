/** Reviews, contact messages and customers as the panel sees them (kiva-openapi.yml 1.4.0 · Admin · Support). */
import { Money, OrderCode, PhotoMessengerChannel } from "./common.type";
import { Color } from "./order.type";
import { PageMeta } from "./pageinate";
import { UserRole } from "./user.type";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AdminReview = {
	id: number;
	productId: number;
	product?: { id: number; slug: string; sku?: string; name: string; imageUrl?: string | null } | null;
	authorName: string;
	authorInitial?: string;
	rating: number;
	title?: string | null;
	text: string;
	createdAt: string;
	status: ReviewStatus;
	statusLabel?: string;
	rejectionReason: string | null;
	isVerifiedBuyer: boolean;
	purchasedColor: Color | null;
	reply: { text: string; authorName: string; createdAt: string } | null;
	helpfulCount: number;
	customerId: number;
	/** The author's phone or email. */
	contact: string;
};

export type AdminReviewList = { items: AdminReview[]; meta: PageMeta; pendingCount: number };
export type ReviewFilters = { status?: ReviewStatus; productId?: number; hasReply?: boolean };
export type ReviewModerationRequest = { action: "APPROVE" | "REJECT"; rejectionReason?: string | null; reply?: string | null };

export type ContactTopic = "ORDER_FOLLOWUP" | "PRODUCT_QUESTION" | "RETURN" | "COLLABORATION" | "OTHER";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";
export type ReplyChannel = "SMS" | "EMAIL";

export type AdminContactMessage = {
	ticketCode: string;
	topic: ContactTopic;
	fullName: string;
	phone: string;
	email: string | null;
	orderCode: OrderCode | null;
	message: string;
	status: TicketStatus;
	reply: string | null;
	/** Not in the contract's `AdminContactMessage` — present when the server sends it. */
	replyChannel?: ReplyChannel | null;
	internalNote: string | null;
	userId: number | null;
	createdAt: string;
	updatedAt: string;
};

export type ContactMessageList = { items: AdminContactMessage[]; meta: PageMeta };
export type ContactMessagePatch = { status?: TicketStatus; reply?: string; replyChannel?: ReplyChannel; internalNote?: string };

export type AdminCustomer = {
	id: number;
	phone: string;
	fullName: string | null;
	email: string | null;
	ordersCount: number;
	totalSpent: Money;
	lastOrderAt: string | null;
	defaultMessenger: PhotoMessengerChannel | null;
	marketingSmsOptIn: boolean;
	roles: UserRole[];
	createdAt: string;
};

export type CustomerList = { items: AdminCustomer[]; meta: PageMeta };
