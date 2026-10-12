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

type RefundModalProps = {
	order: AdminOrder;
	open: boolean;
	onClose: () => void;
	/** Opened for one return (the return's «ثبت استرداد») — chosen, and the amount = its lines. */
	returnId?: number | null;
};

/** `POST /admin/orders/{code}/refunds` (ADMIN) — full or partial, with a reason and method; optionally for a return. */
export default function RefundModal({ order, open, onClose, returnId = null }: RefundModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={520}>
			<RefundForm order={order} onClose={onClose} returnId={returnId} />
		</Modal>
	);
}

/** A return's lines at the price paid — the default refund for it. */
const returnValue = (order: AdminOrder, returnId: number | null) => {
	const r = order.returns.find((x) => x.id === returnId);
	return r ? r.items.reduce((n, ri) => n + (order.items.find((i) => i.id === ri.orderItemId)?.unitPrice ?? 0) * ri.quantity, 0) : null;
};

function RefundForm({ order, onClose, returnId: forReturn = null }: Omit<RefundModalProps, "open">) {
	const queryClient = useQueryClient();
	// 1.5.0: `refunded` counts only what went back; the cap is paid minus every refund that has not failed
	const left = order.totals.payable - order.refunds.filter((r) => r.status !== "FAILED").reduce((n, r) => n + r.amount, 0);
	// only a return that reached the warehouse takes a refund (`RECEIVED`, its next step «REFUNDED»)
	const refundableReturns = order.returns.filter((r) => r.allowedTransitions.includes("REFUNDED"));
	const preset = refundableReturns.find((r) => r.id === forReturn) ?? null;
	const [amount, setAmount] = useState<number | null>(() => Math.min(left, returnValue(order, preset?.id ?? null) ?? left));
	const [reason, setReason] = useState(preset ? `مرجوعی ${preset.code}` : "");
	const [method, setMethod] = useState<RefundMethod>(preset?.refundMethod ?? "ORIGINAL_PAYMENT");
	const [returnId, setReturnId] = useState(preset ? String(preset.id) : "");
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
				<MoneyInput label="مبلغ" value={amount} onChange={setAmount} error={(touched && local.amount) || errors.amount} hint="برای استرداد جزئی، مبلغ را کم کن." />
				<Select label="روش برگشت پول" value={method} onChange={(e) => setMethod(e.target.value as RefundMethod)} options={optionsOf(REFUND_METHOD)} error={errors.method} />
				{!!refundableReturns.length && (
					<Select
						label="برای مرجوعی"
						labelNote="اختیاری"
						placeholder="— بدون مرجوعی —"
						value={returnId}
						onChange={(e) => setReturnId(e.target.value)}
						options={refundableReturns.map((r) => ({ value: String(r.id), label: `${r.code}${r.iban ? ` — شبا ${r.iban}` : ""}` }))}
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
