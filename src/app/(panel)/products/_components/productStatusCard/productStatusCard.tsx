"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/app/_components/icon/icons";
import ConfirmModal from "@/app/_components/panel/confirmModal/confirmModal";
import JalaliDateTimeInput from "@/app/_components/panel/jalaliDateTimeInput/jalaliDateTimeInput";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import Button from "@/app/_components/ui/button/button";
import { STORE_URL } from "@/config/global";
import { toast } from "@/store/notification.store";
import { AdminProduct, ProductStatus } from "@/types/catalog.type";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime } from "@/utils/format";
import { PRODUCT_STATUS, PRODUCT_STATUS_TONE } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ProductsEndpoints } from "../../_api/productsEndpoints";

const DONE: Record<ProductStatus, string> = { ACTIVE: "محصول منتشر شد", DRAFT: "محصول پیش‌نویس شد", ARCHIVED: "محصول آرشیو شد" };

/**
 * Publication of a product (`PATCH …/status`): publish now or at a time, back to draft, archive. Only «منتشرشده»
 * shows on the storefront. Plus the panel's numbers for it (views, conversion, sales).
 */
export default function ProductStatusCard({ product }: { product: AdminProduct }) {
	const queryClient = useQueryClient();
	const [confirmArchive, setConfirmArchive] = useState(false);
	const [scheduling, setScheduling] = useState(false);
	const [publishAt, setPublishAt] = useState<string | null>(null);

	const change = useMutation({
		mutationFn: ({ status, at }: { status: ProductStatus; at?: string | null }) => withMappedError(() => ProductsEndpoints.setStatus(product.id, status, at ?? null)),
		meta: { showNotification: true },
		onSuccess: (res, { at }) => {
			toast(at ? `انتشار برای ${formatDateTime(at)} زمان‌بندی شد` : DONE[res.status], { icon: "check" });
			setConfirmArchive(false);
			setScheduling(false);
			queryClient.invalidateQueries({ queryKey: ["products"] });
		},
	});
	const busy = change.isPending;

	return (
		<section className="icard">
			<h3>
				<Icon name="eye" /> انتشار
			</h3>
			<div className="stack" style={{ gap: 12 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
					<StatusTag value={product.status} labels={PRODUCT_STATUS} tones={PRODUCT_STATUS_TONE} />
					{product.publishAt && product.status !== "ACTIVE" && <span className="tag tag-cream">انتشار {formatDateTime(product.publishAt)}</span>}
				</div>
				<p className="muted" style={{ fontSize: 12.5 }}>
					{product.status === "ACTIVE" ? `در سایت از ${formatDateTime(product.publishedAt)}` : product.status === "DRAFT" ? "در سایت دیده نمی‌شود." : "آرشیو شده؛ سفارش‌های قبلی سالم‌اند."}
				</p>

				{product.status === "DRAFT" &&
					(scheduling ? (
						<div className="stack" style={{ gap: 8 }}>
							<JalaliDateTimeInput value={publishAt} onChange={setPublishAt} ariaLabel="زمان انتشار" />
							<div style={{ display: "flex", gap: 6 }}>
								<Button size="sm" disabled={!publishAt} isLoading={busy} onClick={() => change.mutate({ status: "ACTIVE", at: publishAt })}>
									ثبت زمان
								</Button>
								<Button size="sm" variant="white" onClick={() => setScheduling(false)}>
									انصراف
								</Button>
							</div>
						</div>
					) : (
						<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
							<Button size="sm" isLoading={busy} onClick={() => change.mutate({ status: "ACTIVE" })} iconStart={<Icon name="send" />}>
								انتشار
							</Button>
							<Button size="sm" variant="white" onClick={() => setScheduling(true)} iconStart={<Icon name="cal" />}>
								زمان‌بندی
							</Button>
						</div>
					))}
				{product.status === "ACTIVE" && (
					<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
						<Button size="sm" variant="white" isLoading={busy} onClick={() => change.mutate({ status: "DRAFT" })}>
							برگرداندن به پیش‌نویس
						</Button>
						<Button size="sm" variant="white" href={`${STORE_URL}/product/${product.slug}`} target="_blank" rel="noreferrer" iconStart={<Icon name="external" />}>
							در سایت
						</Button>
					</div>
				)}
				{product.status === "ARCHIVED" ? (
					<Button size="sm" variant="white" isLoading={busy} onClick={() => change.mutate({ status: "DRAFT" })}>
						بازگردانی به پیش‌نویس
					</Button>
				) : (
					<button type="button" className="btn btn-link" style={{ color: "var(--danger)", justifySelf: "start" }} onClick={() => setConfirmArchive(true)}>
						<Icon name="trash" /> آرشیو محصول
					</button>
				)}

				<div className="divider" style={{ margin: "4px 0" }} />
				<dl className="kv">
					<dt>بازدید</dt>
					<dd>{toPersianDigits(product.viewsCount)}</dd>
					<dt>نرخ تبدیل</dt>
					<dd>{toPersianDigits(product.conversionRate)}٪</dd>
					<dt>فروش</dt>
					<dd>{toPersianDigits(product.soldCount ?? 0)}</dd>
					<dt>امتیاز</dt>
					<dd>{product.rating?.count ? `${toPersianDigits(product.rating.average.toFixed(1))} از ${toPersianDigits(product.rating.count)} نظر` : "—"}</dd>
					<dt>ساخته</dt>
					<dd>
						{formatDateTime(product.createdAt)}
						<span className="muted"> · {product.createdBy}</span>
					</dd>
				</dl>
			</div>

			<ConfirmModal
				open={confirmArchive}
				onClose={() => setConfirmArchive(false)}
				tone="danger"
				icon="trash"
				title="آرشیو محصول"
				text={`«${product.name}» از سایت برداشته می‌شود؛ سفارش‌های قبلی سالم می‌مانند و هر وقت خواستی برمی‌گردد.`}
				confirmLabel="آرشیو کن"
				loading={busy}
				onConfirm={() => change.mutate({ status: "ARCHIVED" })}
			/>
		</section>
	);
}
