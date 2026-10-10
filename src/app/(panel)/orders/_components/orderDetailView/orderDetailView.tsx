"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import { useCan } from "@/hooks/useCan";
import { toErrorView } from "@/utils/apiError";
import { formatDateTime, formatToman } from "@/utils/format";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";
import { ERROR_BEHAVIOUR, isOrderNotFoundError } from "../../_utils/apiError";
import MediaEditModal from "../mediaEditModal/mediaEditModal";
import OrderItems from "../orderItems/orderItems";
import OrderMedia from "../orderMedia/orderMedia";
import OrderMoney from "../orderMoney/orderMoney";
import OrderNotes from "../orderNotes/orderNotes";
import OrderProgress from "../orderProgress/orderProgress";
import OrderSide from "../orderSide/orderSide";
import OrderTimeline from "../orderTimeline/orderTimeline";
import RefundModal from "../refundModal/refundModal";
import SendMediaModal from "../sendMediaModal/sendMediaModal";
import ShipmentModal from "../shipmentModal/shipmentModal";
import StatusModal from "../statusModal/statusModal";

type ModalName = "status" | "shipment" | "refund" | "media" | "send" | null;

/** The statuses from which the order can be handed to the carrier (`PUT …/shipment`). */
const SHIPPABLE = ["PHOTO_SENT", "PROCESSING"];
const UNPAID = ["PENDING_PAYMENT", "PAYMENT_FAILED", "EXPIRED"];
const BACK = { href: "/orders", label: "سفارش‌ها" };

/** `/orders/[code]` — everything about one order and every operator action on it (FEATURES §3.2). */
export default function OrderDetailView({ code }: { code: string }) {
	const can = useCan();
	const [modal, setModal] = useState<ModalName>(null);
	const close = () => setModal(null);

	const order = useQuery({
		queryKey: ["orders", "detail", code],
		queryFn: () => withMappedError(() => OrdersEndpoints.getOrder(code)),
		meta: { showNotificationOnRefetch: true },
	});

	const orderMissing = isOrderNotFoundError(order.error);
	const orderError = orderMissing ? null : toErrorView(ERROR_BEHAVIOUR, order.error, "دریافت سفارش با خطا مواجه شد.");

	if (order.isLoading) return <Loading />;
	if (orderMissing)
		return (
			<>
				<PageHead title={`سفارش ${code}`} back={BACK} />
				<div className="tbl-wrap">
					<TableEmpty icon="box" title="این سفارش پیدا نشد" text="کد را دوباره بررسی کن." />
				</div>
			</>
		);
	if (orderError)
		return (
			<>
				<PageHead title={`سفارش ${code}`} back={BACK} />
				<ErrorComponent
					retryable={orderError.retryable}
					ticketAble={orderError.ticketAble}
					errorText={orderError.errorText}
					executeFunction={() => order.refetch()}
					loading={order.isFetching}
				/>
			</>
		);
	if (!order.data) return null;

	const o = order.data;
	const refundable = can("refunds") && !UNPAID.includes(o.status) && o.totals.payable - o.totals.refunded > 0;

	return (
		<>
			<PageHead
				back={BACK}
				title={
					<span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
						<span className="ltr">سفارش {o.code}</span>
						<Badge tone={o.statusTone} size="lg">
							{o.statusLabel}
						</Badge>
					</span>
				}
				subtitle={`${formatDateTime(o.placedAt)} · ${o.customer.fullName} · ${formatToman(o.totals.payable)}`}
				actions={
					<>
						{SHIPPABLE.includes(o.status) && (
							<Button size="sm" onClick={() => setModal("shipment")} iconStart={<Icon name="truck" />}>
								ثبت ارسال
							</Button>
						)}
						{!!o.allowedTransitions.length && (
							<Button size="sm" variant="white" onClick={() => setModal("status")} iconStart={<Icon name="refresh" />}>
								تغییر وضعیت
							</Button>
						)}
					</>
				}
			/>

			<div className="side-grid">
				<div className="col">
					<section className="icard">
						<OrderProgress progress={o.progress} />
					</section>
					<OrderMedia order={o} onEdit={() => setModal("media")} onSend={() => setModal("send")} />
					<OrderItems items={o.items} flaggedItemId={o.preShipmentMediaDetail.feedback?.decision === "REQUEST_CHANGE" ? o.preShipmentMediaDetail.feedback.orderItemId : null} />
					<OrderMoney order={o} onRefund={refundable ? () => setModal("refund") : undefined} />
					<OrderTimeline events={o.timeline} />
				</div>
				<div className="col">
					<OrderSide order={o} />
					<OrderNotes code={o.code} notes={o.notes} />
				</div>
			</div>

			<StatusModal order={o} open={modal === "status"} onClose={close} />
			<ShipmentModal order={o} open={modal === "shipment"} onClose={close} />
			<RefundModal order={o} open={modal === "refund"} onClose={close} />
			<MediaEditModal order={o} open={modal === "media"} onClose={close} />
			<SendMediaModal order={o} open={modal === "send"} onClose={close} />
		</>
	);
}
