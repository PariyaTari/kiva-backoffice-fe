"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import MoneyInput from "@/app/_components/panel/moneyInput/moneyInput";
import Button from "@/app/_components/ui/button/button";
import Modal from "@/app/_components/ui/modal/modal";
import Select from "@/app/_components/ui/select/select";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { AdminOrder, RefundMethod } from "@/types/order.type";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { formatToman } from "@/utils/format";
import { optionsOf, REFUND_METHOD } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";
import { isStaleReturnRefundError } from "../../_utils/apiError";

type RefundModalProps = {
	order: AdminOrder;
	open: boolean;
	onClose: () => void;
	/** Opened for one return (the return's «ثبت استرداد») — chosen, and the amount = its lines. */
	returnId?: number | null;
};

/**
 * `POST /admin/orders/{code}/refunds` (ADMIN) — full or partial, with a reason and method; optionally for a return.
 * Only recorded (`PENDING`, expected within 72h): a colleague transfers the money and tracks it here.
 */
export default function RefundModal({ order, open, onClose, returnId = null }: RefundModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={520}>
			<RefundForm order={order} onClose={onClose} returnId={returnId} />
		</Modal>
	);
}

/**
 * The default refund for a return: the server's `suggestedRefund` (1.21.0 — the paid share of what came back, code
 * discount taken off, no shipping), else its lines at the price paid.
 */
const returnValue = (order: AdminOrder, returnId: number | null) => {
	const r = order.returns.find((x) => x.id === returnId);
	if (!r) return null;
	return r.suggestedRefund ?? r.items.reduce((n, ri) => n + (order.items.find((i) => i.id === ri.orderItemId)?.unitPrice ?? 0) * ri.quantity, 0);
};

function RefundForm({ order, onClose, returnId: forReturn = null }: Omit<RefundModalProps, "open">) {
	const queryClient = useQueryClient();
	// `refunded` counts only what went back; the cap (`REFUND_EXCEEDS_PAID`) is paid minus every refund that has not failed
	const left = order.totals.payable - order.refunds.filter((r) => r.status !== "FAILED").reduce((n, r) => n + r.amount, 0);
	// only a return that reached the warehouse takes a refund (`RECEIVED`, its next step «REFUNDED»)
	const refundableReturns = order.returns.filter((r) => r.allowedTransitions.includes("REFUNDED"));
	const preset = refundableReturns.find((r) => r.id === forReturn) ?? null;
	const [amount, setAmount] = useState<number | null>(() => Math.min(left, returnValue(order, preset?.id ?? null) ?? left));
	const [reason, setReason] = useState(preset ? `مرجوعی ${preset.code}` : "");
	const [method, setMethod] = useState<RefundMethod>(preset?.refundMethod ?? "ORIGINAL_PAYMENT");
	const [returnId, setReturnId] = useState(preset ? String(preset.id) : "");
	const chosenReturn = refundableReturns.find((r) => String(r.id) === returnId) ?? null;
	// picking another return brings its suggestion and the shopper's preferred method along
	const pickReturn = (id: string) => {
		setReturnId(id);
		const r = refundableReturns.find((x) => String(x.id) === id);
		if (!r) return;
		setAmount(Math.min(left, returnValue(order, r.id) ?? left));
		setMethod(r.refundMethod);
		if (!reason.trim() || /^مرجوعی RT-/.test(reason)) setReason(`مرجوعی ${r.code}`);
	};
	const [touched, setTouched] = useState(false);

	const local = {
		amount: !amount ? "مبلغ را وارد کن." : amount > left ? `حداکثر ${formatToman(left)} قابل برگشت است.` : null,
		reason: !reason.trim() ? "دلیل استرداد را بنویس." : null,
	};

	const refund = useMutation({
		mutationFn: () =>
			withMappedError(() => OrdersEndpoints.createRefund(order.code, { amount: amount ?? 0, reason: reason.trim(), method, returnId: returnId ? Number(returnId) : null })),
		meta: { showNotification: true },
		onSuccess: (r) => {
			toast(`استرداد ${formatToman(r.amount)} ثبت شد`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["returns"] });
			onClose();
		},
		// the toast says why; the order and the returns re-read what really happened
		onError: (e) => {
			if (!isStaleReturnRefundError(e)) return;
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["returns"] });
			onClose();
		},
	});

	const errors = fieldErrorsOf(refund.error);
	const submit = () => {
		setTouched(true);
		if (!local.amount && !local.reason) refund.mutate();
	};

	return (
		<>
			<ModalHead icon="wallet" title="استرداد وجه" subtitle={`${order.code} — پرداختی ${formatToman(order.totals.payable)}، قابل برگشت ${formatToman(left)}`} />
			<div className="m-body">
				<p className="note">استرداد دستی است: فقط ثبت می‌شود و پول را همکاران با کارت‌به‌کارت یا انتقال شبا برمی‌گردانند، بعد «پیگیری» را با شماره‌ی پیگیری بانک کامل می‌کنند.</p>
				<MoneyInput
					label="مبلغ"
					value={amount}
					onChange={setAmount}
					error={(touched && local.amount) || errors.amount}
					hint={
						chosenReturn?.suggestedRefund != null
							? `پیشنهاد سرور برای ${chosenReturn.code}: ${formatToman(chosenReturn.suggestedRefund)} (سهم پرداخت‌شده‌ی اقلام برگشتی، بدون هزینه‌ی ارسال).`
							: "برای استرداد جزئی، مبلغ را کم کن."
					}
				/>
				<Select label="روش برگشت پول" value={method} onChange={(e) => setMethod(e.target.value as RefundMethod)} options={optionsOf(REFUND_METHOD)} error={errors.method} />
				{method === "BANK_TRANSFER" && <p className="note">شماره شبا در سیستم نیست؛ برای انتقال، همکاران تلفنی از مشتری می‌گیرند.</p>}
				{!!refundableReturns.length && (
					<Select
						label="برای مرجوعی"
						labelNote="اختیاری"
						placeholder="— بدون مرجوعی —"
						value={returnId}
						onChange={(e) => pickReturn(e.target.value)}
						options={refundableReturns.map((r) => ({ value: String(r.id), label: r.code }))}
						error={errors.returnId}
					/>
				)}
				<Textarea
					label="دلیل"
					maxLength={300}
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					error={(touched && local.reason) || errors.reason}
					placeholder="مثلاً: مابه‌التفاوت تعویض رنگ"
					style={{ minHeight: 80 }}
				/>
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={refund.isPending}>
					انصراف
				</Button>
				<Button variant="danger" onClick={submit} isLoading={refund.isPending}>
					ثبت استرداد
				</Button>
			</div>
		</>
	);
}
