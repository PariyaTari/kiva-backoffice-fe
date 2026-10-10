"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/app/_components/icon/icons";
import MediaUploader from "@/app/_components/panel/mediaUploader/mediaUploader";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Button from "@/app/_components/ui/button/button";
import Modal from "@/app/_components/ui/modal/modal";
import { toast } from "@/store/notification.store";
import { MediaView } from "@/types/common.type";
import { AdminOrder } from "@/types/order.type";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { MEDIA_VIEW, optionsOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";
import { isStaleOrderError } from "../../_utils/apiError";

type Row = { mediaId: string; url: string; thumb: string | null; video: boolean; orderItemId: number | null; view: MediaView };

type MediaEditModalProps = { order: AdminOrder; open: boolean; onClose: () => void };

/**
 * Steps 2–3 of FEATURES §3.2: upload the photos/videos of the very bag (`purpose=PRE_SHIPMENT`), tie each to its
 * order item and view, then save the whole list (`PUT …/pre-shipment-media`). Sending is a separate step.
 */
export default function MediaEditModal({ order, open, onClose }: MediaEditModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={720}>
			<MediaEditForm order={order} onClose={onClose} />
		</Modal>
	);
}

function MediaEditForm({ order, onClose }: Omit<MediaEditModalProps, "open">) {
	const queryClient = useQueryClient();
	const single = order.items.length === 1 ? order.items[0].id : null;
	const [rows, setRows] = useState<Row[]>(() =>
		order.preShipmentMediaDetail.items.map((m) => ({
			mediaId: m.id,
			url: m.url,
			thumb: m.thumbnailUrl,
			video: m.type === "VIDEO",
			orderItemId: m.orderItemId ?? single,
			view: m.view ?? "FRONT",
		})),
	);

	const patch = (i: number, change: Partial<Row>) => setRows((list) => list.map((r, k) => (k === i ? { ...r, ...change } : r)));

	const save = useMutation({
		mutationFn: () =>
			withMappedError(() =>
				OrdersEndpoints.setPreShipmentMedia(order.code, { items: rows.map((r, i) => ({ mediaId: r.mediaId, orderItemId: r.orderItemId, view: r.view, sortOrder: i })) }),
			),
		meta: { showNotification: true },
		onSuccess: () => {
			toast(rows.length ? `${toPersianDigits(rows.length)} فایل به سفارش وصل شد` : "عکس‌های سفارش پاک شد", { icon: "check" });
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

	const errors = fieldErrorsOf(save.error);

	return (
		<>
			<ModalHead icon="camera" title="عکس‌های قبل از ارسال" subtitle={`${order.code} — از همان کیفی که برای مشتری کنار گذاشته شده`} />
			<div className="m-body">
				<MediaUploader
					purpose="PRE_SHIPMENT"
					accept="image/*,video/*"
					hint="عکس از چند زاویه (جلو، کنار، جزئیات، داخل) و اگر شد یک ویدیوی کوتاه"
					onUploaded={(asset) =>
						setRows((list) => [
							...list,
							{ mediaId: asset.id, url: asset.url, thumb: asset.thumbnailUrl, video: asset.type === "VIDEO", orderItemId: single, view: list.length ? "SIDE" : "FRONT" },
						])
					}
				/>
				{rows.length ? (
					<div className="med-rows">
						{rows.map((r, i) => (
							<div key={r.mediaId} className="med-row">
								<span className="ph">
									{r.video ? (
										<video src={r.url} muted />
									) : (
										// eslint-disable-next-line @next/next/no-img-element -- uploaded media URL
										<img src={r.thumb || r.url} alt="" />
									)}
								</span>
								{order.items.length > 1 ? (
									<select
										className="select"
										aria-label="کدام کالا"
										value={r.orderItemId ?? ""}
										onChange={(e) => patch(i, { orderItemId: e.target.value ? Number(e.target.value) : null })}
									>
										<option value="">— همه‌ی سفارش —</option>
										{order.items.map((it) => (
											<option key={it.id} value={it.id}>
												{it.name} ({it.color.name})
											</option>
										))}
									</select>
								) : (
									<span className="muted" style={{ fontSize: 13 }}>
										{order.items[0].name} ({order.items[0].color.name})
									</span>
								)}
								<select className="select" aria-label="زاویه" value={r.view} onChange={(e) => patch(i, { view: e.target.value as MediaView })}>
									{optionsOf(MEDIA_VIEW).map((o) => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
								<button type="button" className="icon-btn" aria-label="حذف" onClick={() => setRows((list) => list.filter((_, k) => k !== i))}>
									<Icon name="trash" />
								</button>
								{errors[`items[${i}].mediaId`] && (
									<span className="err" style={{ gridColumn: "1/-1", color: "var(--danger)", fontSize: 12 }}>
										{errors[`items[${i}].mediaId`]}
									</span>
								)}
							</div>
						))}
					</div>
				) : (
					<p className="muted" style={{ fontSize: 13 }}>
						هنوز فایلی وصل نشده.
					</p>
				)}
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={save.isPending}>
					انصراف
				</Button>
				<Button onClick={() => save.mutate()} isLoading={save.isPending}>
					ذخیره‌ی عکس‌ها
				</Button>
			</div>
		</>
	);
}
