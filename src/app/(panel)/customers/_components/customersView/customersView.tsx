"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import { MessengerIcon } from "@/app/_components/icon/messengerIcon";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import SearchInput from "@/app/_components/panel/searchInput/searchInput";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import { useCan } from "@/hooks/useCan";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { AdminCustomer, CustomerFilters } from "@/types/support.type";
import { PanelRole, UserRole } from "@/types/user.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatDate, formatPhone, formatToman } from "@/utils/format";
import { PANEL_ROLES, ROLE_LABEL } from "@/utils/roles";
import { withMappedError } from "@/utils/withMappedError";
import { CustomersEndpoints } from "../../_api/customersEndpoints";
import RolesModal from "../rolesModal/rolesModal";

/** The panel's role badges of a person (`CUSTOMER` left out). */
export function RoleBadges({ roles }: { roles: UserRole[] }) {
	const panel = roles.filter((r): r is PanelRole => r !== "CUSTOMER");
	return panel.length ? (
		<span className="chip-row">
			{panel.map((r) => (
				<Badge key={r} tone="SALE">
					{ROLE_LABEL[r]}
				</Badge>
			))}
		</span>
	) : (
		<span className="muted">—</span>
	);
}

/** `/customers` — find a person by mobile or name (or the staff of one role); their page; ADMIN gives or takes panel roles. */
export default function CustomersView() {
	const can = useCan();
	const router = useRouter();
	const [f, setF] = useUrlFilters({ q: "", role: "" });
	const filters: CustomerFilters = { q: f.q || undefined, role: (f.role || undefined) as UserRole | undefined };
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [filters] });
	const [editing, setEditing] = useState<AdminCustomer | null>(null);

	const customers = useQuery({
		queryKey: ["customers", "list", { filters, page, pageSize }],
		queryFn: () => withMappedError(() => CustomersEndpoints.getCustomers(filters, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const columns: Column<AdminCustomer>[] = [
		{
			key: "who",
			title: "مشتری",
			render: (c) => (
				<>
					<Link href={`/customers/${c.id}`} style={{ fontWeight: 700 }}>
						{c.fullName || "بدون نام"}
					</Link>
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
		{ key: "roles", title: "نقش پنل", render: (c) => <RoleBadges roles={c.roles} /> },
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
			<PageHead title="مشتریان" subtitle="جستجو با موبایل یا نام؛ صفحه‌ی هر مشتری آدرس‌ها و آخرین سفارش‌هایش را دارد. حساب‌های حذف‌شده این‌جا نمی‌آیند." />
			<div className="fbar">
				<SearchInput value={f.q} onSearch={(q) => setF({ q })} placeholder="موبایل یا نام" />
				<select className="select" aria-label="نقش" value={f.role} onChange={(e) => setF({ role: e.target.value })}>
					<option value="">همه (مشتری و کارمند)</option>
					{PANEL_ROLES.map((r) => (
						<option key={r} value={r}>
							فقط {ROLE_LABEL[r]}
						</option>
					))}
				</select>
				{(f.q || f.role) && (
					<button type="button" className="clear" onClick={() => setF({ q: "", role: "" })}>
						حذف فیلترها
					</button>
				)}
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
					onRowClick={(c) => router.push(`/customers/${c.id}`)}
					loading={customers.isFetching}
					empty={<TableEmpty icon="users" title="کسی پیدا نشد" />}
					footer={<TableFooter meta={customers.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={customers.isFetching} />}
				/>
			) : null}

			<RolesModal customer={editing} onClose={() => setEditing(null)} />
		</>
	);
}
