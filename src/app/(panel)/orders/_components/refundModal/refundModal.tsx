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

type RefundModalProps = { order: AdminOrder; open: boolean; onClose: () => void };

/** `POST /admin/orders/{code}/refunds` (ADMIN) — full or partial, with a reason and method; optionally for a return. */
export default function RefundModal({ order, open, onClose }: RefundModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={520}>
			<RefundForm order={order} onClose={onClose} />
		</Modal>
	);
}

function RefundForm({ order, onClose }: Omit<RefundModalProps, "open">) {
	const queryClient = useQueryClient();
	const left = order.totals.payable - order.totals.refunded;
	const [amount, setAmount] = useState<number | null>(left);
	const [reason, setReason] = useState("");
	const [method, setMethod] = useState<RefundMethod>("ORIGINAL_PAYMENT");
	const [returnId, setReturnId] = useState("");
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
				{!!order.returns.length && (
					<Select
						label="برای مرجوعی"
						labelNote="اختیاری"
						placeholder="— بدون مرجوعی —"
						value={returnId}
						onChange={(e) => setReturnId(e.target.value)}
						options={order.returns.map((r) => ({ value: String(r.id), label: r.code }))}
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
