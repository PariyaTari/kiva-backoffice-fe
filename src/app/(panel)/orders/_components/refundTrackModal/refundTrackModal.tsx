"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { Refund, RefundUpdatePayload } from "@/types/order.type";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { formatToman } from "@/utils/format";
import { labelOf, REFUND_METHOD, REFUND_STATUS } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";

type NextStatus = RefundUpdatePayload["status"];

/** The contract's refund steps: `COMPLETED` and `FAILED` are final — a failed one is followed by a new refund. */
const NEXT: Partial<Record<Refund["status"], NextStatus[]>> = { PENDING: ["PROCESSING", "COMPLETED", "FAILED"], PROCESSING: ["COMPLETED", "FAILED"] };
const EFFECT: Record<NextStatus, string> = {
	PROCESSING: "پرداخت به بانک سپرده شد و منتظر نتیجه است.",
	COMPLETED: "پول به مشتری رسید: به «برگشت داده‌شده»ی سفارش اضافه می‌شود، اگر برای مرجوعی است آن مرجوعی بسته می‌شود و پیامک می‌رود.",
	FAILED: "انجام نشد (مثلاً شبا اشتباه بود). بسته می‌شود؛ برای برگشت پول یک استرداد تازه ثبت کن.",
};

/** Whether a refund can still move (the «پیگیری» button). */
export const isRefundOpen = (r: Refund) => !!NEXT[r.status];

type RefundTrackModalProps = { refund: Refund | null; orderCode: string; onClose: () => void };

/** `PATCH /admin/refunds/{id}` (ADMIN) — in progress, done with the bank's tracking number, or failed; the note reaches the shopper. */
export default function RefundTrackModal({ refund, orderCode, onClose }: RefundTrackModalProps) {
	return (
		<Modal open={!!refund} onClose={onClose} width={500}>
			{refund && <RefundTrackForm refund={refund} orderCode={orderCode} onClose={onClose} />}
		</Modal>
	);
}

function RefundTrackForm({ refund, orderCode, onClose }: { refund: Refund; orderCode: string; onClose: () => void }) {
	const queryClient = useQueryClient();
	const options = NEXT[refund.status] ?? [];
	const [status, setStatus] = useState<NextStatus>(options.includes("COMPLETED") ? "COMPLETED" : options[0]);
	const [referenceId, setReferenceId] = useState(refund.referenceId ?? "");
	const [note, setNote] = useState("");
	const [touched, setTouched] = useState(false);

	const needsReference = status === "COMPLETED" && refund.method !== "STORE_CREDIT";
	const local = { referenceId: needsReference && !referenceId.trim() ? "شماره‌ی پیگیری بانک را وارد کن." : null };

	const update = useMutation({
		mutationFn: () => withMappedError(() => OrdersEndpoints.updateRefund(refund.id, { status, referenceId: referenceId.trim() || null, note: note.trim() || null })),
		meta: { showNotification: true },
		onSuccess: (r) => {
			toast(`استرداد ${formatToman(r.amount)}: ${labelOf(REFUND_STATUS, r.status)}`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			// a return's refund that is done closes the return (`REFUNDED`)
			queryClient.invalidateQueries({ queryKey: ["returns"] });
			onClose();
		},
	});

	const errors = fieldErrorsOf(update.error);
	const submit = () => {
		setTouched(true);
		if (!local.referenceId) update.mutate();
	};

	return (
		<>
			<ModalHead icon="wallet" title="پیگیری استرداد" subtitle={`${orderCode} — ${formatToman(refund.amount)}، ${labelOf(REFUND_METHOD, refund.method)}، الان «${labelOf(REFUND_STATUS, refund.status)}»`} />
			<div className="m-body">
				<div className="radios" role="radiogroup" aria-label="وضعیت تازه">
					{options.map((s) => (
						<label key={s} className="opt-card">
							<input type="radio" name="refund-status" value={s} checked={status === s} onChange={() => setStatus(s)} />
							<span className="radio" />
							<span className="t">{labelOf(REFUND_STATUS, s)}</span>
						</label>
					))}
				</div>
				<p className={`note${status === "FAILED" ? " danger" : status === "COMPLETED" ? " success" : ""}`}>{EFFECT[status]}</p>
				{status !== "FAILED" && (
					<Input
						label="شماره‌ی پیگیری بانک / درگاه"
						labelNote={needsReference ? undefined : "اختیاری"}
						direction="ltr"
						maxLength={64}
						value={referenceId}
						onChange={(e) => setReferenceId(e.target.value)}
						error={(touched && local.referenceId) || errors.referenceId}
					/>
				)}
				<Textarea
					label="یادداشت برای مشتری"
					labelNote="اختیاری؛ در جزئیات سفارش مشتری دیده می‌شود"
					maxLength={300}
					value={note}
					onChange={(e) => setNote(e.target.value)}
					error={errors.note}
					placeholder={status === "FAILED" ? "مثلاً: شماره شبا اشتباه بود؛ با پشتیبانی تماس بگیر." : undefined}
					footer={<small className="muted">{toPersianDigits(note.length)} / ۳۰۰</small>}
					style={{ minHeight: 70 }}
				/>
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={update.isPending}>
					انصراف
				</Button>
				<Button variant={status === "FAILED" ? "danger" : "primary"} onClick={submit} isLoading={update.isPending}>
					ثبت
				</Button>
			</div>
		</>
	);
}
