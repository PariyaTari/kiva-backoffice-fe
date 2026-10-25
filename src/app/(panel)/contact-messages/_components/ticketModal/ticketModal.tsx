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
import { fieldErrorsWith } from "@/utils/fieldErrors";
import { formatDateTime, formatPhone } from "@/utils/format";
import { CONTACT_TOPIC, labelOf, optionsOf, REPLY_CHANNEL, TICKET_STATUS } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ContactEndpoints } from "../../_api/contactEndpoints";

type TicketModalProps = { ticket: AdminContactMessage | null; onClose: () => void };

/** 1.21.0 — the 400s about the reply pair: an e-mail reply to a message without e-mail, or one half of the pair alone. */
const CODE_FIELDS = { EMAIL_NOT_AVAILABLE: "replyChannel", REPLY_CHANNEL_REQUIRED: "replyChannel", REPLY_REQUIRED: "reply" };

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
			// `internalNote` replaces the note; empty clears it (1.21.0: `null`)
			const patch: ContactMessagePatch = { status, internalNote: note.trim() || null };
			if (reply.trim()) Object.assign(patch, { reply: reply.trim(), replyChannel: channel });
			return withMappedError(() => ContactEndpoints.update(t.ticketCode, patch));
		},
		meta: { showNotification: true },
		onSuccess: () => {
			toast(
				!reply.trim()
					? `${t.ticketCode} ذخیره شد`
					: channel === "SMS"
						? "پیامک خبر رفت (بدون متن پاسخ)؛ برای گفتن پاسخ با مشتری تماس بگیر"
						: "پاسخ ایمیل شد",
				{ icon: "check" },
			);
			queryClient.invalidateQueries({ queryKey: ["contact"] });
			onClose();
		},
	});

	const errors = fieldErrorsWith(save.error, CODE_FIELDS);
	const replyTooShort = !!reply.trim() && reply.trim().length < 2;

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
					<div className="note success" style={{ display: "block" }}>
						<b>
							پاسخ قبلی
							{t.replyChannel && ` با ${labelOf(REPLY_CHANNEL, t.replyChannel)}`}
							{t.repliedAt && ` · ${formatDateTime(t.repliedAt)}`}
							{t.repliedBy && ` · ${t.repliedBy}`}
						</b>
						<span style={{ display: "block", whiteSpace: "pre-line", marginTop: 4 }}>{t.reply}</span>
					</div>
				)}

				<Textarea
					label={t.reply ? "پاسخ تازه" : "پاسخ"}
					labelNote={t.reply ? "جای پاسخ قبلی را می‌گیرد و دوباره فرستاده می‌شود" : "اختیاری"}
					maxLength={1000}
					value={reply}
					onChange={(e) => setReply(e.target.value)}
					error={(replyTooShort && "پاسخ حداقل ۲ حرف.") || errors.reply}
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
						{errors.replyChannel ? (
							<span className="err" style={{ display: "block" }}>
								{errors.replyChannel}
							</span>
						) : (
							<span className="help">
								{channel === "SMS"
									? "متن پاسخ پیامک نمی‌شود: فقط خبری با کد پیگیری می‌رود («پشتیبانی کیوا به پیامت رسیدگی کرد»)؛ خودت تماس بگیر یا در پیام‌رسان بنویس."
									: "متن کامل پاسخ به ایمیل مشتری می‌رود."}
							</span>
						)}
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
				<Button onClick={() => save.mutate()} isLoading={save.isPending} disabled={replyTooShort}>
					{!reply.trim() ? "ذخیره" : channel === "SMS" ? "ثبت پاسخ و پیامک خبر" : "ارسال ایمیل و ذخیره"}
				</Button>
			</div>
		</>
	);
}
