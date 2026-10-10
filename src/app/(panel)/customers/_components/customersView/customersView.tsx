"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import { MessengerIcon } from "@/app/_components/icon/messengerIcon";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import SearchInput from "@/app/_components/panel/searchInput/searchInput";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import Checkbox from "@/app/_components/ui/checkbox/checkbox";
import Modal from "@/app/_components/ui/modal/modal";
import { useCan } from "@/hooks/useCan";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/notification.store";
import { AdminCustomer } from "@/types/support.type";
import { PanelRole } from "@/types/user.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatDate, formatPhone, formatToman } from "@/utils/format";
import { PANEL_ROLES, ROLE_LABEL } from "@/utils/roles";
import { withMappedError } from "@/utils/withMappedError";
import { CustomersEndpoints } from "../../_api/customersEndpoints";

/** What each panel role opens — shown in the roles modal. */
const ROLE_SCOPE: Record<PanelRole, string> = {
	ADMIN: "همه‌ی بخش‌ها، استرداد، تخفیف، تنظیمات، گزارش و نقش‌ها",
	CATALOG_MANAGER: "محصول، رنگ، موجودی، دسته، متریال",
	OPERATOR: "سفارش‌ها، عکس قبل از ارسال، ارسال، مرجوعی",
	CONTENT_EDITOR: "کمپین، بنر، اطلاعیه، پیام رضایت، بلاگ، FAQ، صفحات",
	SUPPORT: "نظرات، پیام‌های تماس، مشتریان",
};

/** `/customers` — find a person by mobile or name; ADMIN gives or takes panel roles. */
export default function CustomersView() {
	const can = useCan();
	const [f, setF] = useUrlFilters({ q: "" });
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [f.q] });
	const [editing, setEditing] = useState<AdminCustomer | null>(null);

	const customers = useQuery({
		queryKey: ["customers", "list", { q: f.q, page, pageSize }],
		queryFn: () => withMappedError(() => CustomersEndpoints.getCustomers(f.q, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const columns: Column<AdminCustomer>[] = [
		{
			key: "who",
			title: "مشتری",
			render: (c) => (
				<>
					<b>{c.fullName || "بدون نام"}</b>
					<span className="sub ltr">{formatPhone(c.phone)}</span>
				</>
			),
		},
		{ key: "email", title: "ایمیل", className: "nowrap", render: (c) => (c.email ? <span className="ltr">{c.email}</span> : <span className="muted">—</span>) },
		{
			key: "orders",
			title: "سفارش",
			className: "nowrap",
			render: (c) =>
				can("orders") && c.ordersCount ? (
					<Link href={`/orders?q=${c.phone}`} style={{ color: "var(--purple)" }}>
						{toPersianDigits(c.ordersCount)} سفارش
					</Link>
				) : (
					toPersianDigits(c.ordersCount)
				),
		},
		{ key: "spent", title: "جمع خرید", className: "nowrap", render: (c) => (c.totalSpent ? formatToman(c.totalSpent) : <span className="muted">—</span>) },
		{ key: "last", title: "آخرین سفارش", className: "nowrap muted", render: (c) => (c.lastOrderAt ? formatDate(c.lastOrderAt) : "—") },
		{
			key: "prefs",
			title: "پیام‌رسان / پیامک",
			className: "nowrap",
			render: (c) => (
				<span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
					{c.defaultMessenger ? <MessengerIcon channel={c.defaultMessenger} width={18} height={18} /> : <span className="muted">—</span>}
					{c.marketingSmsOptIn ? <Badge tone="SUCCESS">پیامک تبلیغ</Badge> : <Badge>بدون پیامک</Badge>}
				</span>
			),
		},
		{
			key: "roles",
			title: "نقش پنل",
			render: (c) => {
				const roles = c.roles.filter((r): r is PanelRole => r !== "CUSTOMER");
				return roles.length ? (
					<span className="chip-row">
						{roles.map((r) => (
							<Badge key={r} tone="SALE">
								{ROLE_LABEL[r]}
							</Badge>
						))}
					</span>
				) : (
					<span className="muted">—</span>
				);
			},
		},
		{ key: "joined", title: "عضویت", className: "nowrap muted", render: (c) => formatDate(c.createdAt) },
		...(can("assignRoles")
			? [
					{
						key: "acts",
						title: "",
						className: "end",
						render: (c: AdminCustomer) => (
							<Button size="sm" variant="white" onClick={() => setEditing(c)} iconStart={<Icon name="shield" />}>
								نقش‌ها
							</Button>
						),
					},
				]
			: []),
	];

	const customersError = toErrorView(ERROR_BEHAVIOUR, customers.error, "دریافت مشتریان با خطا مواجه شد.");

	return (
		<>
			<PageHead title="مشتریان" subtitle="جستجو با موبایل یا نام. جزئیات کامل مشتری (آدرس‌ها، نظرها، …) در کانترکت نیست؛ سفارش‌هایش از لینک ستون «سفارش»." />
			<div className="fbar">
				<SearchInput value={f.q} onSearch={(q) => setF({ q })} placeholder="موبایل یا نام" />
			</div>
			{customers.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!customersError ? (
				<ErrorComponent
					retryable={customersError.retryable}
					ticketAble={customersError.ticketAble}
					errorText={customersError.errorText}
					executeFunction={() => customers.refetch()}
					loading={customers.isFetching}
				/>
			) : !customers.error && !!customers.data ? (
				<DataTable
					caption="مشتریان"
					columns={columns}
					rows={customers.data.items}
					rowKey={(c) => c.id}
					loading={customers.isFetching}
					empty={<TableEmpty icon="users" title="کسی پیدا نشد" />}
					footer={<TableFooter meta={customers.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={customers.isFetching} />}
				/>
			) : null}

			<Modal open={!!editing} onClose={() => setEditing(null)} width={520}>
				{editing && <RolesForm key={editing.id} customer={editing} onClose={() => setEditing(null)} />}
			</Modal>
		</>
	);
}

/** `PUT /admin/customers/{id}/roles` — the person's panel roles; their sessions end so the new roles apply at once. */
function RolesForm({ customer, onClose }: { customer: AdminCustomer; onClose: () => void }) {
	const queryClient = useQueryClient();
	const myId = useAuthStore((s) => s.user?.id);
	const self = customer.id === myId;
	const [roles, setRoles] = useState<PanelRole[]>(customer.roles.filter((r): r is PanelRole => r !== "CUSTOMER"));

	const save = useMutation({
		mutationFn: () => withMappedError(() => CustomersEndpoints.setRoles(customer.id, roles)),
		meta: { showNotification: true },
		onSuccess: (c) => {
			toast(`نقش‌های ${c.fullName || formatPhone(c.phone)} ذخیره شد؛ باید دوباره وارد شود`, { icon: "shield" });
			queryClient.invalidateQueries({ queryKey: ["customers"] });
			onClose();
		},
	});

	return (
		<>
			<ModalHead icon="shield" title="نقش‌های پنل" subtitle={`${customer.fullName || "بدون نام"} · ${formatPhone(customer.phone)}`} />
			<div className="m-body">
				{self ? (
					<p className="note danger">نقش‌های خودت را نمی‌توانی عوض کنی؛ از مدیر کل دیگری بخواه.</p>
				) : (
					<p className="note cream">با ذخیره، همه‌ی نشست‌های این شخص بسته می‌شود تا با نقش‌های تازه دوباره وارد شود. نقش «مشتری» همیشه می‌ماند.</p>
				)}
				<div className="stack" style={{ gap: 10 }}>
					{PANEL_ROLES.map((r) => (
						<div key={r}>
							<Checkbox
								label={<b>{ROLE_LABEL[r]}</b>}
								disabled={self}
								checked={roles.includes(r)}
								onChange={(e) => setRoles((list) => (e.target.checked ? [...list, r] : list.filter((x) => x !== r)))}
							/>
							<small className="muted" style={{ display: "block", marginInlineStart: 30 }}>
								{ROLE_SCOPE[r]}
							</small>
						</div>
					))}
				</div>
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={save.isPending}>
					انصراف
				</Button>
				<Button onClick={() => save.mutate()} isLoading={save.isPending} disabled={self}>
					ذخیره‌ی نقش‌ها
				</Button>
			</div>
		</>
	);
}
