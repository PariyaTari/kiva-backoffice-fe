/** Orders, payments, refunds and returns as the panel sees them (kiva-openapi.yml 1.4.0 · Orders, Admin · Orders). */
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
export type RefundMethod = "ORIGINAL_PAYMENT" | "BANK_TRANSFER" | "STORE_CREDIT";
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
	customerName: string;
	customerPhone: string;
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

export type AdminOrderFilters = {
	status: OrderStatus[];
	q?: string;
	shippingMethod?: ShippingMethodCode;
	reserved?: boolean;
	awaitingPhotos?: boolean;
	/** `YYYY-MM-DD` */
	from?: string;
	to?: string;
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
	image: MediaAsset | null;
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

export type AddressSnapshot = {
	provinceName: string;
	cityName: string;
	addressLine: string;
	postalCode: string;
	recipientName: string;
	recipientPhone: string;
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
	phone: string;
	note: string | null;
	sentAt: string | null;
	waitingMessage: string | null;
	items: OrderMediaItem[];
	feedback: PreShipmentFeedback | null;
	feedbackDeadline: string | null;
};

export type OrderEvent = { status: OrderStatus; label: string; at: string; note: string | null };

export type OrderPaymentInfo = {
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
	expectedBy: string | null;
	completedAt: string | null;
	/** The bank's / gateway's tracking number. */
	referenceId: string | null;
	/** 1.5.0 — the note of the last status change; the shopper sees it too. */
	statusNote?: string | null;
};

export type ReturnRequest = {
	id: number;
	code: string;
	orderCode: OrderCode;
	status: ReturnStatus;
	statusLabel?: string;
	reason: ReturnReason;
	description: string | null;
	items: { orderItemId: number; name: string; color: Color; quantity: number }[];
	media: MediaAsset[];
	shippingPaidBy: ShippingPaidBy | null;
	instructions: string | null;
	refundMethod?: RefundMethod;
	/** Only for `REJECTED`. */
	rejectionReason?: string | null;
	/** Kiva collects the parcel (`PICKUP_SCHEDULED`); `null` when the shopper sends it. */
	pickup?: ReturnPickup | null;
	refund: Refund | null;
	createdAt: string;
	decidedAt: string | null;
	receivedAt?: string | null;
	closedAt?: string | null;
	/** Only for `CLOSED`. */
	closeReason?: string | null;
};

export type ReturnPickup = { carrier: ShippingMethodCode; carrierName: string; scheduledFor: string | null; trackingCode: string | null; note: string | null };
export type ReturnReceipt = { items: { orderItemId: number; receivedQuantity: number; restockQuantity: number }[]; note: string | null };

/** 1.5.0 `AdminReturnRequest` — a return in the panel: the shopper, the IBAN, the warehouse receipt and the next steps. */
export type AdminReturnRequest = ReturnRequest & {
	customer: { id: number; fullName: string | null; phone: string };
	/** For `refundMethod = BANK_TRANSFER`, else `null`. */
	iban: string | null;
	receipt: ReturnReceipt | null;
	/** What may happen next (contract §4); `REFUNDED` = «ثبت استرداد با returnId». */
	allowedTransitions: ReturnStatus[];
};

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
	customer: { id: number; fullName: string; phone: string; ordersCount: number };
	shipmentGroup: { code: string; orderCodes: OrderCode[]; releaseAt: string } | null;
	payments: OrderPaymentInfo[];
	refunds: Refund[];
	notes: AdminNote[];
	allowedTransitions: OrderStatus[];
};

// ── actions ──
export type OrderStatusChangePayload = { status: OrderStatus; note?: string | null; notifyCustomer?: boolean };
export type PreShipmentMediaPayload = { items: { mediaId: string; orderItemId: number | null; view?: MediaView; sortOrder?: number }[] };
export type SendMediaPayload = { manual?: boolean; channelOverride?: PhotoMessengerChannel; message?: string };
export type ShipmentPayload = { carrier: ShippingMethodCode; trackingCode: string; shippedAt?: string | null; showInDailyList?: boolean };
export type RefundPayload = { amount: Money; reason: string; method?: RefundMethod; returnId?: number | null };
export type ReturnDecisionPayload = { approve: boolean; shippingPaidBy?: ShippingPaidBy; instructions?: string; rejectionReason?: string | null };
export type ChangeRequestResolutionPayload = { decision: ChangeRequestDecision; variantId?: number | null; note?: string | null; notifyCustomer?: boolean };
export type RefundUpdatePayload = { status: Exclude<RefundStatus, "PENDING">; referenceId?: string | null; note?: string | null };
export type ReturnPickupPayload = { carrier: ShippingMethodCode; scheduledFor?: string | null; trackingCode?: string | null; note?: string | null; notifyCustomer?: boolean };
export type ReturnReceiptPayload = ReturnReceipt;
export type ReturnClosePayload = { reason: string; notifyCustomer?: boolean };
