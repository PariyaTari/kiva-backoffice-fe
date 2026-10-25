"use client";

import { useState } from "react";
import classNames from "classnames";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ErrorComponent2 from "@/app/_components/common/errorComponent2/errorComponent2";
import { Icon } from "@/app/_components/icon/icons";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Button from "@/app/_components/ui/button/button";
import Modal from "@/app/_components/ui/modal/modal";
import Select from "@/app/_components/ui/select/select";
import Switch from "@/app/_components/ui/switch/switch";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { AdminOrder, ChangeRequestDecision, PreShipmentFeedback } from "@/types/order.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { formatToman } from "@/utils/format";
import { CHANGE_TYPE, labelOf, STOCK_STATUS } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";
import { ERROR_BEHAVIOUR, isStaleOrderError, isStoreProductMissingError } from "../../_utils/apiError";
import DesiredVariant from "../desiredVariant/desiredVariant";

/** What «اجرا» does for each kind of request (contract: `adminResolveChangeRequest`). */
const APPLY_EFFECT: Record<NonNullable<PreShipmentFeedback["changeType"]>, string> = {
	COLOR: "قلم به رنگ تازه عوض می‌شود (با قیمت امروزش) و موجودی رزرو جابه‌جا می‌شود.",
	MODEL: "قلم به مدل تازه عوض می‌شود (با قیمت امروزش) و موجودی رزرو جابه‌جا می‌شود.",
	CANCEL_ITEM: "این قلم حذف و سهم پرداخت‌شده‌اش (منهای سهم کد تخفیف، بدون هزینه‌ی ارسال) اول از مانده‌ی پرداخت کم و باقیش استرداد می‌شود؛ اگر تنها قلم سفارش باشد کل سفارش مثل لغو پنل لغو می‌شود.",
	OTHER: "کار را دستی انجام داده‌ای؛ فقط سفارش به آماده‌سازی برمی‌گردد. بنویس چه کردی.",
};

type ChangeRequestModalProps = { order: AdminOrder; open: boolean; onClose: () => void };

/**
 * `POST /admin/orders/{code}/change-request/resolution` — carry out («اجرا») or turn down («رد») what the shopper
 * asked after seeing the photos. Either way the order goes back to «در حال آماده‌سازی» for a new round of photos.
 */
export default function ChangeRequestModal({ order, open, onClose }: ChangeRequestModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={560}>
			<ChangeRequestForm order={order} onClose={onClose} />
		</Modal>
	);
}

function ChangeRequestForm({ order, onClose }: Omit<ChangeRequestModalProps, "open">) {
	const queryClient = useQueryClient();
	const fb = order.preShipmentMediaDetail.feedback;
	const item = order.items.find((i) => i.id === fb?.orderItemId) ?? null;
	const type = fb?.changeType ?? "OTHER";
	const swaps = (type === "COLOR" || type === "MODEL") && !!item && !!fb?.desiredVariantId;
	const [decision, setDecision] = useState<ChangeRequestDecision>("APPLY");
	const [variantId, setVariantId] = useState<number | null>(fb?.desiredVariantId ?? null);
	const [note, setNote] = useState("");
	const [notify, setNotify] = useState(true);
	const [touched, setTouched] = useState(false);

	// «رنگ دیگه»: the operator may pick another colour of the same product (`variantId`), e.g. the asked one ran out
	const colors = useQuery({
		queryKey: ["orders", "storeProduct", item?.productId],
		queryFn: () => withMappedError(() => OrdersEndpoints.getStoreProduct(item?.productId ?? 0)),
		enabled: type === "COLOR" && !!item,
		meta: { showNotificationOnRefetch: true },
	});

	const resolve = useMutation({
		mutationFn: () =>
			withMappedError(() =>
				OrdersEndpoints.resolveChangeRequest(order.code, {
					decision,
					variantId: decision === "APPLY" && swaps && variantId !== fb?.desiredVariantId ? variantId : null,
					note: note.trim() || null,
					notifyCustomer: notify,
				}),
			),
		meta: { showNotification: true },
		onSuccess: (res) => {
			const due = res.totals.balanceDue ?? 0;
			toast(decision === "APPLY" ? (due ? `اجرا شد — مشتری باید ${formatToman(due)} بپردازد` : "درخواست تغییر اجرا شد") : "درخواست تغییر رد شد", { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			onClose();
		},
		onError: (e) => {
			if (isStaleOrderError(e)) {
				queryClient.invalidateQueries({ queryKey: ["orders", "detail", order.code] });
				onClose();
			}
		},
	});

	const noteNeeded = decision === "REJECT" || type === "OTHER";
	const local = { note: noteNeeded && !note.trim() ? (decision === "REJECT" ? "دلیل رد را برای مشتری بنویس." : "بنویس چه کاری انجام دادی.") : null };
	const errors = fieldErrorsOf(resolve.error);
	const submit = () => {
		setTouched(true);
		if (!local.note) resolve.mutate();
	};

	const colorsMissing = isStoreProductMissingError(colors.error);
	const colorsError = colorsMissing ? null : toErrorView(ERROR_BEHAVIOUR, colors.error, "دریافت رنگ‌های محصول با خطا مواجه شد.");
	const chosen = colors.data?.variants.find((v) => v.id === variantId);
	const diff = item && chosen ? (chosen.price.price - item.unitPrice) * item.quantity : null;

	if (!fb) return null;
	return (
		<>
			<ModalHead icon="swap" title="رسیدگی به درخواست تغییر" subtitle={`${order.code} — ${labelOf(CHANGE_TYPE, type)}`} />
			<div className="m-body">
				<div className="cr-ask">
					{item && (
						<b>
							{item.name} ({item.color.name}) × {toPersianDigits(item.quantity)}
						</b>
					)}
					{swaps && item && fb.desiredVariantId && (
						<span className="swap">
							<Icon name="arrow" />
							<DesiredVariant item={item} variantId={fb.desiredVariantId} changeType={type} />
						</span>
					)}
					{fb.note && <span>«{fb.note}»</span>}
				</div>

				<div className="seg cr-seg" role="tablist" aria-label="تصمیم">
					<button type="button" role="tab" aria-selected={decision === "APPLY"} className={classNames({ on: decision === "APPLY" })} onClick={() => setDecision("APPLY")}>
						اجرا
					</button>
					<button type="button" role="tab" aria-selected={decision === "REJECT"} className={classNames({ on: decision === "REJECT" })} onClick={() => setDecision("REJECT")}>
						رد — همان کالا ارسال شود
					</button>
				</div>
				<p className={classNames("note", { danger: decision === "APPLY" && type === "CANCEL_ITEM" })}>
					{decision === "APPLY" ? APPLY_EFFECT[type] : "همان کالای قبلی ارسال می‌شود؛ دلیل در صفحه‌ی سفارش مشتری دیده می‌شود."} بعد از ثبت، سفارش برای عکاسی دوباره به «در حال آماده‌سازی» برمی‌گردد.
				</p>

				{decision === "APPLY" && type === "COLOR" && item && (
					<>
						{colors.isLoading ? (
							<p className="muted">در حال خواندن رنگ‌های محصول…</p>
						) : colorsError ? (
							<ErrorComponent2
								retryable={colorsError.retryable}
								ticketAble={colorsError.ticketAble}
								errorText={colorsError.errorText}
								executeFunction={() => colors.refetch()}
								variant="text"
								height={40}
								loading={colors.isFetching}
							/>
						) : colors.data ? (
							<Select
								label="رنگ تازه"
								labelNote="پیش‌فرض: همانی که مشتری خواسته"
								value={variantId ? String(variantId) : ""}
								onChange={(e) => setVariantId(Number(e.target.value))}
								options={colors.data.variants
									.filter((v) => v.id !== item.variantId)
									.map((v) => ({
										value: String(v.id),
										label: `${v.color.name}${v.id === fb.desiredVariantId ? " (درخواست مشتری)" : ""} — ${v.stock.label ?? labelOf(STOCK_STATUS, v.stock.status)}`,
										disabled: v.stock.status === "OUT_OF_STOCK",
									}))}
								error={errors.variantId}
							/>
						) : (
							<p className="muted">این محصول دیگر در فروشگاه نیست؛ همان رنگ درخواستی فرستاده می‌شود.</p>
						)}
						{diff !== null && diff !== 0 && (
							<p className={classNames("note", diff > 0 ? "cream" : "success")}>
								{diff > 0
									? `گران‌تر است: ${formatToman(diff)} روی سفارش «مانده‌ی پرداخت» می‌شود و تا مشتری نپردازد ارسال ممکن نیست.`
									: (order.totals.balanceDue ?? 0) > 0
										? `ارزان‌تر است: ${formatToman(-diff)} اول از مانده‌ی پرداخت (${formatToman(order.totals.balanceDue ?? 0)}) کم و باقیش استرداد می‌شود.`
										: `ارزان‌تر است: ${formatToman(-diff)} استرداد «در انتظار» ثبت می‌شود.`}
							</p>
						)}
					</>
				)}
				{decision === "APPLY" && type === "MODEL" && (
					<p className="muted" style={{ fontSize: 13 }}>
						اگر مدل تازه گران‌تر باشد اختلاف «مانده‌ی پرداخت» مشتری می‌شود و اگر ارزان‌تر، اول از مانده کم و باقیش استرداد می‌شود.
					</p>
				)}

				<Textarea
					label={decision === "REJECT" ? "دلیل رد (برای مشتری)" : "توضیح برای مشتری"}
					labelNote={noteNeeded ? "در صفحه‌ی سفارش مشتری دیده می‌شود" : "اختیاری؛ در صفحه‌ی سفارش مشتری دیده می‌شود"}
					maxLength={500}
					value={note}
					onChange={(e) => setNote(e.target.value)}
					error={(touched && local.note) || errors.note}
					placeholder={decision === "REJECT" ? "مثلاً: رنگ مشکی تموم شده بود؛ همون رنگ قبلی برات ارسال می‌شه." : undefined}
					footer={<small className="muted">{toPersianDigits(note.length)} / ۵۰۰</small>}
					style={{ minHeight: 80 }}
				/>
				<Switch label="پیامک «درخواستت بررسی شد» به مشتری (بدون متن توضیح)" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={resolve.isPending}>
					انصراف
				</Button>
				<Button variant={decision === "APPLY" && type === "CANCEL_ITEM" ? "danger" : "primary"} onClick={submit} isLoading={resolve.isPending}>
					{decision === "APPLY" ? "اجرای درخواست" : "رد درخواست"}
				</Button>
			</div>
		</>
	);
}
