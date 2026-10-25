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
import { isPhotosIncompleteError, isStaleOrderError } from "../../_utils/apiError";
import { linesWithoutPhoto } from "../../_utils/packing";

const DEFAULT_MESSAGE = "این کیف خودته؛ همین الان برات کنار گذاشتیمش.";

type SendMediaModalProps = { order: AdminOrder; open: boolean; onClose: () => void };

/**
 * Step 4 of FEATURES §3.2 (1.12.0: always by hand — there is no messenger bot): the operator sends the draft photos
 * in the shopper's messenger, then records it here → `PHOTO_SENT`, reply deadline +24h, SMS «عکس کیفت فرستاده شد».
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
	const draft = order.draftItems ?? [];
	const [channel, setChannel] = useState<PhotoMessengerChannel>(m.channel);
	const [message, setMessage] = useState(DEFAULT_MESSAGE);
	const missing = linesWithoutPhoto(
		order,
		draft.map((d) => d.orderItemId),
	);

	const send = useMutation({
		mutationFn: () =>
			withMappedError(() =>
				OrdersEndpoints.sendPreShipmentMedia(order.code, { manual: true, channelOverride: channel !== m.channel ? channel : undefined, message: message.trim() || undefined }),
			),
		meta: { showNotification: true },
		onSuccess: () => {
			toast(`ارسال عکس‌ها در ${MESSENGER[channel]} ثبت شد و پیامک رفت`, { icon: "send" });
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
	const incomplete = missing.length > 0 || isPhotosIncompleteError(send.error);

	return (
		<>
			<ModalHead icon="send" title="ثبت ارسال عکس برای مشتری" subtitle={`${order.code} — ${toPersianDigits(draft.length)} فایل`} />
			<div className="m-body">
				<p className="note cream">
					عکس‌ها را خودت در پیام‌رسان مشتری بفرست، بعد این‌جا ثبت کن. با ثبت، مشتری عکس‌ها را در صفحه‌ی سفارشش می‌بیند و ۲۴ ساعت برای پاسخ وقت دارد.
				</p>
				{incomplete && (
					<p className="note danger">
						سفارش چندقلمی برای هر کیف دست‌کم یک عکس لازم دارد
						{missing.length > 0 && <>؛ بی‌عکس: {missing.map((i) => `${i.name} (${i.color.name})`).join("، ")}</>}. اول عکس‌ها را کامل کن.
					</p>
				)}
				<div className="field">
					<label>پیام‌رسانی که با آن فرستادی</label>
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
						{m.username && (
							<>
								{" "}
								· <span className="ltr">{m.username}</span>
							</>
						)}
					</span>
				</div>
				<Textarea
					label="پیامی که همراه عکس‌ها فرستادی"
					labelNote="اختیاری، فقط ثبت می‌شود"
					maxLength={500}
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					error={errors.message}
					style={{ minHeight: 70 }}
				/>
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={send.isPending}>
					انصراف
				</Button>
				<Button onClick={() => send.mutate()} isLoading={send.isPending} disabled={!draft.length || missing.length > 0}>
					فرستادم — ثبت ارسال
				</Button>
			</div>
		</>
	);
}
