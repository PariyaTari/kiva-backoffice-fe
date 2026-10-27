/** Store settings and the overview report (kiva-openapi.yml 1.4.0 · AdminSettings, AdminReportOverview). */
import { IconName, Money, PaymentGatewayCode, PhotoMessengerChannel, ShippingMethodCode, SocialChannel } from "./common.type";

export type Weekday = "SATURDAY" | "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

export type ShippingMethod = {
	code: ShippingMethodCode;
	name: string;
	description: string;
	baseCost: Money;
	minDays: number;
	maxDays: number;
	icon: IconName;
	trackingUrlTemplate: string;
	isActive: boolean;
};

export type SupportHours = { label: string; weekdays: Weekday[]; from: string | null; to: string | null; messengerOnly: boolean };
export type SocialLink = { channel: SocialChannel; name: string; url: string; handle: string };
/**
 * `AdminPaymentGatewaySetting` — the switch is `isActive` (the shop turned it on); `available` is read-only: active **and**
 * the server has an adapter for it, so only those are offered to customers. `PUT` reads `code`, `isActive`, `isDefault`.
 */
export type PaymentGateway = { code: PaymentGatewayCode; name: string; isActive: boolean; isDefault: boolean; available: boolean };
export type SiteStats = { happyCustomers: number; preShipmentPhotos: number; photoMatchSatisfactionPercent: number; productModels: number };

export type AdminSettings = {
	shippingMethods: ShippingMethod[];
	freeShippingThreshold: Money;
	freeShippingMethods: ShippingMethodCode[];
	reservationEnabled: boolean;
	reservationHoldDays: number;
	returnWindowDays: number;
	lowStockThreshold: number;
	preShipmentFeedbackHours: number;
	paymentPendingMinutes: number;
	nonShippingWeekdays: Weekday[];
	supportPhone: string;
	supportEmail: string;
	supportHours: SupportHours[];
	social: SocialLink[];
	paymentGateways: PaymentGateway[];
	siteStats: SiteStats;
	features: Record<string, boolean>;
};

export type AdminReportOverview = {
	from: string;
	to: string;
	revenue: Money;
	ordersCount: number;
	averageOrderValue: Money;
	newCustomers: number;
	/** Percents. */
	reservationShare: number;
	mediaApprovalRate: number;
	changeRequestRate: number;
	returnRate: number;
	discountTotal: Money;
	shippingMix: Partial<Record<ShippingMethodCode, number>>;
	messengerMix: Partial<Record<PhotoMessengerChannel, number>>;
	topProducts: { product: { id: number; slug?: string; name: string; imageUrl?: string | null }; unitsSold: number; revenue: Money }[];
	dailySeries: { date: string; revenue: Money; orders: number }[];
};
