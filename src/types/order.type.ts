/** Orders, payments, refunds and returns as the panel sees them (kiva-openapi.yml 1.21.0 · Orders, Admin · Orders). */
import { ColorKey, IconName, MediaAsset, MediaView, Money, OrderCode, PaymentGatewayCode, PhotoMessengerChannel, ShippingMethodCode, Tone } from "./common.type";
import { PageMeta } from "./pageinate";

export type OrderStatus =
	| "PENDING_PAYMENT"
	| "PAYMENT_FAILED"
	| "EXPIRED"
	| "RESERVED"
	| "PROCESSING"
	| "PHOTO_SENT"
	| "CHANGE_REQUESTED"
	| "SHIPPED"
	| "DELIVERED"
	| "CANCELLED"
	| "RETURN_REQUESTED"
	| "RETURNED"
	| "REFUNDED";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
export type MediaStatus = "WAITING" | "SENT" | "APPROVED" | "CHANGE_REQUESTED";
/** 1.12.0 — refunds are manual bank transfers; there is no store credit any more. */
export type RefundMethod = "ORIGINAL_PAYMENT" | "BANK_TRANSFER";
export type RefundStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type ReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PICKUP_SCHEDULED" | "RECEIVED" | "REFUNDED" | "CLOSED";
export type ReturnReason = "NOT_AS_PICTURED" | "MANUFACTURING_DEFECT" | "WRONG_ITEM" | "DAMAGED_IN_TRANSIT" | "CHANGED_MIND" | "OTHER";
export type ShippingPaidBy = "KIVA" | "CUSTOMER";

export type Color = {
	key: ColorKey;
	name: string;
	hex: string;
	isLight?: boolean;
	sortOrder?: number;
	productCount?: number | null;
};

// ── the queue ──
export type AdminOrderListItem = {
	code: OrderCode;
	placedAt: string;
	status: OrderStatus;
	/** The account's name, else the recipient's; 1.21.0 — `null` for an anonymised order (the account was deleted). */
	customerName: string | null;
	customerPhone: string | null;
	city: string;
	itemsCount: number;
	payable: Money;
	shippingMethod: ShippingMethodCode;
	messenger: PhotoMessengerChannel;
	reserved: boolean;
	reservationExpiresAt: string | null;
	shipmentGroupCode: string | null;
	mediaCount: number;
	trackingCode: string | null;
};

export type AdminOrderListResponse = {
	items: AdminOrderListItem[];
	meta: PageMeta;
	/** Per-status counters of the whole queue (for the tabs). */
	statusCounts: Partial<Record<OrderStatus, number>>;
};

/** `newest` (default) or `oldest` — working the queue in the order it came in. */
export type AdminOrderSort = "newest" | "oldest";

export type AdminOrderFilters = {
	/** Empty = every paid order (unpaid and expired ones only come with an explicit status). */
	status: OrderStatus[];
	q?: string;
	shippingMethod?: ShippingMethodCode;
	reserved?: boolean;
	/** `PROCESSING` with the photo step `WAITING` (a draft or not). */
	awaitingPhotos?: boolean;
	/** Orders with a refund in this state — the manual refund queue. */
	refundStatus?: Extract<RefundStatus, "PENDING" | "PROCESSING">;
	/** `YYYY-MM-DD` */
	from?: string;
	to?: string;
	sort?: AdminOrderSort;
};

// ── one order ──
export type OrderProgressStep = {
	key: "PLACED" | "PHOTO_SENT" | "SHIPPED" | "DELIVERED";
	label: string;
	icon?: IconName;
	state: "DONE" | "CURRENT" | "UPCOMING";
	at: string | null;
};

export type ReservationInfo = {
	active: boolean;
	orderCode: OrderCode;
	startedAt: string;
	expiresAt: string;
	remainingSeconds: number;
	groupOrderCodes: OrderCode[];
	message?: string;
};

export type Shipment = {
	carrier: ShippingMethodCode;
	carrierName: string;
	trackingCode: string | null;
	trackingUrl: string | null;
	shippedAt: string | null;
	deliveredAt: string | null;
	waitingMessage: string | null;
};

export type OrderItem = {
	id: number;
	productId: number;
	variantId: number;
	sku?: string;
	name: string;
	slug?: string;
	color: Color;
	/** 1.12.0 — the colour's photo at purchase time (480px snapshot URL); `null` before media was uploaded. */
	image: string | null;
	quantity: number;
	unitPrice: Money;
	unitCompareAtPrice: Money | null;
	lineTotal: Money;
	reviewed?: boolean;
	returnableUntil: string | null;
};

export type OrderTotals = {
	itemsCompareAtTotal: Money;
	productDiscount: Money;
	subtotal: Money;
	discountCode: string | null;
	codeDiscount: Money;
	shippingCost: Money;
	shippingFreeReason: string | null;
	giftWrapCost?: Money;
	payable: Money;
	refunded: Money;
	/** 1.5.0 — left to pay after a change to a dearer colour/model; the order does not ship until it is 0. */
	balanceDue?: Money;
};

/** 1.21.0 — an anonymised order (deleted account) keeps only the province and city: every personal field is `null`. */
export type AddressSnapshot = {
	provinceName: string;
	cityName: string;
	addressLine: string | null;
	plaque?: string | null;
	unit?: string | null;
	postalCode: string | null;
	recipientName: string | null;
	recipientPhone: string | null;
	/** «استان، شهر» only for an anonymised order. */
	fullText: string;
};

export type OrderMediaItem = MediaAsset & {
	orderItemId: number | null;
	view: MediaView | null;
	capturedAt?: string;
};

export type PreShipmentFeedback = {
	decision: "APPROVE" | "REQUEST_CHANGE";
	note: string | null;
	at: string;
	/** Present on a change request (the shopper's `PreShipmentFeedbackRequest`). */
	changeType?: "COLOR" | "MODEL" | "CANCEL_ITEM" | "OTHER" | null;
	orderItemId?: number | null;
	desiredVariantId?: number | null;
	/** 1.5.0 — what the operator did with the request (`…/change-request/resolution`); `null` until then. */
	resolution?: ChangeRequestResolution | null;
};

export type ChangeRequestDecision = "APPLY" | "REJECT";
export type ChangeRequestResolution = { decision: ChangeRequestDecision; variantId: number | null; note: string | null; at: string };

export type PreShipmentMedia = {
	status: MediaStatus;
	channel: PhotoMessengerChannel;
	channelName: string;
	/** 1.21.0 — `null` only for an anonymised order (with `username` and `note`). */
	phone: string | null;
	/** 1.12.0 — the shopper's id in that messenger, when given at checkout; the operator sends to it. */
	username?: string | null;
	note: string | null;
	sentAt: string | null;
	waitingMessage: string | null;
	/** The last batch **sent**; the operator's draft is `AdminOrder.draftItems`. */
	items: OrderMediaItem[];
	feedback: PreShipmentFeedback | null;
	/** Photo sent + 24h: no answer by then counts as approved, and the order may ship. */
	feedbackDeadline: string | null;
};

export type OrderEvent = { status: OrderStatus; label: string; at: string; note: string | null };

export type OrderPaymentInfo = {
	/** 1.12.0 — `BALANCE` = paying the balance left after a change request. */
	purpose: "ORDER" | "BALANCE";
	/** 1.12.0 — this attempt's amount. */
	amount: Money;
	gateway: PaymentGatewayCode;
	gatewayName: string;
	status: PaymentStatus;
	referenceId: string | null;
	paidAt: string | null;
	cardMask: string | null;
};

export type Refund = {
	id: number;
	amount: Money;
	method: RefundMethod;
	status: RefundStatus;
	reason: string | null;
	/** 1.5.0 — the return this refund is for. */
	returnId?: number | null;
	createdAt?: string;
	/** Created + 72h — when a colleague is expected to have called the shopper. */
	expectedBy: string | null;
	completedAt: string | null;
	/** The bank transfer's tracking number. */
	referenceId: string | null;
	/** 1.5.0 — the note of the last status change; the shopper sees it too. */
	statusNote?: string | null;
};

/** 1.21.0 — every field is always sent. */
export type ReturnRequest = {
	id: number;
	/** `RT-` + (1000 + `id`). */
	code: string;
	orderCode: OrderCode;
	status: ReturnStatus;
	statusLabel: string;
	reason: ReturnReason;
	description: string | null;
	items: { orderItemId: number; name: string; color: Color; quantity: number }[];
	media: MediaAsset[];
	/** Filled from the request on: the reason's suggestion, until the operator changes it on approval. */
	shippingPaidBy: ShippingPaidBy;
	/** After approval: the operator's text or the payer's default; `null` in `REQUESTED` and `REJECTED`. */
	instructions: string | null;
	/** The shopper's preference for the money back. */
	refundMethod: RefundMethod;
	/** Only for `REJECTED`. */
	rejectionReason: string | null;
	/** Kiva collects the parcel (`PICKUP_SCHEDULED`); `null` when the shopper sends it. */
	pickup: ReturnPickup | null;
	/** The return's latest refund (`FAILED` too, with `statusNote`); `null` until one is recorded. */
	refund: Refund | null;
	createdAt: string;
	decidedAt: string | null;
	receivedAt: string | null;
	closedAt: string | null;
	/** Only for `CLOSED`. */
	closeReason: string | null;
};

export type ReturnPickup = { carrier: ShippingMethodCode; carrierName: string; scheduledFor: string | null; trackingCode: string | null; note: string | null };
export type ReturnReceipt = { items: { orderItemId: number; receivedQuantity: number; restockQuantity: number }[]; note: string | null };

/**
 * `AdminReturnRequest` — a return in the panel: the shopper, the warehouse receipt, the next steps and (1.21.0) the
 * suggested refund. The IBAN is not kept anywhere (it is taken by phone).
 */
export type AdminReturnRequest = ReturnRequest & {
	/** From the shopper's **current** account; `phone` is `null` once the account was deleted. */
	customer: { id: number; fullName: string | null; phone: string | null };
	receipt: ReturnReceipt | null;
	/** What may happen next (contract §4); `REFUNDED` = «ثبت استرداد با returnId». `RECEIVED` with an open refund: `[]`. */
	allowedTransitions: ReturnStatus[];
	/**
	 * Only in `RECEIVED`: the paid share of what came back (code discount taken off, **no shipping**), capped at what the
	 * order can still refund. A suggestion — the admin types the amount.
	 */
	suggestedRefund: Money | null;
};

/** `GET /admin/returns` `sort`: by request time — `oldest` shows the parcels that never arrived (no auto-close). */
export type AdminReturnSort = AdminOrderSort;

export type AdminNote = { id: number; text: string; author: string; createdAt: string };

export type AdminOrder = {
	code: OrderCode;
	placedAt: string;
	status: OrderStatus;
	statusLabel: string;
	statusTone: Tone;
	payable: Money;
	shippingMethod: { code: ShippingMethodCode; name: string };
	itemsCount: number;
	progress: { currentStepIndex: number; steps: OrderProgressStep[] };
	reservation: ReservationInfo | null;
	shipment: Shipment;
	items: OrderItem[];
	address: AddressSnapshot;
	totals: OrderTotals;
	payment: OrderPaymentInfo | null;
	preShipmentMediaDetail: PreShipmentMedia;
	timeline: OrderEvent[];
	customerNote: string | null;
	gift: { wrap: boolean; message: string } | null;
	returns: AdminReturnRequest[];
	// admin extras
	/**
	 * `fullName` is `null` when the shopper never gave a name or deleted the account; `phone` is `null` only for a
	 * deleted account (the panel shows «حساب حذف‌شده»). `ordersCount` = their paid orders.
	 */
	customer: { id: number; fullName: string | null; phone: string | null; ordersCount: number };
	/** The group's non-cancelled orders in payment order; `releaseAt` = the end of its reservation. */
	shipmentGroup: { code: string; orderCodes: OrderCode[]; releaseAt: string } | null;
	/** 1.12.0 — the photo draft (`PUT …/pre-shipment-media`) not sent yet; the shopper doesn't see it. */
	draftItems: OrderMediaItem[];
	/** Every payment attempt, oldest first. */
	payments: OrderPaymentInfo[];
	refunds: Refund[];
	notes: AdminNote[];
	allowedTransitions: OrderStatus[];
};

// ── actions ──
export type OrderStatusChangePayload = { status: OrderStatus; note?: string | null; notifyCustomer?: boolean };
export type PreShipmentMediaPayload = { items: { mediaId: string; orderItemId: number | null; view?: MediaView; sortOrder?: number }[] };
/** 1.12.0 — sending is always by hand: `manual` is always `true`, the channel is the one actually used, `message` is only recorded. */
export type SendMediaPayload = { manual: true; channelOverride?: PhotoMessengerChannel; message?: string };
export type ShipmentPayload = { carrier: ShippingMethodCode; trackingCode: string; shippedAt?: string | null; showInDailyList?: boolean };
/** `method` left out: the return's `refundMethod` (with `returnId`), else `ORIGINAL_PAYMENT`. */
export type RefundPayload = { amount: Money; reason: string; method?: RefundMethod; returnId?: number | null };
/** Approve: `shippingPaidBy` / `instructions` left out = the reason's suggestion / the payer's default text. Reject: a reason of 3–500. */
export type ReturnDecisionPayload = { approve: boolean; shippingPaidBy?: ShippingPaidBy | null; instructions?: string | null; rejectionReason?: string | null };
export type ChangeRequestResolutionPayload = { decision: ChangeRequestDecision; variantId?: number | null; note?: string | null; notifyCustomer?: boolean };
export type RefundUpdatePayload = { status: Exclude<RefundStatus, "PENDING">; referenceId?: string | null; note?: string | null };
/** Replaces the whole pickup (a field left out = empty). `carrier` only `TIPAX` / `POST`; `scheduledFor` from an hour ago to 30 days on. */
export type ReturnPickupPayload = { carrier: ShippingMethodCode; scheduledFor?: string | null; trackingCode?: string | null; note?: string | null; notifyCustomer?: boolean };
export type ReturnReceiptPayload = ReturnReceipt;
export type ReturnClosePayload = { reason: string; notifyCustomer?: boolean };
