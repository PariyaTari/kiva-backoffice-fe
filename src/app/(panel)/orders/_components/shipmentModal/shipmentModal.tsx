"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import JalaliDateTimeInput from "@/app/_components/panel/jalaliDateTimeInput/jalaliDateTimeInput";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import Switch from "@/app/_components/ui/switch/switch";
import { toast } from "@/store/notification.store";
import { AdminOrder } from "@/types/order.type";
import { convertPersianToEnglishString, toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { formatDateTime } from "@/utils/format";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";
import { isGroupNotReadyError, isStaleOrderError } from "../../_utils/apiError";

type ShipmentModalProps = { order: AdminOrder; open: boolean; onClose: () => void };

/** `[0-9A-Za-z-]`, 6 to 40 — the server keeps it in capitals. */
const TRACKING_CODE = /^[0-9A-Za-z-]{6,40}$/;
/** `shippedAt` may go back at most this far (and never before the photo was sent). */
const MAX_BACKDATE_MS = 7 * 864e5;

/** Why the typed hand-over time is not acceptable (`SHIPPED_AT_INVALID`), or `null`. */
function shippedAtProblem(at: string | null, photoSentAt: string | null) {
	if (!at) return null;
	const t = Date.parse(at);
	if (t > Date.now()) return "زمان ارسال نمی‌تواند در آینده باشد.";
	if (t < Date.now() - MAX_BACKDATE_MS) return "حداکثر ۷ روز پیش.";
	if (photoSentAt && t < Date.parse(photoSentAt)) return `قبل از ارسال عکس (${formatDateTime(photoSentAt)}) نمی‌شود.`;
	return null;
}

/**
 * `PUT /admin/orders/{code}/shipment` — handed to the carrier: tracking code, time, «کدهای رهگیری روزانه» → `SHIPPED` + SMS.
 * On a `SHIPPED` order the same request corrects the code / time / daily-list flag (the whole group's), with no SMS.
 */
export default function ShipmentModal({ order, open, onClose }: ShipmentModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={520}>
			<ShipmentForm order={order} onClose={onClose} />
		</Modal>
	);
}

function ShipmentForm({ order, onClose }: Omit<ShipmentModalProps, "open">) {
	const queryClient = useQueryClient();
	// the carrier is the order's own shipping method (anything else is `400 CARRIER_MISMATCH`)
	const carrier = order.shippingMethod.code;
	const correcting = order.status === "SHIPPED";
	const [tracking, setTracking] = useState(correcting ? (order.shipment.trackingCode ?? "") : "");
	const [shippedAt, setShippedAt] = useState<string | null>(correcting ? order.shipment.shippedAt : null);
	const [daily, setDaily] = useState(true);
	const [touched, setTouched] = useState(false);
	const group = order.shipmentGroup && order.shipmentGroup.orderCodes.length > 1 ? order.shipmentGroup : null;

	const code = convertPersianToEnglishString(tracking).trim().toUpperCase();
	const local = {
		trackingCode: !TRACKING_CODE.test(code) ? "کد رهگیری ۶ تا ۴۰ حرف و رقم لاتین (و خط تیره)." : null,
		shippedAt: shippedAtProblem(shippedAt, order.preShipmentMediaDetail.sentAt),
	};

	const ship = useMutation({
		mutationFn: () => withMappedError(() => OrdersEndpoints.setShipment(order.code, { carrier, trackingCode: code, shippedAt, showInDailyList: daily })),
		meta: { showNotification: true },
		onSuccess: () => {
			toast(
				correcting
					? "اطلاعات ارسال اصلاح شد (بدون پیامک)"
					: group
						? `ارسال برای ${toPersianDigits(group.orderCodes.length)} سفارش گروه ثبت شد`
						: "ارسال ثبت شد و پیامک رفت",
				{ icon: "truck" },
			);
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

	const errors = fieldErrorsOf(ship.error);
	// another order of the group still waits (photo not answered, balance due, open change request)
	const notReady = isGroupNotReadyError(ship.error) && Array.isArray(ship.error?.meta?.orderCodes) ? (ship.error.meta.orderCodes as string[]) : null;
	const shippedAtError = (touched && local.shippedAt) || errors.shippedAt || null;
	const submit = () => {
		setTouched(true);
		if (!Object.values(local).some(Boolean)) ship.mutate();
	};

	return (
		<>
			<ModalHead icon="truck" title={correcting ? "اصلاح ارسال" : "ثبت ارسال"} subtitle={`${order.code} — ${order.shippingMethod.name}، تحویل به حامل و کد رهگیری`} />
			<div className="m-body">
				{correcting ? (
					<p className="note">فقط کد رهگیری، زمان ارسال و نمایش در «کدهای رهگیری روزانه» عوض می‌شود{group ? " (برای همه‌ی سفارش‌های ارسال‌شده‌ی گروه)" : ""}؛ پیامکی نمی‌رود.</p>
				) : (
					group && (
						<p className="note cream">
							این سفارش در گروه رزرو <b className="ltr">{group.code}</b> است؛ همه‌ی {toPersianDigits(group.orderCodes.length)} سفارش لغونشده‌ی گروه با همین کد یک‌جا ارسال
							می‌شوند و همه باید آماده باشند (عکس تأییدشده، بدون مانده و درخواست تغییر باز).
						</p>
					)
				)}
				{notReady && (
					<p className="note danger">
						این سفارش‌های گروه هنوز آماده نیستند:{" "}
						{notReady.map((c, i) => (
							<span key={c}>
								{i > 0 && "، "}
								<Link href={`/orders/${encodeURIComponent(c)}`} className="ltr" onClick={onClose}>
									{c}
								</Link>
							</span>
						))}
					</p>
				)}
				<Input
					label="کد رهگیری"
					direction="ltr"
					autoFocus
					value={tracking}
					onChange={(e) => setTracking(e.target.value)}
					error={(touched && local.trackingCode) || errors.trackingCode}
					placeholder={carrier === "TIPAX" ? "TPX4821760" : "۲۴ رقم پست"}
				/>
				<div className={`field${shippedAtError ? " error" : ""}`}>
					<label>زمان تحویل به حامل</label>
					<JalaliDateTimeInput value={shippedAt} onChange={setShippedAt} ariaLabel="زمان ارسال" />
					{shippedAtError ? <span className="err">{shippedAtError}</span> : <span className="help">خالی = همین الان؛ حداکثر ۷ روز پیش</span>}
				</div>
				<Switch label="نمایش (ماسک‌شده) در «کدهای رهگیری روزانه»" checked={daily} onChange={(e) => setDaily(e.target.checked)} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={ship.isPending}>
					انصراف
				</Button>
				<Button onClick={submit} isLoading={ship.isPending}>
					{correcting ? "ذخیره‌ی اصلاح" : "ثبت ارسال و پیامک"}
				</Button>
			</div>
		</>
	);
}
