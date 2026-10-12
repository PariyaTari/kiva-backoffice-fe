"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Button from "@/app/_components/ui/button/button";
import Modal from "@/app/_components/ui/modal/modal";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { AdminReturnRequest, ShippingPaidBy } from "@/types/order.type";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { formatDateTime } from "@/utils/format";
import { KIVA_FAULT_REASONS, labelOf, RETURN_REASON } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ReturnsEndpoints } from "../../_api/returnsEndpoints";
import { isAlreadyDecidedError } from "../../_utils/apiError";

const INSTRUCTIONS = {
	KIVA: "کیف رو با بسته‌بندی اصلی و همه‌ی متعلقاتش، با تیپاکس به انبار کیوا بفرست؛ نشانی و کد پس‌کرایه برات پیامک می‌شه و هزینه‌ش با کیواست. کد درخواست رو روی بسته بنویس.",
	CUSTOMER: "کیف رو با بسته‌بندی اصلی و همه‌ی متعلقاتش به انبار کیوا بفرست؛ هزینه‌ی ارسال برگشت با خودته. نشانی انبار برات پیامک می‌شه. کد درخواست رو روی بسته بنویس.",
};

type DecisionModalProps = { item: AdminReturnRequest | null; onClose: () => void };

/** `POST /admin/returns/{id}/decision` — approve (who pays the return shipping + the shopper's instructions) or reject. */
export default function DecisionModal({ item, onClose }: DecisionModalProps) {
	return (
		<Modal open={!!item} onClose={onClose} width={560}>
			{item && <DecisionForm item={item} onClose={onClose} />}
		</Modal>
	);
}

function DecisionForm({ item, onClose }: { item: AdminReturnRequest; onClose: () => void }) {
	const queryClient = useQueryClient();
	const kivaFault = KIVA_FAULT_REASONS.includes(item.reason);
	const [approve, setApprove] = useState(true);
	const [paidBy, setPaidBy] = useState<ShippingPaidBy>(kivaFault ? "KIVA" : "CUSTOMER");
	const [instructions, setInstructions] = useState(INSTRUCTIONS[kivaFault ? "KIVA" : "CUSTOMER"]);
	const [rejection, setRejection] = useState("");
	const [touched, setTouched] = useState(false);

	const decide = useMutation({
		mutationFn: () =>
			withMappedError(() =>
				ReturnsEndpoints.decide(item.id, approve ? { approve, shippingPaidBy: paidBy, instructions: instructions.trim() } : { approve, rejectionReason: rejection.trim() }),
			),
		meta: { showNotification: true },
		onSuccess: (r) => {
			toast(`${r.code} ${approve ? "تأیید" : "رد"} شد`, { icon: approve ? "check" : "ban" });
			queryClient.invalidateQueries({ queryKey: ["returns"] });
			queryClient.invalidateQueries({ queryKey: ["orders", "detail", r.orderCode] });
			onClose();
		},
		onError: (e) => {
			if (isAlreadyDecidedError(e)) {
				queryClient.invalidateQueries({ queryKey: ["returns"] });
				onClose();
			}
		},
	});

	const errors = fieldErrorsOf(decide.error);
	const rejectionMissing = !approve && !rejection.trim();
	const submit = () => {
		setTouched(true);
		if (!rejectionMissing) decide.mutate();
	};

	return (
		<>
			<ModalHead icon="swap" title={`مرجوعی ${item.code}`} subtitle={`سفارش ${item.orderCode} · ${formatDateTime(item.createdAt)}`} />
			<div className="m-body">
				<div className="icard" style={{ padding: 14, display: "grid", gap: 6, fontSize: 13.5 }}>
					<span>
						<b>{labelOf(RETURN_REASON, item.reason)}</b>
						{kivaFault && <span className="tag tag-warn" style={{ marginInlineStart: 8 }}>مشکل از کیوا</span>}
					</span>
					{item.description && <span>«{item.description}»</span>}
					<span className="muted">
						{item.items.map((i) => `${i.name} (${i.color.name}) × ${toPersianDigits(i.quantity)}`).join("، ")}
					</span>
					{!!item.media.length && (
						<span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
							{item.media.map((m) => (
								<a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="tag">
									{m.type === "VIDEO" ? "ویدیو" : "عکس"}
								</a>
							))}
						</span>
					)}
					<Link href={`/orders/${encodeURIComponent(item.orderCode)}`} style={{ color: "var(--purple)", fontWeight: 600 }}>
						مشاهده‌ی سفارش
					</Link>
				</div>

				<div className="radios" role="radiogroup" aria-label="تصمیم">
					<label className="opt-card">
						<input type="radio" name="decision" checked={approve} onChange={() => setApprove(true)} />
						<span className="radio" />
						<span className="t">تأیید مرجوعی</span>
					</label>
					<label className="opt-card">
						<input type="radio" name="decision" checked={!approve} onChange={() => setApprove(false)} />
						<span className="radio" />
						<span className="t">رد درخواست</span>
					</label>
				</div>

				{approve ? (
					<>
						<div className="field">
							<label>هزینه‌ی ارسال برگشت با</label>
							<div className="radios">
								{(["KIVA", "CUSTOMER"] as const).map((v) => (
									<label key={v} className="opt-card">
										<input
											type="radio"
											name="paidBy"
											checked={paidBy === v}
											onChange={() => {
												setPaidBy(v);
												// the template follows the choice until it was edited by hand
												if (Object.values(INSTRUCTIONS).includes(instructions)) setInstructions(INSTRUCTIONS[v]);
											}}
										/>
										<span className="radio" />
										<span className="t">{v === "KIVA" ? "کیوا" : "مشتری"}</span>
									</label>
								))}
							</div>
							<span className="help">{kivaFault ? "دلیل از سمت کیواست؛ معمولاً هزینه با کیواست." : "مشتری منصرف شده؛ طبق قوانین هزینه‌ی برگشت با خودش است."}</span>
						</div>
						<Textarea
							label="راهنمای ارسال برای مشتری"
							labelNote="روی کارت مرجوعی‌اش دیده می‌شود"
							maxLength={1000}
							value={instructions}
							onChange={(e) => setInstructions(e.target.value)}
							error={errors.instructions}
							style={{ minHeight: 110 }}
						/>
					</>
				) : (
					<Textarea
						label="دلیل رد"
						maxLength={500}
						value={rejection}
						onChange={(e) => setRejection(e.target.value)}
						error={(touched && rejectionMissing && "دلیل رد را بنویس.") || errors.rejectionReason}
						placeholder="مثلاً: مهلت ۷ روزه‌ی بازگشت تمام شده بود."
						style={{ minHeight: 90 }}
					/>
				)}
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={decide.isPending}>
					انصراف
				</Button>
				<Button variant={approve ? "primary" : "danger"} onClick={submit} isLoading={decide.isPending}>
					{approve ? "تأیید مرجوعی" : "رد درخواست"}
				</Button>
			</div>
		</>
	);
}
