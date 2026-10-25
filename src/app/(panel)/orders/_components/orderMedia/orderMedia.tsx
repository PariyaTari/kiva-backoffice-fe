import classNames from "classnames";
import { Icon } from "@/app/_components/icon/icons";
import { MessengerIcon } from "@/app/_components/icon/messengerIcon";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import { AdminOrder, OrderMediaItem } from "@/types/order.type";
import { formatDateTime, formatPhone, relativeTime } from "@/utils/format";
import { toPersianDigits } from "@/utils/digits";
import { CHANGE_TYPE, labelOf, MEDIA_STATUS, MEDIA_STATUS_TONE, MEDIA_VIEW } from "@/utils/labels";
import { isPhotoStep } from "../../_utils/packing";
import DesiredVariant from "../desiredVariant/desiredVariant";

type OrderMediaProps = {
	order: AdminOrder;
	onEdit: () => void;
	onSend: () => void;
	/** Opens «رسیدگی به درخواست تغییر» (`…/change-request/resolution`). */
	onResolve: () => void;
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
 * the shopper's answer (approve / change request). The operator's two steps (only in `PROCESSING` with the photo
 * `WAITING`): save a draft, then send it by hand and record the sending.
 */
export default function OrderMedia({ order, onEdit, onSend, onResolve }: OrderMediaProps) {
	const m = order.preShipmentMediaDetail;
	const fb = m.feedback;
	const changedItem = fb?.orderItemId ? order.items.find((i) => i.id === fb.orderItemId) : null;
	const res = fb?.resolution ?? null;
	const draft = order.draftItems ?? [];
	const step = isPhotoStep(order);

	return (
		<section className="icard">
			<h3>
				<Icon name="camera" /> عکس قبل از ارسال
				<StatusTag value={m.status} labels={MEDIA_STATUS} tones={MEDIA_STATUS_TONE} />
				<span className="acts">
					{step && (
						<button type="button" className="btn btn-outline btn-sm" onClick={onEdit}>
							<Icon name="upload" /> {draft.length ? "ویرایش پیش‌نویس" : "آپلود عکس"}
						</button>
					)}
					{step && !!draft.length && (
						<button type="button" className="btn btn-primary btn-sm" onClick={onSend}>
							<Icon name="send" /> ثبت ارسال برای مشتری
						</button>
					)}
				</span>
			</h3>

			<p className="muted" style={{ fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
				<MessengerIcon channel={m.channel} width={18} height={18} />
				{m.channelName} · <span className="ltr">{formatPhone(m.phone)}</span>
				{m.username && (
					<>
						{" "}
						· <span className="ltr">{m.username}</span>
					</>
				)}
				{m.sentAt && <> · ارسال {formatDateTime(m.sentAt)}</>}
				{m.feedbackDeadline && !fb && m.status === "SENT" && <> · مهلت پاسخ {relativeTime(m.feedbackDeadline)}</>}
			</p>

			{step && !!draft.length && (
				<>
					<p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
						پیش‌نویس ({toPersianDigits(draft.length)} فایل) — مشتری تا ثبت ارسال نمی‌بیند. عکس‌ها را در {m.channelName} برایش بفرست و بعد «ثبت ارسال» را بزن.
					</p>
					<div className="media-grid draft">
						{draft.map((item) => (
							<MediaThumb key={item.id} item={item} />
						))}
					</div>
				</>
			)}
			{!!m.items.length && (
				<>
					{step && (
						<p className="muted" style={{ fontSize: 12.5, margin: "12px 0 8px" }}>
							آخرین عکس‌هایی که مشتری دیده:
						</p>
					)}
					<div className="media-grid">
						{m.items.map((item) => (
							<MediaThumb key={item.id} item={item} />
						))}
					</div>
				</>
			)}
			{!draft.length && !m.items.length && (
				<div className="media-wait">
					<Icon name="camera" />
					<span>
						{step ? (
							<>
								هنوز عکسی ثبت نشده. از <b>همین</b> کیفی که برای مشتری کنار گذاشته شده، از چند زاویه عکس (و اگر شد ویدیو) بگیر و آپلود کن.
							</>
						) : (
							"عکاسی وقتی سفارش «در حال آماده‌سازی» است انجام می‌شود."
						)}
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
									<Icon name="arrow" />
									<DesiredVariant item={changedItem} variantId={fb.desiredVariantId} changeType={fb.changeType} />
								</>
							)}
						</span>
					)}
					{fb.note && <span>«{fb.note}»</span>}
					{res ? (
						<span className={classNames("res", res.decision === "APPLY" ? "ok" : "no")}>
							<Icon name={res.decision === "APPLY" ? "check" : "ban"} />
							{res.decision === "APPLY" ? "اجرا شد" : "رد شد"} · {formatDateTime(res.at)}
							{res.note && <> · «{res.note}»</>}
							{order.status === "PROCESSING" && m.status === "WAITING" && <> — عکس تازه بگیر و بفرست.</>}
						</span>
					) : (
						order.status === "CHANGE_REQUESTED" && (
							<span className="res-act">
								با مشتری هماهنگ کن، بعد درخواست را اجرا یا رد کن؛ سفارش برای عکاسی دوباره برمی‌گردد.
								<button type="button" className="btn btn-primary btn-sm" onClick={onResolve}>
									<Icon name="swap" /> رسیدگی به درخواست
								</button>
							</span>
						)
					)}
				</div>
			)}
		</section>
	);
}
