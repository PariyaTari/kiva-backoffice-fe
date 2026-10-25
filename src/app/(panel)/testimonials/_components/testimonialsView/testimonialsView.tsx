"use client";

import { useState } from "react";
import classNames from "classnames";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import { MessengerIcon } from "@/app/_components/icon/messengerIcon";
import ConfirmModal from "@/app/_components/panel/confirmModal/confirmModal";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { toast } from "@/store/notification.store";
import { AdminTestimonial } from "@/types/marketing.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatDate } from "@/utils/format";
import { withMappedError } from "@/utils/withMappedError";
import { TestimonialsEndpoints } from "../../_api/testimonialsEndpoints";
import TestimonialModal from "../testimonialModal/testimonialModal";

const TABS = [
	{ key: "all", label: "همه", published: null },
	{ key: "published", label: "منتشرشده", published: true },
	{ key: "hidden", label: "منتشرنشده", published: false },
] as const;

/** `/testimonials` — the messages of «مشتری‌ها چی می‌گن», published or not, by their order on the site then newest. */
export default function TestimonialsView() {
	const queryClient = useQueryClient();
	const [f, setF] = useUrlFilters({ tab: "all" });
	const tab = TABS.find((t) => t.key === f.tab) ?? TABS[0];
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [tab.key] });
	const [editing, setEditing] = useState<{ testimonial: AdminTestimonial | null } | null>(null);
	const [removing, setRemoving] = useState<AdminTestimonial | null>(null);

	const list = useQuery({
		queryKey: ["testimonials", "list", { published: tab.published, page, pageSize }],
		queryFn: () => withMappedError(() => TestimonialsEndpoints.getTestimonials(tab.published, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const remove = useMutation({
		mutationFn: (t: AdminTestimonial) => withMappedError(() => TestimonialsEndpoints.remove(t.id)),
		meta: { showNotification: true },
		onSuccess: () => {
			toast("پیام رضایت حذف شد", { icon: "check" });
			setRemoving(null);
			queryClient.invalidateQueries({ queryKey: ["testimonials"] });
		},
	});

	const columns: Column<AdminTestimonial>[] = [
		{
			key: "who",
			title: "مشتری",
			className: "nowrap",
			render: (t) => (
				<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
					<MessengerIcon channel={t.source} width={22} height={22} />
					<span>
						<b>{t.customerName}</b>
						{t.city && <span className="sub">{t.city}</span>}
					</span>
				</span>
			),
		},
		{ key: "message", title: "پیام", render: (t) => <span style={{ display: "block", maxWidth: 420 }}>«{t.message}»</span> },
		{
			key: "product",
			title: "کیف",
			render: (t) => (
				<>
					{t.product?.name ?? "—"}
					{t.color && (
						<span className="sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>
							<span className="swatch-dot" style={{ background: t.color.hex }} />
							{t.color.name}
						</span>
					)}
				</>
			),
		},
		{ key: "rating", title: "امتیاز", className: "nowrap", render: (t) => `${toPersianDigits(t.rating)} از ۵` },
		{
			key: "state",
			title: "سایت",
			className: "nowrap",
			render: (t) => (
				<>
					{t.isPublished ? <Badge tone="SUCCESS">منتشرشده</Badge> : <Badge>منتشرنشده</Badge>}
					<span className="sub">ترتیب {toPersianDigits(t.sortOrder)}</span>
				</>
			),
		},
		{
			key: "at",
			title: "دریافت",
			className: "nowrap muted",
			render: (t) => [t.receivedAt && formatDate(t.receivedAt), t.messageTime && toPersianDigits(t.messageTime)].filter(Boolean).join(" · ") || "—",
		},
		{
			key: "acts",
			title: "",
			className: "end",
			render: (t) => (
				<span className="row-acts">
					<button type="button" className="icon-btn" aria-label="ویرایش" title="ویرایش" onClick={() => setEditing({ testimonial: t })}>
						<Icon name="edit" />
					</button>
					<button type="button" className="icon-btn del" aria-label="حذف" title="حذف" onClick={() => setRemoving(t)}>
						<Icon name="trash" />
					</button>
				</span>
			),
		},
	];

	const listError = toErrorView(ERROR_BEHAVIOUR, list.error, "دریافت پیام‌های رضایت با خطا مواجه شد.");

	return (
		<>
			<PageHead
				title="پیام‌های رضایت"
				subtitle="پیام‌های واقعی مشتری‌ها از پیام‌رسان‌ها برای «مشتری‌ها چی می‌گن» صفحه‌ی اصلی."
				actions={
					<Button size="sm" onClick={() => setEditing({ testimonial: null })} iconStart={<Icon name="plus" />}>
						پیام جدید
					</Button>
				}
			/>
			<div className="tabs bo-tabs" role="tablist">
				{TABS.map((t) => (
					<button key={t.key} type="button" role="tab" aria-selected={t.key === tab.key} className={classNames({ on: t.key === tab.key })} onClick={() => setF({ tab: t.key })}>
						{t.label}
					</button>
				))}
			</div>
			{list.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!listError ? (
				<ErrorComponent retryable={listError.retryable} ticketAble={listError.ticketAble} errorText={listError.errorText} executeFunction={() => list.refetch()} loading={list.isFetching} />
			) : !list.error && !!list.data ? (
				<DataTable
					caption="پیام‌های رضایت"
					columns={columns}
					rows={list.data.items}
					rowKey={(t) => t.id}
					loading={list.isFetching}
					empty={<TableEmpty icon="smile" title={tab.published === false ? "پیام منتشرنشده‌ای نیست" : "پیامی نیست"} />}
					footer={<TableFooter meta={list.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={list.isFetching} />}
				/>
			) : null}

			<TestimonialModal key={editing?.testimonial?.id ?? "new"} testimonial={editing?.testimonial ?? null} open={!!editing} onClose={() => setEditing(null)} />
			<ConfirmModal
				open={!!removing}
				onClose={() => setRemoving(null)}
				tone="danger"
				icon="trash"
				title="حذف پیام رضایت"
				text={removing ? `پیام ${removing.customerName}${removing.city ? ` از ${removing.city}` : ""} حذف شود؟` : undefined}
				confirmLabel="حذف"
				loading={remove.isPending}
				onConfirm={() => removing && remove.mutate(removing)}
			/>
		</>
	);
}
