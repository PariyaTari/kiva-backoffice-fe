"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import JalaliDateTimeInput from "@/app/_components/panel/jalaliDateTimeInput/jalaliDateTimeInput";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import Select from "@/app/_components/ui/select/select";
import Switch from "@/app/_components/ui/switch/switch";
import { toast } from "@/store/notification.store";
import { ShippingMethodCode } from "@/types/common.type";
import { AdminOrder } from "@/types/order.type";
import { convertPersianToEnglishString, toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { optionsOf, SHIPPING_METHOD } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";
import { isStaleOrderError } from "../../_utils/apiError";

type ShipmentModalProps = { order: AdminOrder; open: boolean; onClose: () => void };

/** `PUT /admin/orders/{code}/shipment` — handed to the carrier: tracking code, time, «کدهای رهگیری روزانه» → `SHIPPED` + SMS. */
export default function ShipmentModal({ order, open, onClose }: ShipmentModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={520}>
			<ShipmentForm order={order} onClose={onClose} />
		</Modal>
	);
}

function ShipmentForm({ order, onClose }: Omit<ShipmentModalProps, "open">) {
	const queryClient = useQueryClient();
	const [carrier, setCarrier] = useState<ShippingMethodCode>(order.shippingMethod.code);
	const [tracking, setTracking] = useState("");
	const [shippedAt, setShippedAt] = useState<string | null>(null);
	const [daily, setDaily] = useState(true);
	const [touched, setTouched] = useState(false);
	const group = order.shipmentGroup && order.shipmentGroup.orderCodes.length > 1 ? order.shipmentGroup : null;

	const code = convertPersianToEnglishString(tracking).trim();
	const localError = code.length < 6 || code.length > 40 ? "کد رهگیری باید ۶ تا ۴۰ کاراکتر باشد." : null;

	const ship = useMutation({
		mutationFn: () => withMappedError(() => OrdersEndpoints.setShipment(order.code, { carrier, trackingCode: code, shippedAt, showInDailyList: daily })),
		meta: { showNotification: true },
		onSuccess: () => {
			toast(group ? `ارسال برای ${toPersianDigits(group.orderCodes.length)} سفارش گروه ثبت شد` : "ارسال ثبت شد و پیامک رفت", { icon: "truck" });
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

	const errors = fieldErrorsOf(ship.error);
	const submit = () => {
		setTouched(true);
		if (!localError) ship.mutate();
	};

	return (
		<>
			<ModalHead icon="truck" title="ثبت ارسال" subtitle={`${order.code} — تحویل به حامل و کد رهگیری`} />
			<div className="m-body">
				{group && (
					<p className="note cream">
						این سفارش در گروه رزرو <b className="ltr">{group.code}</b> است؛ همین کد روی همه‌ی {toPersianDigits(group.orderCodes.length)} سفارش گروه ثبت می‌شود.
					</p>
				)}
				<div className="form-grid">
					<Select label="حامل" value={carrier} onChange={(e) => setCarrier(e.target.value as ShippingMethodCode)} options={optionsOf(SHIPPING_METHOD)} error={errors.carrier} />
					<Input
						label="کد رهگیری"
						direction="ltr"
						autoFocus
						value={tracking}
						onChange={(e) => setTracking(e.target.value)}
						error={(touched && localError) || errors.trackingCode}
						placeholder={carrier === "TIPAX" ? "TPX4821760" : "۲۴ رقم پست"}
					/>
				</div>
				<div className="field">
					<label>زمان تحویل به حامل</label>
					<JalaliDateTimeInput value={shippedAt} onChange={setShippedAt} ariaLabel="زمان ارسال" />
					<span className="help">خالی = همین الان</span>
				</div>
				<Switch label="نمایش (ماسک‌شده) در «کدهای رهگیری روزانه»" checked={daily} onChange={(e) => setDaily(e.target.checked)} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={ship.isPending}>
					انصراف
				</Button>
				<Button onClick={submit} isLoading={ship.isPending}>
					ثبت ارسال و پیامک
				</Button>
			</div>
		</>
	);
}
