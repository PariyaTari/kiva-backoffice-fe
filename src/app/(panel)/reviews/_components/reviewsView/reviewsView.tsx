"use client";

import { useState } from "react";
import Link from "next/link";
import classNames from "classnames";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import ConfirmModal from "@/app/_components/panel/confirmModal/confirmModal";
import { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import TableFooter from "@/app/_components/panel/pager/pager";
import ProductPicker from "@/app/_components/panel/productPicker/productPicker";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import { useCan } from "@/hooks/useCan";
import { useTableState } from "@/hooks/useTableState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { toast } from "@/store/notification.store";
import { AdminReview, ReviewFilters, ReviewStatus } from "@/types/support.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime } from "@/utils/format";
import { REVIEW_STATUS, REVIEW_STATUS_TONE } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ReviewsEndpoints } from "../../_api/reviewsEndpoints";
import ReviewModals, { ReviewAction } from "../reviewModals/reviewModals";

const TABS: { value: ReviewStatus | ""; label: string }[] = [
	{ value: "PENDING", label: "در انتظار تأیید" },
	{ value: "APPROVED", label: "تأیید شده" },
	{ value: "REJECTED", label: "رد شده" },
	{ value: "", label: "همه" },
];

function Stars({ rating }: { rating: number }) {
	return (
		<span className="stars" aria-label={`${toPersianDigits(rating)} از ۵`}>
			{[1, 2, 3, 4, 5].map((n) => (
				<Icon key={n} name="star" className={n > rating ? "off" : undefined} fill={n <= rating ? "currentColor" : "none"} />
			))}
		</span>
	);
}

/** `/reviews` — the moderation queue (FEATURES §3.10): approve or reject, and «پاسخ کیوا» under each review. */
export default function ReviewsView() {
	const queryClient = useQueryClient();
	const can = useCan();
	const [f, setF] = useUrlFilters({ status: "PENDING", reply: "", product: "" });
	const filters: ReviewFilters = {
		status: (f.status || undefined) as ReviewStatus | undefined,
		hasReply: f.reply === "" ? undefined : f.reply === "true",
		productId: f.product ? Number(f.product) : undefined,
	};
	const { page, setPage, pageSize, setPageSize } = useTableState({ resetPageOn: [filters] });
	const [action, setAction] = useState<ReviewAction>(null);
	const [unreplying, setUnreplying] = useState<AdminReview | null>(null);

	const reviews = useQuery({
		queryKey: ["reviews", "list", { filters, page, pageSize }],
		queryFn: () => withMappedError(() => ReviewsEndpoints.getReviews(filters, page, pageSize)),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const removeReply = useMutation({
		mutationFn: (r: AdminReview) => withMappedError(() => ReviewsEndpoints.removeReply(r.id)),
		meta: { showNotification: true },
		onSuccess: () => {
			toast("پاسخ حذف شد", { icon: "check" });
			setUnreplying(null);
			queryClient.invalidateQueries({ queryKey: ["reviews"] });
		},
	});

	const reviewsError = toErrorView(ERROR_BEHAVIOUR, reviews.error, "دریافت نظرات با خطا مواجه شد.");

	return (
		<>
			<PageHead title="نظرات" subtitle="نظر مشتری تا تأیید نشود فقط برای خودش دیده می‌شود. تگ «خریدار» یعنی نظر به یک خرید وصل است." />
			<div className="fbar">
				<div style={{ minWidth: 260, flex: 1 }}>
					<ProductPicker single value={filters.productId ? [filters.productId] : []} onChange={(ids) => setF({ product: ids[0] ? String(ids[0]) : "" })} placeholder="فیلتر محصول…" />
				</div>
				<select className="select" aria-label="پاسخ" value={f.reply} onChange={(e) => setF({ reply: e.target.value })}>
					<option value="">با و بی پاسخ</option>
					<option value="false">بی پاسخ</option>
					<option value="true">پاسخ داده شده</option>
				</select>
			</div>
			<div className="tabs bo-tabs" role="tablist" style={{ borderRadius: "var(--r-lg)", borderBottom: "1px solid var(--line)", marginBottom: 14 }}>
				{TABS.map((t) => (
					<button key={t.value || "all"} type="button" role="tab" aria-selected={f.status === t.value} className={classNames({ on: f.status === t.value })} onClick={() => setF({ status: t.value })}>
						{t.label}
						{t.value === "PENDING" && !!reviews.data?.pendingCount && <span className="cnt">{toPersianDigits(reviews.data.pendingCount)}</span>}
					</button>
				))}
			</div>

			{reviews.isLoading ? (
				<Loading />
			) : !!reviewsError ? (
				<ErrorComponent retryable={reviewsError.retryable} ticketAble={reviewsError.ticketAble} errorText={reviewsError.errorText} executeFunction={() => reviews.refetch()} loading={reviews.isFetching} />
			) : !reviews.error && !!reviews.data ? (
				<>
					<div className="stack" style={{ opacity: reviews.isFetching ? 0.6 : 1, transition: "opacity .2s" }}>
						{reviews.data.items.map((r) => {
							const name = r.product?.name ?? `محصول #${toPersianDigits(r.productId)}`;
							const image = r.product?.imageUrl ?? null;
							return (
								<article key={r.id} className={classNames("rv", { pending: r.status === "PENDING" })}>
									<div className="h">
										<span className="th">
											{/* eslint-disable-next-line @next/next/no-img-element -- API image URL */}
											{image && <img src={image} alt="" />}
										</span>
										<span>
											<b>
												{can("support") ? (
												<Link href={`/customers/${r.customerId}`} title="صفحه‌ی مشتری">
													{r.authorName}
												</Link>
											) : (
												r.authorName
											)}{" "}
											{r.contact && <small className="ltr">· {r.contact}</small>}
											</b>
											<small>
												{can("catalog") ? <Link href={`/products/${r.productId}`}>{name}</Link> : name}
												{r.purchasedColor && ` · ${r.purchasedColor.name}`} · {formatDateTime(r.createdAt)}
											</small>
										</span>
										<span className="end">
											<Stars rating={r.rating} />
											{r.isVerifiedBuyer && <Badge tone="SUCCESS">خریدار</Badge>}
											<StatusTag value={r.status} labels={REVIEW_STATUS} tones={REVIEW_STATUS_TONE} />
										</span>
									</div>
									<p className="txt" style={{ whiteSpace: "pre-line" }}>
										{r.text}
									</p>
									{r.rejectionReason && <p className="note danger">دلیل رد: {r.rejectionReason}</p>}
									{r.reply && (
										<div className="reply">
											<b>پاسخ کیوا · {formatDateTime(r.reply.createdAt)}</b>
											{r.reply.text}
										</div>
									)}
									<div className="acts">
										{r.status !== "APPROVED" && (
											<Button size="sm" onClick={() => setAction({ review: r, kind: "approve" })} iconStart={<Icon name="check" />}>
												تأیید
											</Button>
										)}
										{r.status !== "REJECTED" && (
											<Button size="sm" variant="white" onClick={() => setAction({ review: r, kind: "reject" })} iconStart={<Icon name="ban" />}>
												رد
											</Button>
										)}
										{/* «پاسخ کیوا» only under an approved review (1.21.0: else `422 INVALID_STATUS_TRANSITION`) */}
										{r.status === "APPROVED" && (
											<Button size="sm" variant="soft" onClick={() => setAction({ review: r, kind: "reply" })} iconStart={<Icon name="chat" />}>
												{r.reply ? "ویرایش پاسخ" : "پاسخ"}
											</Button>
										)}
										{r.reply && (
											<Button size="sm" variant="link" onClick={() => setUnreplying(r)} style={{ color: "var(--danger)" }}>
												حذف پاسخ
											</Button>
										)}
										<span className="muted" style={{ marginInlineStart: "auto", fontSize: 12 }}>
											{toPersianDigits(r.helpfulCount)} نفر «به دردم خورد»
										</span>
									</div>
								</article>
							);
						})}
					</div>
					{!reviews.data.items.length && (
						<div className="tbl-wrap">
							<TableEmpty icon="star" title={f.status === "PENDING" ? "نظری منتظر تأیید نیست" : "نظری پیدا نشد"} />
						</div>
					)}
					<div className="tbl-wrap" style={{ marginTop: 12 }}>
						<TableFooter meta={reviews.data.meta} onPage={setPage} onPageSize={setPageSize} disabled={reviews.isFetching} />
					</div>
				</>
			) : null}

			<ReviewModals action={action} onClose={() => setAction(null)} />
			<ConfirmModal
				open={!!unreplying}
				onClose={() => setUnreplying(null)}
				tone="danger"
				icon="trash"
				title="حذف پاسخ کیوا"
				text="پاسخ زیر این نظر برداشته می‌شود."
				confirmLabel="حذف پاسخ"
				loading={removeReply.isPending}
				onConfirm={() => unreplying && removeReply.mutate(unreplying)}
			/>
		</>
	);
}
