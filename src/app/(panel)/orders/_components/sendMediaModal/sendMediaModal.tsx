"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessengerIcon } from "@/app/_components/icon/messengerIcon";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Button from "@/app/_components/ui/button/button";
import Modal from "@/app/_components/ui/modal/modal";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { PhotoMessengerChannel } from "@/types/common.type";
import { AdminOrder } from "@/types/order.type";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { formatPhone } from "@/utils/format";
import { MESSENGER, optionsOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";
import { isStaleOrderError } from "../../_utils/apiError";

const DEFAULT_MESSAGE = "این کیف خودته؛ همین الان برات کنار گذاشتیمش.";

type SendMediaModalProps = { order: AdminOrder; open: boolean; onClose: () => void };

/**
 * Step 4 of FEATURES §3.2: the photos go to the shopper's messenger (the bot), or the operator sent them by hand and
 * records it (`manual`) → `PHOTO_SENT` + SMS «عکس کیفت فرستاده شد».
 */
export default function SendMediaModal({ order, open, onClose }: SendMediaModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={520}>
			<SendMediaForm order={order} onClose={onClose} />
		</Modal>
	);
}

function SendMediaForm({ order, onClose }: Omit<SendMediaModalProps, "open">) {
	const queryClient = useQueryClient();
	const m = order.preShipmentMediaDetail;
	const [manual, setManual] = useState(false);
	const [channel, setChannel] = useState<PhotoMessengerChannel>(m.channel);
	const [message, setMessage] = useState(DEFAULT_MESSAGE);

	const send = useMutation({
		mutationFn: () =>
			withMappedError(() =>
				OrdersEndpoints.sendPreShipmentMedia(order.code, { manual, channelOverride: channel !== m.channel ? channel : undefined, message: message.trim() || undefined }),
			),
		meta: { showNotification: true },
		onSuccess: () => {
			toast(manual ? "ارسال دستی ثبت شد" : `عکس‌ها در ${MESSENGER[channel]} برای مشتری رفت`, { icon: "send" });
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			onClose();
		},
		onError: (e) => {
			if (isStaleOrderError(e)) {
				queryClient.invalidateQueries({ queryKey: ["orders", "detail", order.code] });
				onClose();
			}
		},
	});

	const errors = fieldErrorsOf(send.error);

	return (
		<>
			<ModalHead icon="send" title="ارسال عکس برای مشتری" subtitle={`${order.code} — ${toPersianDigits(m.items.length)} فایل`} />
			<div className="m-body">
				<div className="radios" role="radiogroup" aria-label="روش ارسال">
					<label className="opt-card">
						<input type="radio" name="how" checked={!manual} onChange={() => setManual(false)} />
						<span className="radio" />
						<span>
							<span className="t">ارسال خودکار</span>
							<span className="d" style={{ display: "block" }}>
								ربات کیوا می‌فرستد
							</span>
						</span>
					</label>
					<label className="opt-card">
						<input type="radio" name="how" checked={manual} onChange={() => setManual(true)} />
						<span className="radio" />
						<span>
							<span className="t">دستی فرستادم</span>
							<span className="d" style={{ display: "block" }}>
								فقط ثبت و پیامک
							</span>
						</span>
					</label>
				</div>
				<div className="field">
					<label>پیام‌رسان</label>
					<div className="radios">
						{optionsOf(MESSENGER).map((o) => (
							<label key={o.value} className="opt-card">
								<input type="radio" name="channel" checked={channel === o.value} onChange={() => setChannel(o.value)} />
								<MessengerIcon channel={o.value} width={22} height={22} />
								<span className="t">{o.label}</span>
							</label>
						))}
					</div>
					<span className="help">
						انتخاب مشتری: {m.channelName} · <span className="ltr">{formatPhone(m.phone)}</span>
					</span>
				</div>
				<Textarea label="پیام همراه" labelNote="اختیاری" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} error={errors.message} style={{ minHeight: 70 }} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={send.isPending}>
					انصراف
				</Button>
				<Button onClick={() => send.mutate()} isLoading={send.isPending}>
					{manual ? "ثبت ارسال دستی" : "ارسال برای مشتری"}
				</Button>
			</div>
		</>
	);
}
