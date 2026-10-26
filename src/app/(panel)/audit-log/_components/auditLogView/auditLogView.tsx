"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AuditEndpoints } from "@/app/(panel)/_api/auditEndpoints";
import AuditChanges from "@/app/(panel)/_components/auditChanges/auditChanges";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import JalaliDateInput from "@/app/_components/panel/jalaliDateInput/jalaliDateInput";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import SearchInput from "@/app/_components/panel/searchInput/searchInput";
import Badge from "@/app/_components/ui/badge/badge";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { AuditEntityType, AuditLogEntry, AuditLogFilters } from "@/types/audit.type";
import { toErrorView } from "@/utils/apiError";
import { formatDateTime, formatPhone, relativeTime } from "@/utils/format";
import { dayRange } from "@/utils/jalali";
import { AUDIT_ENTITY, labelOf, optionsOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";

/** The panel page of a changed thing, when it has one of its own. */
function entityHref(e: AuditLogEntry): string | null {
	const id = encodeURIComponent(e.entityId);
	switch (e.entityType) {
		case "ORDER":
			return `/orders/${id}`;
		case "PRODUCT":
			return `/products/${id}`;
		case "USER":
			return `/customers/${id}`;
		case "BLOG_POST":
			return `/blog/${id}`;
		case "PAGE":
			return `/pages/${id}`;
		default:
			return null;
	}
}

const DEFAULTS = { type: "", id: "", actor: "", from: "", to: "" };

/** `/audit-log` (ADMIN) — every successful write under `/admin/*`: who, when, what, on which thing, and each field from → to. Kept 90 days. */
export default function AuditLogView() {
	const [f, setF] = useUrlFilters(DEFAULTS);
	const days = dayRange(f.from, f.to);
	const filters: AuditLogFilters = {
		entityType: (f.type || undefined) as AuditEntityType | undefined,
		entityId: f.id || undefined,
		actorId: Number(f.actor) || undefined,
		from: days.from,
		to: days.to,
	};
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [filters] });

	const entries = useQuery({
		queryKey: ["audit", "list", { filters, page, pageSize }],
		queryFn: () => withMappedError(() => AuditEndpoints.getEntries(filters, page, pageSize)),
		placeholderData: keepPreviousData,
		enabled: !days.inverted,
		meta: { showNotificationOnRefetch: true },
	});

	// the actor's name, for the «فقط کارهای …» chip — from any row of theirs on this page
	const actor = filters.actorId ? entries.data?.items.find((e) => e.actor.id === filters.actorId)?.actor : undefined;
	const filtered = Object.values(f).some(Boolean);

	const columns: Column<AuditLogEntry>[] = [
		{
			key: "at",
			title: "زمان",
			className: "nowrap",
			render: (e) => (
				<>
					{formatDateTime(e.at)}
					<span className="sub">{relativeTime(e.at)}</span>
				</>
			),
		},
		{
			key: "actor",
			title: "کاربر",
			className: "nowrap",
			render: (e) => (
				<>
					<button type="button" className="btn btn-link btn-sm" style={{ padding: 0, height: "auto" }} title="فقط کارهای این کاربر" onClick={() => setF({ actor: String(e.actor.id) })}>
						{e.actor.fullName || "بدون نام"}
					</button>
					<span className="sub ltr">{formatPhone(e.actor.phone)}</span>
				</>
			),
		},
		{
			key: "entity",
			title: "مورد",
			render: (e) => {
				const href = entityHref(e);
				const label = e.entityLabel || e.entityId;
				return (
					<>
						<Badge>{labelOf(AUDIT_ENTITY, e.entityType)}</Badge>{" "}
						{href ? (
							<Link href={href} style={{ color: "var(--purple)", fontWeight: 600 }}>
								{label}
							</Link>
						) : (
							<b>{label}</b>
						)}
						<span className="sub">
							<button type="button" className="btn btn-link btn-sm" style={{ padding: 0, height: "auto", fontSize: 12 }} onClick={() => setF({ type: e.entityType, id: e.entityId })}>
								تاریخچه‌ی همین مورد
							</button>
						</span>
					</>
				);
			},
		},
		{
			key: "summary",
			title: "کار",
			render: (e) => (
				<span style={{ display: "block", minWidth: 260 }}>
					{e.summary}
					<AuditChanges changes={e.changes} />
				</span>
			),
		},
		{ key: "ip", title: "IP", className: "nowrap muted", render: (e) => (e.ip ? <span className="ltr">{e.ip}</span> : "—") },
	];

	const entriesError = toErrorView(ERROR_BEHAVIOUR, entries.error, "دریافت لاگ تغییرات با خطا مواجه شد.");

	return (
		<>
			<PageHead
				title="لاگ تغییرات"
				subtitle="هر کار موفق در پنل (ساخت، ویرایش، حذف، تغییر وضعیت) یک ردیف دارد، با «از ← به» ِ هر فیلد. خواندن‌ها، آپلود مدیا و کارهای خودکار سیستم ثبت نمی‌شوند؛ هر ردیف ۹۰ روز می‌ماند."
			/>
			<div className="fbar">
				<select className="select" aria-label="نوع مورد" value={f.type} onChange={(e) => setF({ type: e.target.value })}>
					<option value="">همه‌ی بخش‌ها</option>
					{optionsOf(AUDIT_ENTITY).map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				<SearchInput value={f.id} onSearch={(id) => setF({ id: id.trim() })} placeholder="شناسه یا کد (12، KV-218340، lilac)" />
				<JalaliDateInput value={f.from} onChange={(from) => setF({ from })} aria-label="از تاریخ" placeholder="از تاریخ" />
				<JalaliDateInput value={f.to} onChange={(to) => setF({ to })} aria-label="تا تاریخ" placeholder="تا تاریخ" />
				{filters.actorId && (
					<span className="tag tag-cream">
						<Icon name="user" /> فقط کارهای {actor ? actor.fullName || formatPhone(actor.phone) : `کاربر #${filters.actorId}`}
						<button type="button" className="icon-btn" aria-label="برداشتن فیلتر کاربر" onClick={() => setF({ actor: "" })} style={{ width: 22, height: 22 }}>
							<Icon name="close" />
						</button>
					</span>
				)}
				{filtered && (
					<button type="button" className="clear" onClick={() => setF(DEFAULTS)}>
						حذف فیلترها
					</button>
				)}
			</div>

			{days.inverted ? (
				<div className="tbl-wrap">
					<TableEmpty icon="cal" title="بازه‌ی تاریخ برعکس است" text="«تا تاریخ» باید همان روز «از تاریخ» یا بعد از آن باشد." />
				</div>
			) : entries.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!entriesError ? (
				<ErrorComponent
					retryable={entriesError.retryable}
					ticketAble={entriesError.ticketAble}
					errorText={entriesError.errorText}
					executeFunction={() => entries.refetch()}
					loading={entries.isFetching}
				/>
			) : !entries.error && !!entries.data ? (
				<DataTable
					caption="لاگ تغییرات"
					columns={columns}
					rows={entries.data.items}
					rowKey={(e) => e.id}
					loading={entries.isFetching}
					empty={<TableEmpty icon="receipt" title="ردیفی پیدا نشد" text={filtered ? "فیلترها را کم کن؛ ردیف‌های قدیمی‌تر از ۹۰ روز پاک شده‌اند." : undefined} />}
					footer={<TableFooter meta={entries.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={entries.isFetching} />}
				/>
			) : null}
		</>
	);
}
