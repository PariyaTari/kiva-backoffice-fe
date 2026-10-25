import Link from "next/link";
import Badge from "@/app/_components/ui/badge/badge";
import { Icon } from "@/app/_components/icon/icons";
import { MessengerIcon } from "@/app/_components/icon/messengerIcon";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import { AdminOrderListItem } from "@/types/order.type";
import { toPersianDigits } from "@/utils/digits";
import { DELETED_ACCOUNT, formatDateTime, formatPhone, formatPrice, relativeTime } from "@/utils/format";
import { labelOf, MESSENGER, ORDER_STATUS, ORDER_STATUS_TONE, SHIPPING_METHOD } from "@/utils/labels";

/** Columns of the order queue (`AdminOrderListItem`). */
export const ORDER_COLUMNS: Column<AdminOrderListItem>[] = [
	{
		key: "code",
		title: "سفارش",
		className: "nowrap",
		render: (o) => (
			<>
				<Link href={`/orders/${encodeURIComponent(o.code)}`} className="code">
					{o.code}
				</Link>
				{o.shipmentGroupCode && <span className="sub ltr">{o.shipmentGroupCode}</span>}
			</>
		),
	},
	{
		key: "placedAt",
		title: "ثبت",
		className: "nowrap",
		render: (o) => (
			<>
				{formatDateTime(o.placedAt)}
				<span className="sub">{relativeTime(o.placedAt)}</span>
			</>
		),
	},
	{
		key: "customer",
		title: "مشتری",
		render: (o) => (
			<>
				{o.customerName ?? (o.customerPhone ? "—" : <span className="muted">{DELETED_ACCOUNT}</span>)}
				{o.customerPhone && <span className="sub ltr">{formatPhone(o.customerPhone)}</span>}
			</>
		),
	},
	{ key: "city", title: "شهر", className: "nowrap", render: (o) => o.city },
	{ key: "items", title: "اقلام", className: "nowrap", render: (o) => toPersianDigits(o.itemsCount) },
	{ key: "payable", title: "مبلغ (تومان)", className: "nowrap", render: (o) => formatPrice(o.payable) },
	{
		key: "shipping",
		title: "ارسال",
		className: "nowrap",
		render: (o) => (
			<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
				{labelOf(SHIPPING_METHOD, o.shippingMethod)}
				<MessengerIcon channel={o.messenger} width={18} height={18} aria-label={labelOf(MESSENGER, o.messenger)} />
			</span>
		),
	},
	{
		key: "media",
		title: "عکس",
		className: "nowrap",
		render: (o) =>
			o.mediaCount ? (
				<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
					<Icon name="camera" width={16} height={16} /> {toPersianDigits(o.mediaCount)}
				</span>
			) : (
				<span className="muted">—</span>
			),
	},
	{
		key: "status",
		title: "وضعیت",
		className: "nowrap",
		render: (o) => (
			<span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
				<StatusTag value={o.status} labels={ORDER_STATUS} tones={ORDER_STATUS_TONE} />
				{o.reserved && o.reservationExpiresAt && <Badge tone="CREAM">آزادسازی {relativeTime(o.reservationExpiresAt)}</Badge>}
				{o.trackingCode && (
					<span className="sub ltr" title="کد رهگیری">
						{o.trackingCode}
					</span>
				)}
			</span>
		),
	},
];
