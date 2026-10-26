"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import Button from "@/app/_components/ui/button/button";
import Modal from "@/app/_components/ui/modal/modal";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { InventoryReason } from "@/types/catalog.type";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { INVENTORY_REASON, labelOf, optionsOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ProductsEndpoints } from "../../_api/productsEndpoints";

/** The colour whose stock changes — enough to name it and show its counts. */
export type StockTarget = { variantId: number; sku: string; label: string; stockOnHand: number; stockReserved: number; stockAlertSubscribers: number };

type StockModalProps = { target: StockTarget | null; onClose: () => void };

/** One adjustment moves at most this many units either way (`STOCK_DELTA_INVALID`). */
const MAX_DELTA = 10_000;

/**
 * `POST /admin/inventory/adjustments` — stock only changes with a reason and is logged. Each reason has its direction
 * (in: ورود کالا، مرجوعی · out: آسیب‌دیده · either: شمارش، اصلاح). «شمارش انبار» takes the counted number and sends the
 * difference. Stock never drops below what is reserved. A colour back from zero queues the «موجود شد» SMS.
 */
export default function StockModal({ target, onClose }: StockModalProps) {
	return (
		<Modal open={!!target} onClose={onClose} width={500}>
			{target && <StockForm target={target} onClose={onClose} />}
		</Modal>
	);
}

function StockForm({ target, onClose }: { target: StockTarget; onClose: () => void }) {
	const queryClient = useQueryClient();
	const [reason, setReason] = useState<InventoryReason>("RESTOCK");
	const [amount, setAmount] = useState<number | null>(null);
	const [note, setNote] = useState("");
	const counting = reason === "STOCKTAKE";
	const sign = reason === "DAMAGED" ? -1 : 1;
	// stocktake: the counted number → the difference; the others: an amount in (or out for «آسیب‌دیده»)
	const delta = amount == null ? 0 : counting ? amount - target.stockOnHand : reason === "MANUAL_CORRECTION" ? amount : sign * Math.abs(amount);
	const after = target.stockOnHand + delta;

	const adjust = useMutation({
		mutationFn: () => withMappedError(() => ProductsEndpoints.adjustStock(target.variantId, delta, reason, note.trim() || null)),
		meta: { showNotification: true },
		onSuccess: (a) => {
			toast(`موجودی ${a.sku} شد ${toPersianDigits(a.stockAfter)}`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["products"] });
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
			// a colour back in stock leaves the «موجود شد خبرم کن» queue
			queryClient.invalidateQueries({ queryKey: ["stockAlerts"] });
			onClose();
		},
	});

	const errors = fieldErrorsOf(adjust.error);
	const sellable = target.stockOnHand - target.stockReserved;
	const invalid = !delta
		? counting && amount != null
			? "با موجودی فعلی یکی است؛ تغییری لازم نیست."
			: "مقدار را وارد کن (تغییر نباید صفر باشد)."
		: Math.abs(delta) > MAX_DELTA
			? "هر بار حداکثر ۱۰٬۰۰۰ عدد."
			: after < target.stockReserved
				? `${toPersianDigits(target.stockReserved)} عدد رزرو سفارش‌هاست؛ حداکثر ${toPersianDigits(Math.max(0, sellable))} عدد می‌شود کم کرد.`
				: null;

	return (
		<>
			<ModalHead icon="pkg" title="تغییر موجودی" subtitle={`${target.label} · ${target.sku}`} />
			<div className="m-body">
				<dl className="kv">
					<dt>موجودی فیزیکی</dt>
					<dd>{toPersianDigits(target.stockOnHand)}</dd>
					<dt>رزرو شده</dt>
					<dd>{toPersianDigits(target.stockReserved)}</dd>
				</dl>
				<div className="radios" role="radiogroup" aria-label="دلیل">
					{optionsOf(INVENTORY_REASON).map((o) => (
						<label key={o.value} className="opt-card">
							<input
								type="radio"
								name="reason"
								checked={reason === o.value}
								onChange={() => {
									setReason(o.value);
									setAmount(null);
								}}
							/>
							<span className="radio" />
							<span className="t">{o.label}</span>
						</label>
					))}
				</div>
				<NumberInput
					label={counting ? "تعداد شمرده‌شده" : reason === "MANUAL_CORRECTION" ? "تغییر (+ یا −)" : reason === "DAMAGED" ? "تعداد آسیب‌دیده" : "تعداد"}
					signed={reason === "MANUAL_CORRECTION"}
					value={amount}
					onChange={setAmount}
					error={(amount != null && invalid) || errors.delta}
					hint={amount != null && !invalid ? `${delta > 0 ? "+" : "−"}${toPersianDigits(Math.abs(delta))} ← موجودی فیزیکی ${toPersianDigits(after)}` : undefined}
				/>
				{target.stockAlertSubscribers > 0 && target.stockOnHand - target.stockReserved <= 0 && delta > 0 && (
					<p className="note success">
						{toPersianDigits(target.stockAlertSubscribers)} نفر منتظر «موجود شد» این رنگ‌اند؛ با ثبت این ورود تا ۵ دقیقه بعد برایشان پیامک می‌رود (نه بین ۲۲ تا ۸ صبح).
					</p>
				)}
				<Textarea label="یادداشت" labelNote="اختیاری" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} error={errors.note} style={{ minHeight: 70 }} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={adjust.isPending}>
					انصراف
				</Button>
				<Button onClick={() => adjust.mutate()} isLoading={adjust.isPending} disabled={!!invalid}>
					ثبت {labelOf(INVENTORY_REASON, reason)}
				</Button>
			</div>
		</>
	);
}
