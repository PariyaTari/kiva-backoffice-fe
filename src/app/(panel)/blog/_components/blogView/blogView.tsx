"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { BlogPostSummary } from "@/types/content.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatDate } from "@/utils/format";
import { BLOG_STATUS, BLOG_STATUS_TONE } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { BlogEndpoints } from "../../_api/blogEndpoints";

const COLUMNS: Column<BlogPostSummary>[] = [
	{
		key: "post",
		title: "مقاله",
		render: (p) => (
			<span className="cell-prod" style={{ minWidth: 260 }}>
				<span className="th-img" style={{ background: p.coverBackground ?? undefined }}>
					{/* eslint-disable-next-line @next/next/no-img-element -- media URL */}
					{p.cover && <img src={p.cover.thumbnailUrl || p.cover.url} alt="" />}
				</span>
				<span>
					<Link href={`/blog/${p.id}`} style={{ fontWeight: 700 }}>
						{p.title}
					</Link>
					<span className="sub ltr">/blog/{p.slug}</span>
				</span>
			</span>
		),
	},
	{ key: "category", title: "دسته", className: "nowrap", render: (p) => p.category?.name },
	{ key: "author", title: "نویسنده", className: "nowrap", render: (p) => p.author?.name ?? "—" },
	{ key: "minutes", title: "مطالعه", className: "nowrap", render: (p) => `${toPersianDigits(p.readingMinutes)} دقیقه` },
	{
		key: "status",
		title: "وضعیت",
		className: "nowrap",
		render: (p) => (
			<span style={{ display: "inline-flex", gap: 4 }}>
				<StatusTag value={p.status ?? "PUBLISHED"} labels={BLOG_STATUS} tones={BLOG_STATUS_TONE} />
				{p.isFeatured && <Badge tone="SALE">منتخب</Badge>}
			</span>
		),
	},
	{ key: "published", title: "انتشار", className: "nowrap muted", render: (p) => (p.publishedAt ? formatDate(p.publishedAt) : "—") },
];

/** `/blog` — the magazine's posts. Only published ones can be listed (FEATURES §7 #1); a new draft opens right after saving. */
export default function BlogView() {
	const router = useRouter();
	const [f, setF] = useUrlFilters({ q: "", category: "" });
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [f.q, f.category] });

	const posts = useQuery({
		queryKey: ["blog", "list", { q: f.q, category: f.category, page, pageSize }],
		queryFn: () => withMappedError(() => BlogEndpoints.getPosts(f.q, f.category, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});
	const categories = useQuery({
		queryKey: ["blog", "categories"],
		queryFn: () => withMappedError(() => BlogEndpoints.getCategories()),
		meta: { showNotification: true },
	});

	const postsError = toErrorView(ERROR_BEHAVIOUR, posts.error, "دریافت مقاله‌ها با خطا مواجه شد.");

	return (
		<>
			<PageHead
				title="بلاگ"
				subtitle="مقاله‌های مجله‌ی کیوا با بلوک‌های محتوا (تیتر، پاراگراف، نقل‌قول، نکته، کارت محصول، عکس، لیست)."
				actions={
					<Button href="/blog/new" size="sm" iconStart={<Icon name="plus" />}>
						مقاله‌ی جدید
					</Button>
				}
			/>
			<p className="note" style={{ marginBottom: 14 }}>
				فهرست ادمین در کانترکت نیست؛ این جدول از فهرست عمومی بلاگ است و پیش‌نویس‌ها و آرشیوها در آن دیده نمی‌شوند.
			</p>
			<div className="fbar">
				<SearchInput value={f.q} onSearch={(q) => setF({ q })} placeholder="عنوان یا خلاصه" />
				<select className="select" aria-label="دسته" value={f.category} onChange={(e) => setF({ category: e.target.value })}>
					<option value="">همه‌ی دسته‌ها</option>
					{categories.data?.map((c) => (
						<option key={c.id} value={c.slug}>
							{c.name}
						</option>
					))}
				</select>
			</div>
			{posts.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!postsError ? (
				<ErrorComponent retryable={postsError.retryable} ticketAble={postsError.ticketAble} errorText={postsError.errorText} executeFunction={() => posts.refetch()} loading={posts.isFetching} />
			) : !posts.error && !!posts.data ? (
				<DataTable
					caption="مقاله‌ها"
					columns={COLUMNS}
					rows={posts.data.items}
					rowKey={(p) => p.id}
					onRowClick={(p) => router.push(`/blog/${p.id}`)}
					loading={posts.isFetching}
					empty={<TableEmpty icon="feather" title="مقاله‌ای پیدا نشد" />}
					footer={<TableFooter meta={posts.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={posts.isFetching} />}
				/>
			) : null}
		</>
	);
}
