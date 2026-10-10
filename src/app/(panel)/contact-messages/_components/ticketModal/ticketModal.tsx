"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Button from "@/app/_components/ui/button/button";
import Modal from "@/app/_components/ui/modal/modal";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { useCan } from "@/hooks/useCan";
import { toast } from "@/store/notification.store";
import { AdminContactMessage, ContactMessagePatch, ReplyChannel, TicketStatus } from "@/types/support.type";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { formatDateTime, formatPhone } from "@/utils/format";
import { CONTACT_TOPIC, labelOf, optionsOf, TICKET_STATUS } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ContactEndpoints } from "../../_api/contactEndpoints";

type TicketModalProps = { ticket: AdminContactMessage | null; onClose: () => void };

/** One ticket: the message, who sent it, the reply (SMS / email), the internal note and the status — one `PATCH`. */
export default function TicketModal({ ticket, onClose }: TicketModalProps) {
	return (
		<Modal open={!!ticket} onClose={onClose} width={620}>
			{ticket && <TicketForm key={ticket.ticketCode} ticket={ticket} onClose={onClose} />}
		</Modal>
	);
}

function TicketForm({ ticket: t, onClose }: { ticket: AdminContactMessage; onClose: () => void }) {
	const queryClient = useQueryClient();
	const can = useCan();
	const [reply, setReply] = useState("");
	const [channel, setChannel] = useState<ReplyChannel>("SMS");
	const [note, setNote] = useState(t.internalNote ?? "");
	// a reply usually closes the ticket; the status stays editable
	const [status, setStatus] = useState<TicketStatus>(t.status === "OPEN" ? "IN_PROGRESS" : t.status);

	const save = useMutation({
		mutationFn: () => {
			const patch: ContactMessagePatch = { status, internalNote: note.trim() };
			if (reply.trim()) Object.assign(patch, { reply: reply.trim(), replyChannel: channel });
			return withMappedError(() => ContactEndpoints.update(t.ticketCode, patch));
		},
		meta: { showNotification: true },
		onSuccess: () => {
			toast(reply.trim() ? `پاسخ با ${channel === "SMS" ? "پیامک" : "ایمیل"} رفت` : `${t.ticketCode} ذخیره شد`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["contact"] });
			onClose();
		},
	});

	const errors = fieldErrorsOf(save.error);

	return (
		<>
			<ModalHead icon="chat" title={`پیام ${t.ticketCode}`} subtitle={`${labelOf(CONTACT_TOPIC, t.topic)} · ${formatDateTime(t.createdAt)}`} />
			<div className="m-body">
				<dl className="kv">
					<dt>فرستنده</dt>
					<dd>
						{t.fullName} · <span className="ltr">{formatPhone(t.phone)}</span>
					</dd>
					{t.email && (
						<>
							<dt>ایمیل</dt>
							<dd className="ltr">{t.email}</dd>
						</>
					)}
					{t.orderCode && (
						<>
							<dt>سفارش</dt>
							<dd>{can("orders") ? <Link href={`/orders/${t.orderCode}`} className="ltr" style={{ color: "var(--purple)" }}>{t.orderCode}</Link> : <span className="ltr">{t.orderCode}</span>}</dd>
						</>
					)}
					<dt>حساب</dt>
					<dd>{t.userId ? "کاربر واردشده" : "مهمان"}</dd>
				</dl>
				<p className="note">{t.message}</p>
				{t.reply && (
					<div className="note success">
						پاسخ قبلی{t.replyChannel ? ` (${t.replyChannel === "SMS" ? "پیامک" : "ایمیل"})` : ""}: {t.reply}
					</div>
				)}

				<Textarea
					label={t.reply ? "پاسخ تازه" : "پاسخ"}
					labelNote="اختیاری؛ برای مشتری فرستاده می‌شود"
					maxLength={1000}
					value={reply}
					onChange={(e) => setReply(e.target.value)}
					error={errors.reply}
					footer={<small className="muted">{toPersianDigits(reply.length)} / ۱۰۰۰</small>}
					style={{ minHeight: 100 }}
				/>
				{reply.trim() && (
					<div className="field">
						<label>ارسال با</label>
						<div className="radios">
							<label className="opt-card">
								<input type="radio" name="channel" checked={channel === "SMS"} onChange={() => setChannel("SMS")} />
								<span className="radio" />
								<span className="t">پیامک</span>
							</label>
							<label className="opt-card" style={!t.email ? { opacity: 0.5 } : undefined}>
								<input type="radio" name="channel" disabled={!t.email} checked={channel === "EMAIL"} onChange={() => setChannel("EMAIL")} />
								<span className="radio" />
								<span className="t">ایمیل{!t.email && " (ندارد)"}</span>
							</label>
						</div>
						{errors.replyChannel && <span className="err" style={{ display: "block" }}>{errors.replyChannel}</span>}
					</div>
				)}
				<Textarea label="یادداشت داخلی" labelNote="فقط تیم می‌بیند" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} error={errors.internalNote} style={{ minHeight: 70 }} />
				<div className="field">
					<label>وضعیت</label>
					<div className="radios">
						{optionsOf(TICKET_STATUS).map((o) => (
							<label key={o.value} className="opt-card">
								<input type="radio" name="status" checked={status === o.value} onChange={() => setStatus(o.value)} />
								<span className="radio" />
								<span className="t">{o.label}</span>
							</label>
						))}
					</div>
				</div>
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={save.isPending}>
					انصراف
				</Button>
				<Button onClick={() => save.mutate()} isLoading={save.isPending}>
					{reply.trim() ? "ارسال پاسخ و ذخیره" : "ذخیره"}
				</Button>
			</div>
		</>
	);
}
