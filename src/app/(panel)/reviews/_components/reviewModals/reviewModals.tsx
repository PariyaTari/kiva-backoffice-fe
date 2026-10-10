"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Button from "@/app/_components/ui/button/button";
import Modal from "@/app/_components/ui/modal/modal";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { AdminReview } from "@/types/support.type";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { withMappedError } from "@/utils/withMappedError";
import { ReviewsEndpoints } from "../../_api/reviewsEndpoints";

export type ReviewAction = { review: AdminReview; kind: "approve" | "reject" | "reply" } | null;

/** Approve (with an optional reply), reject (with the reason) or write «پاسخ کیوا» — one modal, three forms. */
export default function ReviewModals({ action, onClose }: { action: ReviewAction; onClose: () => void }) {
	return (
		<Modal open={!!action} onClose={onClose} width={560}>
			{action && <ReviewForm key={`${action.review.id}${action.kind}`} action={action} onClose={onClose} />}
		</Modal>
	);
}

const TITLE = { approve: "تأیید نظر", reject: "رد نظر", reply: "پاسخ کیوا" };

function ReviewForm({ action, onClose }: { action: NonNullable<ReviewAction>; onClose: () => void }) {
	const queryClient = useQueryClient();
	const { review, kind } = action;
	const [reply, setReply] = useState(review.reply?.text ?? "");
	const [reason, setReason] = useState("");
	const [touched, setTouched] = useState(false);

	const run = useMutation({
		mutationFn: () =>
			withMappedError(() =>
				kind === "reply"
					? ReviewsEndpoints.setReply(review.id, reply.trim())
					: ReviewsEndpoints.moderate(review.id, kind === "approve" ? { action: "APPROVE", reply: reply.trim() || null } : { action: "REJECT", rejectionReason: reason.trim() }),
			),
		meta: { showNotification: true },
		onSuccess: () => {
			toast(kind === "approve" ? "نظر تأیید شد و در سایت دیده می‌شود" : kind === "reject" ? "نظر رد شد" : "پاسخ کیوا ثبت شد", { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["reviews"] });
			onClose();
		},
	});

	const server = fieldErrorsOf(run.error);
	const local =
		kind === "reject" && !reason.trim() ? "دلیل رد را بنویس." : kind === "reply" && reply.trim().length < 2 ? "پاسخ حداقل ۲ حرف." : null;

	return (
		<>
			<ModalHead icon={kind === "reject" ? "ban" : kind === "approve" ? "check" : "chat"} tone={kind === "reject" ? "danger" : "default"} title={TITLE[kind]} subtitle={`${review.authorName} · ${review.product?.name ?? ""}`} />
			<div className="m-body">
				<p className="note">«{review.text}»</p>
				{kind === "reject" ? (
					<Textarea
						label="دلیل رد"
						labelNote="نویسنده در «نظرات من» می‌بیند"
						maxLength={300}
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						error={(touched && local) || server.rejectionReason}
						placeholder="مثلاً: حاوی شماره تماس بود."
						style={{ minHeight: 80 }}
					/>
				) : (
					<Textarea
						label="پاسخ کیوا"
						labelNote={kind === "approve" ? "اختیاری" : undefined}
						maxLength={1000}
						value={reply}
						onChange={(e) => setReply(e.target.value)}
						error={(touched && local) || server.reply || server.text}
						footer={<small className="muted">{toPersianDigits(reply.length)} / ۱۰۰۰</small>}
						placeholder="سمیرا جان ممنون از انرژی خوبت، مبارکت باشه."
						style={{ minHeight: 100 }}
					/>
				)}
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={run.isPending}>
					انصراف
				</Button>
				<Button
					variant={kind === "reject" ? "danger" : "primary"}
					isLoading={run.isPending}
					onClick={() => {
						setTouched(true);
						if (!local) run.mutate();
					}}
				>
					{kind === "approve" ? "تأیید" : kind === "reject" ? "رد کن" : "ثبت پاسخ"}
				</Button>
			</div>
		</>
	);
}
