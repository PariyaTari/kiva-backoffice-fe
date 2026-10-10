"use client";

import { useState } from "react";
import classNames from "classnames";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { AdminContactMessage, ContactTopic, TicketStatus } from "@/types/support.type";
import { toErrorView } from "@/utils/apiError";
import { formatDateTime, formatPhone, relativeTime } from "@/utils/format";
import { CONTACT_TOPIC, labelOf, optionsOf, TICKET_STATUS, TICKET_STATUS_TONE } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ContactEndpoints } from "../../_api/contactEndpoints";
import TicketModal from "../ticketModal/ticketModal";

const TABS: { value: TicketStatus | ""; label: string }[] = [
	{ value: "OPEN", label: "باز" },
	{ value: "IN_PROGRESS", label: "در حال پیگیری" },
	{ value: "CLOSED", label: "بسته" },
	{ value: "", label: "همه" },
];

const COLUMNS: Column<AdminContactMessage>[] = [
	{
		key: "code",
		title: "کد",
		className: "nowrap",
		render: (t) => (
			<>
				<span className="code">{t.ticketCode}</span>
				<span className="sub">{relativeTime(t.createdAt)}</span>
			</>
		),
	},
	{ key: "topic", title: "موضوع", className: "nowrap", render: (t) => labelOf(CONTACT_TOPIC, t.topic) },
	{
		key: "from",
		title: "فرستنده",
		className: "nowrap",
		render: (t) => (
			<>
				{t.fullName}
				<span className="sub ltr">{formatPhone(t.phone)}</span>
			</>
		),
	},
	{
		key: "message",
		title: "پیام",
		render: (t) => (
			<span style={{ display: "block", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.message}>
				{t.message}
				{t.orderCode && <span className="sub ltr">{t.orderCode}</span>}
			</span>
		),
	},
	{
		key: "status",
		title: "وضعیت",
		className: "nowrap",
		render: (t) => (
			<>
				<StatusTag value={t.status} labels={TICKET_STATUS} tones={TICKET_STATUS_TONE} />
				{t.reply && <span className="sub">پاسخ داده شده</span>}
			</>
		),
	},
	{ key: "updated", title: "آخرین تغییر", className: "nowrap muted", render: (t) => formatDateTime(t.updatedAt) },
];

/** `/contact-messages` — the contact form's tickets (`CT-…`): read, reply by SMS / email, note, close. */
export default function ContactView() {
	const [f, setF] = useUrlFilters({ status: "OPEN", topic: "" });
	const status = f.status as TicketStatus | "";
	const topic = f.topic as ContactTopic | "";
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [status, topic] });
	const [open, setOpen] = useState<AdminContactMessage | null>(null);

	const messages = useQuery({
		queryKey: ["contact", "list", { status, topic, page, pageSize }],
		queryFn: () => withMappedError(() => ContactEndpoints.getMessages(status, topic, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const messagesError = toErrorView(ERROR_BEHAVIOUR, messages.error, "دریافت پیام‌ها با خطا مواجه شد.");

	return (
		<>
			<PageHead title="پیام‌های تماس" subtitle="پیام‌های فرم «تماس با ما»؛ پاسخ با پیامک یا ایمیل برای مشتری می‌رود." />
			<div className="fbar">
				<select className="select" aria-label="موضوع" value={f.topic} onChange={(e) => setF({ topic: e.target.value })}>
					<option value="">همه‌ی موضوع‌ها</option>
					{optionsOf(CONTACT_TOPIC).map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
			</div>
			<div className="tabs bo-tabs" role="tablist">
				{TABS.map((t) => (
					<button key={t.value || "all"} type="button" role="tab" aria-selected={status === t.value} className={classNames({ on: status === t.value })} onClick={() => setF({ status: t.value })}>
						{t.label}
					</button>
				))}
			</div>
			{messages.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!messagesError ? (
				<ErrorComponent
					retryable={messagesError.retryable}
					ticketAble={messagesError.ticketAble}
					errorText={messagesError.errorText}
					executeFunction={() => messages.refetch()}
					loading={messages.isFetching}
				/>
			) : !messages.error && !!messages.data ? (
				<DataTable
					caption="پیام‌های تماس"
					columns={COLUMNS}
					rows={messages.data.items}
					rowKey={(t) => t.ticketCode}
					onRowClick={setOpen}
					loading={messages.isFetching}
					empty={<TableEmpty icon="chat" title={status === "OPEN" ? "پیام بازی نیست" : "پیامی پیدا نشد"} />}
					footer={<TableFooter meta={messages.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={messages.isFetching} />}
				/>
			) : null}
			<TicketModal ticket={open} onClose={() => setOpen(null)} />
		</>
	);
}
