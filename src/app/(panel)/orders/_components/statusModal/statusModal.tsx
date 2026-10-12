"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Button from "@/app/_components/ui/button/button";
import Modal from "@/app/_components/ui/modal/modal";
import Switch from "@/app/_components/ui/switch/switch";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { AdminOrder, OrderStatus } from "@/types/order.type";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { ORDER_STATUS, labelOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";
import { isStaleOrderError } from "../../_utils/apiError";

/** What each manual move means for the shopper — shown under the choice. */
const EFFECT: Partial<Record<OrderStatus, string>> = {
	CANCELLED: "سفارش لغو می‌شود؛ اگر پرداخت شده، مبلغ برای برگشت به کارت ثبت می‌شود.",
	DELIVERED: "پیامک «تحویل شد» با درخواست ثبت نظر برای مشتری می‌رود (اگر روشن باشد).",
	PROCESSING: "برای عکاسی دوباره به صف آماده‌سازی برمی‌گردد.",
};

type StatusModalProps = { order: AdminOrder; open: boolean; onClose: () => void };

/**
 * `POST /admin/orders/{code}/status` — only to one of the server's `allowedTransitions`, with a note and the SMS
 * switch. The form lives inside the modal box, so every opening starts fresh (the box unmounts when closed).
 */
export default function StatusModal({ order, open, onClose }: StatusModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={500}>
			<StatusForm order={order} onClose={onClose} />
		</Modal>
	);
}

function StatusForm({ order, onClose }: Omit<StatusModalProps, "open">) {
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<OrderStatus | "">("");
	const [note, setNote] = useState("");
	const [notify, setNotify] = useState(true);

	const change = useMutation({
		mutationFn: () => withMappedError(() => OrdersEndpoints.changeStatus(order.code, { status: status as OrderStatus, note: note.trim() || null, notifyCustomer: notify })),
		meta: { showNotification: true },
		onSuccess: (res) => {
			toast(`وضعیت سفارش «${res.statusLabel}» شد`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			onClose();
		},
		// someone moved the order meanwhile — the toast says why; the page re-reads its real state
		onError: (e) => {
			if (isStaleOrderError(e)) {
				queryClient.invalidateQueries({ queryKey: ["orders", "detail", order.code] });
				onClose();
			}
		},
	});

	const errors = fieldErrorsOf(change.error);

	return (
		<>
			<ModalHead icon="refresh" title="تغییر وضعیت سفارش" subtitle={`${order.code} — الان «${order.statusLabel}»`} />
			<div className="m-body">
				<div className="radios" role="radiogroup" aria-label="وضعیت جدید">
					{order.allowedTransitions.map((s) => (
						<label key={s} className="opt-card">
							<input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} />
							<span className="radio" />
							<span className="t">{labelOf(ORDER_STATUS, s)}</span>
						</label>
					))}
				</div>
				{status && EFFECT[status] && <p className={`note${status === "CANCELLED" ? " danger" : ""}`}>{EFFECT[status]}</p>}
				<Textarea
					label="یادداشت"
					labelNote="اختیاری، در تاریخچه می‌ماند"
					maxLength={500}
					value={note}
					onChange={(e) => setNote(e.target.value)}
					error={errors.note}
					footer={<small className="muted">{toPersianDigits(note.length)} / ۵۰۰</small>}
					style={{ minHeight: 80 }}
				/>
				<Switch label="پیامک به مشتری" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={change.isPending}>
					انصراف
				</Button>
				<Button variant={status === "CANCELLED" ? "danger" : "primary"} onClick={() => change.mutate()} isLoading={change.isPending} disabled={!status}>
					ثبت وضعیت
				</Button>
			</div>
		</>
	);
}
