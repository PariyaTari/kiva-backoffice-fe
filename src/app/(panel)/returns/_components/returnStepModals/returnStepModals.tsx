"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ConfirmModal from "@/app/_components/panel/confirmModal/confirmModal";
import JalaliDateTimeInput from "@/app/_components/panel/jalaliDateTimeInput/jalaliDateTimeInput";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import Select from "@/app/_components/ui/select/select";
import Switch from "@/app/_components/ui/switch/switch";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { AdminReturnRequest, ReturnReceipt } from "@/types/order.type";
import { ShippingMethodCode } from "@/types/common.type";
import { ResultError } from "@/types/result";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { optionsOf, SHIPPING_METHOD } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ReturnsEndpoints } from "../../_api/returnsEndpoints";
import { isAlreadyDecidedError } from "../../_utils/apiError";

type StepModalProps = { item: AdminReturnRequest | null; onClose: () => void };

/** After any step: the list, the return's order (its status follows the return) and the side counter. */
function useStepDone(onClose: () => void) {
	const queryClient = useQueryClient();
	return {
		done: (r: AdminReturnRequest, message: string) => {
			toast(message, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["returns"] });
			queryClient.invalidateQueries({ queryKey: ["orders", "detail", r.orderCode] });
			onClose();
		},
		// someone moved the return meanwhile — the toast says why; the list re-reads its real state
		stale: (e: ResultError) => {
			if (isAlreadyDecidedError(e)) {
				queryClient.invalidateQueries({ queryKey: ["returns"] });
				onClose();
			}
		},
	};
}

/** `PUT /admin/returns/{id}/pickup` — Kiva sends a courier for the parcel; again = new time / tracking code. */
export function PickupModal({ item, onClose }: StepModalProps) {
	return (
		<Modal open={!!item} onClose={onClose} width={500}>
			{item && <PickupForm item={item} onClose={onClose} />}
		</Modal>
	);
}

function PickupForm({ item, onClose }: { item: AdminReturnRequest; onClose: () => void }) {
	const { done, stale } = useStepDone(onClose);
	const [carrier, setCarrier] = useState<ShippingMethodCode>(item.pickup?.carrier ?? "TIPAX");
	const [scheduledFor, setScheduledFor] = useState<string | null>(item.pickup?.scheduledFor ?? null);
	const [trackingCode, setTrackingCode] = useState(item.pickup?.trackingCode ?? "");
	const [note, setNote] = useState(item.pickup?.note ?? "");
	const [notify, setNotify] = useState(true);

	const schedule = useMutation({
		mutationFn: () =>
			withMappedError(() =>
				ReturnsEndpoints.schedulePickup(item.id, { carrier, scheduledFor, trackingCode: trackingCode.trim() || null, note: note.trim() || null, notifyCustomer: notify }),
			),
		meta: { showNotification: true },
		onSuccess: (r) => done(r, `جمع‌آوری ${r.code} ثبت شد`),
		onError: stale,
	});
	const errors = fieldErrorsOf(schedule.error);

	return (
		<>
			<ModalHead icon="truck" title={item.pickup ? "تغییر جمع‌آوری مرسوله" : "زمان‌بندی جمع‌آوری مرسوله"} subtitle={`${item.code} — سفارش ${item.orderCode}`} />
			<div className="m-body">
				<Select label="حامل" value={carrier} onChange={(e) => setCarrier(e.target.value as ShippingMethodCode)} options={optionsOf(SHIPPING_METHOD)} error={errors.carrier} />
				<div className="field">
					<label>زمان مراجعه‌ی مأمور</label>
					<JalaliDateTimeInput value={scheduledFor} onChange={setScheduledFor} defaultTime="10:00" ariaLabel="زمان مراجعه" />
					{errors.scheduledFor && <span className="err" style={{ display: "block" }}>{errors.scheduledFor}</span>}
				</div>
				<Input label="کد رهگیری" labelNote="اختیاری" direction="ltr" maxLength={40} value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} error={errors.trackingCode} />
				<Textarea label="یادداشت برای مشتری" labelNote="اختیاری" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} error={errors.note} style={{ minHeight: 70 }} />
				<Switch label="پیامک به مشتری" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={schedule.isPending}>
					انصراف
				</Button>
				<Button onClick={() => schedule.mutate()} isLoading={schedule.isPending}>
					ثبت جمع‌آوری
				</Button>
			</div>
		</>
	);
}

/** Damage-type reasons — those items rarely go back on sale, so the restock count starts at 0. */
const DAMAGED = ["MANUFACTURING_DEFECT", "DAMAGED_IN_TRANSIT"];

/** `POST /admin/returns/{id}/receipt` — what reached the warehouse and what goes back on sale (logged as `RETURNED`). */
export function ReceiptModal({ item, onClose }: StepModalProps) {
	return (
		<Modal open={!!item} onClose={onClose} width={560}>
			{item && <ReceiptForm item={item} onClose={onClose} />}
		</Modal>
	);
}

function ReceiptForm({ item, onClose }: { item: AdminReturnRequest; onClose: () => void }) {
	const { done, stale } = useStepDone(onClose);
	const restockByDefault = !DAMAGED.includes(item.reason);
	const [rows, setRows] = useState<ReturnReceipt["items"]>(() =>
		item.items.map((i) => ({ orderItemId: i.orderItemId, receivedQuantity: i.quantity, restockQuantity: restockByDefault ? i.quantity : 0 })),
	);
	const [note, setNote] = useState("");
	const patch = (k: number, change: Partial<ReturnReceipt["items"][number]>) => setRows((list) => list.map((r, i) => (i === k ? { ...r, ...change } : r)));

	const local = rows.map((r) => (r.restockQuantity > r.receivedQuantity ? "برگشتی به فروش بیشتر از رسیده نمی‌شود." : null));
	const receive = useMutation({
		mutationFn: () => withMappedError(() => ReturnsEndpoints.receive(item.id, { items: rows, note: note.trim() || null })),
		meta: { showNotification: true },
		onSuccess: (r) => done(r, `${r.code} به انبار رسید`),
		onError: stale,
	});
	const errors = fieldErrorsOf(receive.error);
	const restocked = rows.reduce((n, r) => n + r.restockQuantity, 0);

	return (
		<>
			<ModalHead icon="box" title="رسیدن مرجوعی به انبار" subtitle={`${item.code} — سفارش ${item.orderCode}`} />
			<div className="m-body">
				{item.items.map((i, k) => (
					<div key={i.orderItemId} className="rcpt-row">
						<b>
							{i.name} ({i.color.name})<small> — درخواست {toPersianDigits(i.quantity)} عدد</small>
						</b>
						<div className="form-grid">
							<NumberInput
								label="رسید"
								value={rows[k].receivedQuantity}
								onChange={(n) => patch(k, { receivedQuantity: Math.min(i.quantity, Math.max(0, n ?? 0)) })}
								error={errors[`items[${k}].receivedQuantity`]}
							/>
							<NumberInput
								label="برگشت به فروش"
								labelNote="سالم"
								value={rows[k].restockQuantity}
								onChange={(n) => patch(k, { restockQuantity: Math.max(0, n ?? 0) })}
								error={local[k] || errors[`items[${k}].restockQuantity`]}
							/>
						</div>
					</div>
				))}
				<p className="note">
					{restocked
						? `${toPersianDigits(restocked)} عدد با دلیل «مرجوعی» به موجودی اضافه می‌شود (اگر آن رنگ ناموجود بوده، پیامک «موجود شد» هم می‌رود).`
						: "چیزی به موجودی برنمی‌گردد."}{" "}
					قدم بعد: استرداد (مدیر کل) یا بستن بدون استرداد.
				</p>
				<Textarea label="نتیجه‌ی بازبینی" labelNote="داخلی" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} error={errors.note} style={{ minHeight: 70 }} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={receive.isPending}>
					انصراف
				</Button>
				<Button onClick={() => receive.mutate()} isLoading={receive.isPending} disabled={local.some(Boolean)}>
					ثبت رسیدن
				</Button>
			</div>
		</>
	);
}

/** `POST /admin/returns/{id}/close` — ends a return without a refund; the reason goes to the shopper. */
export function CloseModal({ item, onClose }: StepModalProps) {
	// a new return = a fresh form
	return <CloseForm key={item?.id ?? "none"} item={item} onClose={onClose} />;
}

function CloseForm({ item, onClose }: StepModalProps) {
	const { done, stale } = useStepDone(onClose);
	const [reason, setReason] = useState("");
	const [notify, setNotify] = useState(true);
	const [touched, setTouched] = useState(false);
	const local = reason.trim().length < 3 ? "دلیل بستن را برای مشتری بنویس." : null;

	const close = useMutation({
		mutationFn: () => withMappedError(() => ReturnsEndpoints.close(item?.id ?? 0, { reason: reason.trim(), notifyCustomer: notify })),
		meta: { showNotification: true },
		onSuccess: (r) => done(r, `${r.code} بدون استرداد بسته شد`),
		onError: stale,
	});
	const errors = fieldErrorsOf(close.error);

	return (
		<ConfirmModal
			open={!!item}
			onClose={onClose}
			icon="ban"
			tone="danger"
			title={`بستن ${item?.code ?? "مرجوعی"} بدون استرداد`}
			text={
				item?.status === "RECEIVED"
					? "بازبینی رد شد و کالا به مشتری برمی‌گردد. سفارش به «تحویل شده» برمی‌گردد."
					: "مرسوله به انبار نرسید. سفارش به «تحویل شده» برمی‌گردد."
			}
			confirmLabel="بستن مرجوعی"
			loading={close.isPending}
			onConfirm={() => {
				setTouched(true);
				if (!local) close.mutate();
			}}
		>
			<Textarea
				label="دلیل (برای مشتری)"
				maxLength={500}
				value={reason}
				onChange={(e) => setReason(e.target.value)}
				error={(touched && local) || errors.reason}
				placeholder="مثلاً: مرسوله تا ۱۴ روز بعد از تأیید به انبار نرسید."
				style={{ minHeight: 80 }}
			/>
			<Switch label="پیامک به مشتری" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
		</ConfirmModal>
	);
}
