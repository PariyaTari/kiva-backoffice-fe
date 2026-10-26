"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import AuditHistory from "@/app/(panel)/_components/auditHistory/auditHistory";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import { MessengerIcon } from "@/app/_components/icon/messengerIcon";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import { useCan } from "@/hooks/useCan";
import { AdminOrderListItem } from "@/types/order.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatDate, formatDateTime, formatPhone, formatToman } from "@/utils/format";
import { GENDER, labelOf, MESSENGER, ORDER_STATUS, ORDER_STATUS_TONE, SHIPPING_METHOD } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { CustomersEndpoints } from "../../_api/customersEndpoints";
import { ERROR_BEHAVIOUR, isCustomerDeletedError } from "../../_utils/apiError";
import { RoleBadges } from "../customersView/customersView";
import RolesModal from "../rolesModal/rolesModal";

const BACK = { href: "/customers", label: "مشتریان" };

/**
 * `/customers/[id]` — one shopper for support (`GET /admin/customers/{id}`): profile and preferences, every saved
 * address, the last 5 orders in any state (unpaid ones too), panel roles; ADMIN also sees the change log of the account.
 */
export default function CustomerDetailView({ id }: { id: number }) {
	const can = useCan();
	const [editingRoles, setEditingRoles] = useState(false);

	const customer = useQuery({
		queryKey: ["customers", "detail", id],
		queryFn: () => withMappedError(() => CustomersEndpoints.getCustomer(id)),
		meta: { showNotificationOnRefetch: true },
	});

	const orderColumns: Column<AdminOrderListItem>[] = [
		{
			key: "code",
			title: "سفارش",
			className: "nowrap",
			render: (o) =>
				can("orders") ? (
					<Link href={`/orders/${encodeURIComponent(o.code)}`} className="code">
						{o.code}
					</Link>
				) : (
					<span className="code">{o.code}</span>
				),
		},
		{ key: "placedAt", title: "ثبت", className: "nowrap", render: (o) => formatDateTime(o.placedAt) },
		{ key: "status", title: "وضعیت", className: "nowrap", render: (o) => <StatusTag value={o.status} labels={ORDER_STATUS} tones={ORDER_STATUS_TONE} /> },
		{ key: "items", title: "اقلام", className: "nowrap", render: (o) => toPersianDigits(o.itemsCount) },
		{ key: "payable", title: "مبلغ", className: "nowrap", render: (o) => formatToman(o.payable) },
		{ key: "shipping", title: "ارسال", className: "nowrap", render: (o) => `${labelOf(SHIPPING_METHOD, o.shippingMethod)} · ${o.city}` },
	];

	const customerDeleted = isCustomerDeletedError(customer.error);
	const customerError = customerDeleted ? null : toErrorView(ERROR_BEHAVIOUR, customer.error, "دریافت اطلاعات مشتری با خطا مواجه شد.");

	if (customer.isLoading) return <Loading />;
	if (customerDeleted)
		return (
			<>
				<PageHead title="مشتری" back={BACK} />
				<div className="tbl-wrap">
					<TableEmpty
						icon="user"
						title="این حساب حذف شده"
						text="مشتری حسابش را حذف کرده؛ سفارش‌ها و مرجوعی‌هایش بی‌نام مانده‌اند و اطلاعات شخصی‌اش دیگر در دسترس نیست."
					/>
				</div>
			</>
		);
	if (customerError)
		return (
			<>
				<PageHead title="مشتری" back={BACK} />
				<ErrorComponent
					retryable={customerError.retryable}
					ticketAble={customerError.ticketAble}
					errorText={customerError.errorText}
					executeFunction={() => customer.refetch()}
					loading={customer.isFetching}
				/>
			</>
		);
	if (!customer.data) return null;
	const c = customer.data;
	const name = c.fullName || [c.firstName, c.lastName].filter(Boolean).join(" ") || "بدون نام";

	return (
		<>
			<PageHead
				back={BACK}
				title={
					<span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
						{name}
						<RoleBadges roles={c.roles} />
					</span>
				}
				subtitle={
					<>
						<span className="ltr">{formatPhone(c.phone)}</span> · عضو از {formatDate(c.createdAt)}
					</>
				}
				actions={
					<>
						{can("orders") && !!c.ordersCount && (
							<Button size="sm" variant="white" href={`/orders?q=${c.phone}`} iconStart={<Icon name="box" />}>
								همه‌ی سفارش‌ها
							</Button>
						)}
						{can("assignRoles") && (
							<Button size="sm" variant="white" onClick={() => setEditingRoles(true)} iconStart={<Icon name="shield" />}>
								نقش‌ها
							</Button>
						)}
					</>
				}
			/>

			<div className="side-grid">
				<div className="col">
					<section style={{ display: "grid", gap: 10 }}>
						<h3 style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
							<Icon name="box" style={{ width: 18, height: 18, color: "var(--purple)" }} /> آخرین سفارش‌ها
							<small className="muted" style={{ fontWeight: 500 }}>
								۵ تای آخر در هر وضعیتی (پرداخت‌نشده هم)
							</small>
						</h3>
						<DataTable caption="آخرین سفارش‌ها" columns={orderColumns} rows={c.recentOrders} rowKey={(o) => o.code} empty={<TableEmpty icon="box" title="هنوز سفارشی ثبت نکرده" />} />
					</section>

					<section className="icard">
						<h3>
							<Icon name="pin" /> آدرس‌ها
						</h3>
						{c.addresses.length ? (
							<ul className="addr-list">
								{c.addresses.map((a) => (
									<li key={a.id}>
										<b>
											{a.title || "بدون عنوان"}
											{a.isDefault && <Badge tone="SUCCESS">پیش‌فرض</Badge>}
										</b>
										<span>{a.fullText}</span>
										<small className="muted">
											گیرنده {a.recipientName} · <span className="ltr">{formatPhone(a.recipientPhone)}</span> · کد پستی <span className="ltr">{toPersianDigits(a.postalCode)}</span>
										</small>
									</li>
								))}
							</ul>
						) : (
							<p className="muted" style={{ fontSize: 13 }}>
								آدرسی ذخیره نکرده.
							</p>
						)}
					</section>
				</div>

				<div className="col">
					<section className="icard">
						<h3>
							<Icon name="user" /> پروفایل
						</h3>
						<dl className="kv">
							<dt>نام</dt>
							<dd>{c.firstName || "—"}</dd>
							<dt>نام خانوادگی</dt>
							<dd>{c.lastName || "—"}</dd>
							<dt>موبایل</dt>
							<dd className="ltr">{formatPhone(c.phone)}</dd>
							<dt>ایمیل</dt>
							<dd className="ltr">{c.email || "—"}</dd>
							<dt>تولد</dt>
							<dd>{c.birthDate ? formatDate(c.birthDate) : "—"}</dd>
							<dt>جنسیت</dt>
							<dd>{labelOf(GENDER, c.gender)}</dd>
							<dt>پیام‌رسان عکس</dt>
							<dd>
								{c.defaultMessenger ? (
									<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
										<MessengerIcon channel={c.defaultMessenger} width={18} height={18} />
										{labelOf(MESSENGER, c.defaultMessenger)}
										{c.defaultMessengerPhone && <span className="ltr">{formatPhone(c.defaultMessengerPhone)}</span>}
									</span>
								) : (
									"—"
								)}
							</dd>
							<dt>پیامک تبلیغ</dt>
							<dd>{c.marketingSmsOptIn ? "می‌خواهد" : "نمی‌خواهد"}</dd>
						</dl>
					</section>

					<section className="icard">
						<h3>
							<Icon name="wallet" /> خرید
						</h3>
						<dl className="kv">
							<dt>سفارش پرداخت‌شده</dt>
							<dd>{toPersianDigits(c.ordersCount)}</dd>
							<dt>جمع خرید</dt>
							<dd>{formatToman(c.totalSpent)}</dd>
							<dt>آخرین سفارش</dt>
							<dd>{formatDateTime(c.lastOrderAt)}</dd>
						</dl>
					</section>

					<AuditHistory entityType="USER" entityId={String(c.id)} parentKey={["customers", "detail", id]} />
				</div>
			</div>

			<RolesModal customer={editingRoles ? c : null} onClose={() => setEditingRoles(false)} />
		</>
	);
}
