"use client";

import classNames from "classnames";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import SearchInput from "@/app/_components/panel/searchInput/searchInput";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import Button from "@/app/_components/ui/button/button";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { toast } from "@/store/notification.store";
import { NewsletterFilters, NewsletterStatus, NewsletterSubscription } from "@/types/marketing.type";
import { toErrorView } from "@/utils/apiError";
import { downloadCsv } from "@/utils/csv";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime } from "@/utils/format";
import { labelOf, NEWSLETTER_STATUS, NEWSLETTER_STATUS_TONE } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { NewsletterEndpoints } from "../../_api/newsletterEndpoints";

const TABS: { value: NewsletterStatus | ""; label: string }[] = [
	{ value: "ACTIVE", label: "عضو" },
	{ value: "UNSUBSCRIBED", label: "لغو شده" },
	{ value: "", label: "همه" },
];

const COLUMNS: Column<NewsletterSubscription>[] = [
	{ key: "email", title: "ایمیل", render: (s) => <b className="ltr">{s.email}</b> },
	{ key: "status", title: "وضعیت", className: "nowrap", render: (s) => <StatusTag value={s.status} labels={NEWSLETTER_STATUS} tones={NEWSLETTER_STATUS_TONE} /> },
	{ key: "source", title: "از کجا", className: "nowrap", render: (s) => (s.source ? <span className="ltr">{s.source}</span> : <span className="muted">—</span>) },
	{ key: "subscribed", title: "عضویت", className: "nowrap", render: (s) => formatDateTime(s.subscribedAt) },
	{ key: "unsubscribed", title: "لغو", className: "nowrap muted", render: (s) => formatDateTime(s.unsubscribedAt) },
];

/** The CSV export reads the filtered list page by page — up to this many rows. */
const EXPORT_PAGE = 100;
const EXPORT_MAX = 5000;

/**
 * `/newsletter` (ADMIN) — who receives the e-mail newsletter: the active count, search by e-mail, CSV for the outside
 * mailing tool. Unsubscribed addresses are deleted 90 days later.
 */
export default function NewsletterView() {
	const [f, setF] = useUrlFilters({ status: "ACTIVE", q: "" });
	const filters: NewsletterFilters = { status: (f.status || undefined) as NewsletterStatus | undefined, q: f.q || undefined };
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [filters] });

	const subscriptions = useQuery({
		queryKey: ["newsletter", "list", { filters, page, pageSize }],
		queryFn: () => withMappedError(() => NewsletterEndpoints.getSubscriptions(filters, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});
	// «n مشترک فعال» = `meta.totalItems` with `status=ACTIVE` (contract); a failed count just isn't shown
	const activeCount = useQuery({
		queryKey: ["newsletter", "activeCount"],
		queryFn: () => withMappedError(() => NewsletterEndpoints.getSubscriptions({ status: "ACTIVE" }, 1, 1)),
		select: (d) => d.meta.totalItems,
	});

	// «خروجی CSV» — the whole filtered list (not only this page), read page by page
	const exportCsv = useMutation({
		mutationFn: () =>
			withMappedError(async () => {
				const rows: NewsletterSubscription[] = [];
				for (let p = 1; rows.length < EXPORT_MAX; p += 1) {
					const res = await NewsletterEndpoints.getSubscriptions(filters, p, EXPORT_PAGE);
					rows.push(...res.items);
					if (!res.meta.hasNext) break;
				}
				return rows.slice(0, EXPORT_MAX);
			}),
		meta: { showNotification: true },
		onSuccess: (rows) => {
			downloadCsv(
				`kiva-newsletter-${new Date().toISOString().slice(0, 10)}.csv`,
				["ایمیل", "وضعیت", "از کجا", "عضویت", "لغو"],
				rows.map((s) => [s.email, labelOf(NEWSLETTER_STATUS, s.status), s.source, formatDateTime(s.subscribedAt), s.unsubscribedAt ? formatDateTime(s.unsubscribedAt) : ""]),
			);
			toast(rows.length >= EXPORT_MAX ? `فقط ${toPersianDigits(EXPORT_MAX)} ردیف اول در فایل آمد؛ فیلتر را محدودتر کن.` : `${toPersianDigits(rows.length)} ایمیل در فایل CSV`, { icon: "download" });
		},
	});

	const subscriptionsError = toErrorView(ERROR_BEHAVIOUR, subscriptions.error, "دریافت مشترکین خبرنامه با خطا مواجه شد.");

	return (
		<>
			<PageHead
				title="مشترکین خبرنامه"
				subtitle={
					activeCount.data != null
						? `${toPersianDigits(activeCount.data)} مشترک فعال. فرستادن خبرنامه با ابزار بیرونی است؛ این‌جا فهرست و خروجی آن است. لغوشده‌ها ۹۰ روز بعد پاک می‌شوند.`
						: "فرستادن خبرنامه با ابزار بیرونی است؛ این‌جا فهرست و خروجی آن است. لغوشده‌ها ۹۰ روز بعد پاک می‌شوند."
				}
			/>
			<div className="fbar">
				<SearchInput value={f.q} onSearch={(q) => setF({ q: q.trim().toLowerCase() })} placeholder="بخشی از ایمیل" />
				<Button
					size="sm"
					variant="white"
					className="fbar-end"
					iconStart={<Icon name="download" />}
					isLoading={exportCsv.isPending}
					disabled={!subscriptions.data?.meta.totalItems}
					onClick={() => exportCsv.mutate()}
				>
					خروجی CSV
				</Button>
			</div>
			<div className="tabs bo-tabs" role="tablist">
				{TABS.map((t) => (
					<button key={t.value || "all"} type="button" role="tab" aria-selected={f.status === t.value} className={classNames({ on: f.status === t.value })} onClick={() => setF({ status: t.value })}>
						{t.label}
						{t.value === "ACTIVE" && !!activeCount.data && <span className="cnt">{toPersianDigits(activeCount.data)}</span>}
					</button>
				))}
			</div>

			{subscriptions.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!subscriptionsError ? (
				<ErrorComponent
					retryable={subscriptionsError.retryable}
					ticketAble={subscriptionsError.ticketAble}
					errorText={subscriptionsError.errorText}
					executeFunction={() => subscriptions.refetch()}
					loading={subscriptions.isFetching}
				/>
			) : !subscriptions.error && !!subscriptions.data ? (
				<DataTable
					caption="مشترکین خبرنامه"
					columns={COLUMNS}
					rows={subscriptions.data.items}
					rowKey={(s) => s.id}
					loading={subscriptions.isFetching}
					empty={<TableEmpty icon="mail" title={f.q ? "ایمیلی با این عبارت نیست" : "مشترکی نیست"} />}
					footer={<TableFooter meta={subscriptions.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={subscriptions.isFetching} />}
				/>
			) : null}
		</>
	);
}
