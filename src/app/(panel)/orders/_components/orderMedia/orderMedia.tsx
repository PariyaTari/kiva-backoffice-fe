import classNames from "classnames";
import { Icon } from "@/app/_components/icon/icons";
import { MessengerIcon } from "@/app/_components/icon/messengerIcon";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import { AdminOrder, OrderMediaItem } from "@/types/order.type";
import { formatDateTime, formatPhone, relativeTime } from "@/utils/format";
import { CHANGE_TYPE, labelOf, MEDIA_STATUS, MEDIA_STATUS_TONE, MEDIA_VIEW } from "@/utils/labels";

/** Statuses in which photos can still be (re)attached and sent (FEATURES §3.2 steps 2–4). */
export const MEDIA_EDITABLE = ["PROCESSING", "RESERVED", "PHOTO_SENT", "CHANGE_REQUESTED"];
export const MEDIA_SENDABLE = ["PROCESSING", "PHOTO_SENT", "CHANGE_REQUESTED"];

type OrderMediaProps = {
	order: AdminOrder;
	onEdit: () => void;
	onSend: () => void;
};

/** One photo/video tile with its view («نمای جلو»), as the account page's `.mthumb`. */
export function MediaThumb({ item }: { item: OrderMediaItem }) {
	return (
		<a className="mthumb" href={item.url} target="_blank" rel="noreferrer" title={item.alt ?? undefined}>
			{item.type === "VIDEO" ? (
				<video src={item.url} poster={item.posterUrl ?? undefined} muted />
			) : (
				// eslint-disable-next-line @next/next/no-img-element -- API media URL
				<img src={item.thumbnailUrl || item.url} alt={item.alt ?? ""} />
			)}
			{item.view && <small>{labelOf(MEDIA_VIEW, item.view)}</small>}
		</a>
	);
}

/**
 * «امضای کیوا» — the photos of the very bag, where they go (messenger + number), when they went, the deadline and
 * the shopper's answer (approve / change request). The operator's two steps: attach photos, send them.
 */
export default function OrderMedia({ order, onEdit, onSend }: OrderMediaProps) {
	const m = order.preShipmentMediaDetail;
	const fb = m.feedback;
	const changedItem = fb?.orderItemId ? order.items.find((i) => i.id === fb.orderItemId) : null;
	const editable = MEDIA_EDITABLE.includes(order.status);
	const sendable = MEDIA_SENDABLE.includes(order.status) && m.items.length > 0;

	return (
		<section className="icard">
			<h3>
				<Icon name="camera" /> عکس قبل از ارسال
				<StatusTag value={m.status} labels={MEDIA_STATUS} tones={MEDIA_STATUS_TONE} />
				<span className="acts">
					{editable && (
						<button type="button" className="btn btn-outline btn-sm" onClick={onEdit}>
							<Icon name="upload" /> {m.items.length ? "ویرایش عکس‌ها" : "آپلود عکس"}
						</button>
					)}
					{sendable && (
						<button type="button" className="btn btn-primary btn-sm" onClick={onSend}>
							<Icon name="send" /> {m.status === "WAITING" ? "ارسال برای مشتری" : "ارسال دوباره"}
						</button>
					)}
				</span>
			</h3>

			<p className="muted" style={{ fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
				<MessengerIcon channel={m.channel} width={18} height={18} />
				{m.channelName} · <span className="ltr">{formatPhone(m.phone)}</span>
				{m.sentAt && <> · ارسال {formatDateTime(m.sentAt)}</>}
				{m.feedbackDeadline && !fb && m.status === "SENT" && <> · مهلت پاسخ {relativeTime(m.feedbackDeadline)}</>}
			</p>

			{m.items.length ? (
				<div className="media-grid">
					{m.items.map((item) => (
						<MediaThumb key={item.id} item={item} />
					))}
				</div>
			) : (
				<div className="media-wait">
					<Icon name="camera" />
					<span>
						هنوز عکسی ثبت نشده. از <b>همین</b> کیفی که برای مشتری کنار گذاشته شده، از چند زاویه عکس (و اگر شد ویدیو) بگیر و آپلود کن.
					</span>
				</div>
			)}

			{fb && (
				<div className={classNames("fb", fb.decision === "APPROVE" ? "ok" : "chg")}>
					<b>
						<Icon name={fb.decision === "APPROVE" ? "check" : "swap"} />
						{fb.decision === "APPROVE" ? "مشتری تأیید کرد — آماده‌ی بسته‌بندی و ارسال" : `مشتری درخواست تغییر داد${fb.changeType ? `: ${labelOf(CHANGE_TYPE, fb.changeType)}` : ""}`}
						<span style={{ fontWeight: 500, marginInlineStart: "auto", fontSize: 12 }}>{formatDateTime(fb.at)}</span>
					</b>
					{changedItem && (
						<span className="swap">
							{changedItem.name} ({changedItem.color.name})
							{fb.desiredVariantId && (
								<>
									<Icon name="arrow" /> ورینت جایگزین <span className="ltr">#{fb.desiredVariantId}</span>
								</>
							)}
						</span>
					)}
					{fb.note && <span>«{fb.note}»</span>}
					{fb.decision === "REQUEST_CHANGE" && (
						<span style={{ fontSize: 12 }}>
							انجام تغییر در کانترکت endpoint ندارد (FEATURES §۷ #۷): با مشتری هماهنگ کن، یادداشت بگذار و برای عکاسی دوباره وضعیت را به «در حال آماده‌سازی» برگردان.
						</span>
					)}
				</div>
			)}
		</section>
	);
}
