"use client";

import { useState } from "react";
import classNames from "classnames";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import ConfirmModal from "@/app/_components/panel/confirmModal/confirmModal";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { toast } from "@/store/notification.store";
import { Banner, BannerPlacement } from "@/types/marketing.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { BANNER_PLACEMENT, BANNER_THEME, labelOf, optionsOf } from "@/utils/labels";
import { PERIOD_LABEL, PERIOD_TONE, periodState, periodText } from "@/utils/period";
import { withMappedError } from "@/utils/withMappedError";
import { BannersEndpoints } from "../../_api/bannersEndpoints";
import BannerModal, { THEME_STYLE } from "../bannerModal/bannerModal";

/** `/banners` — promo banners per placement (home hero/promo, shop top, product sidebar, blog top). */
export default function BannersView() {
	const queryClient = useQueryClient();
	const [f, setF] = useUrlFilters({ placement: "" });
	const [editing, setEditing] = useState<{ banner: Banner | null } | null>(null);
	const [removing, setRemoving] = useState<Banner | null>(null);

	const banners = useQuery({
		queryKey: ["banners", "list"],
		queryFn: () => withMappedError(() => BannersEndpoints.getBanners()),
		meta: { showNotificationOnRefetch: true },
	});

	const remove = useMutation({
		mutationFn: (b: Banner) => withMappedError(() => BannersEndpoints.remove(b.id)),
		meta: { showNotification: true },
		onSuccess: () => {
			toast("بنر حذف شد", { icon: "check" });
			setRemoving(null);
			queryClient.invalidateQueries({ queryKey: ["banners"] });
		},
	});

	const rows = (banners.data ?? []).filter((b) => !f.placement || b.placement === f.placement);
	const countOf = (p: string) => (banners.data ?? []).filter((b) => b.placement === p).length;

	const columns: Column<Banner>[] = [
		{
			key: "banner",
			title: "بنر",
			render: (b) => (
				<span className="cell-prod" style={{ minWidth: 240 }}>
					<span className="th-img" style={THEME_STYLE[b.theme]}>
						{/* eslint-disable-next-line @next/next/no-img-element -- media URL */}
						{b.image && <img src={b.image.thumbnailUrl || b.image.url} alt="" style={{ objectFit: "cover" }} />}
					</span>
					<span>
						<b style={{ whiteSpace: "pre-line" }}>{b.title}</b>
						<span className="sub">{b.cta.label ? `${b.cta.label} ← ${b.cta.url}` : "بدون دکمه"}</span>
					</span>
				</span>
			),
		},
		{ key: "placement", title: "جایگاه", className: "nowrap", render: (b) => labelOf(BANNER_PLACEMENT, b.placement) },
		{
			key: "theme",
			title: "تم",
			className: "nowrap",
			render: (b) => (
				<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
					<span className="swatch-dot" style={{ background: THEME_STYLE[b.theme].background }} />
					{labelOf(BANNER_THEME, b.theme)}
				</span>
			),
		},
		{ key: "order", title: "ترتیب", className: "nowrap", render: (b) => toPersianDigits(b.sortOrder) },
		{
			key: "period",
			title: "نمایش",
			render: (b) => {
				const state = periodState(b.startsAt, b.endsAt);
				return (
					<>
						<Badge tone={PERIOD_TONE[state]}>{PERIOD_LABEL[state]}</Badge>
						{state !== "always" && <span className="sub">{periodText(b.startsAt, b.endsAt)}</span>}
					</>
				);
			},
		},
		{
			key: "acts",
			title: "",
			className: "end",
			render: (b) => (
				<span className="row-acts">
					<button type="button" className="icon-btn" aria-label="ویرایش" title="ویرایش" onClick={() => setEditing({ banner: b })}>
						<Icon name="edit" />
					</button>
					<button type="button" className="icon-btn del" aria-label="حذف" title="حذف" onClick={() => setRemoving(b)}>
						<Icon name="trash" />
					</button>
				</span>
			),
		},
	];

	const bannersError = toErrorView(ERROR_BEHAVIOUR, banners.error, "دریافت بنرها با خطا مواجه شد.");

	return (
		<>
			<PageHead
				title="بنرها"
				subtitle="بنرهای تبلیغاتی هر جایگاه به ترتیب؛ بنر بیرون از بازه‌ی نمایش در سایت دیده نمی‌شود."
				actions={
					<Button size="sm" onClick={() => setEditing({ banner: null })} iconStart={<Icon name="plus" />}>
						بنر جدید
					</Button>
				}
			/>
			<p className="note cream" style={{ marginBottom: 14 }}>
				فروشگاه فعلاً بنرهای صفحه‌ی اصلی را از محتوای ثابت خودش می‌خواند (FEATURES §۶)؛ تغییر بنرها تا وقتی فرانت به `GET /banners` وصل نشده در سایت دیده نمی‌شود.
			</p>
			<div className="tabs bo-tabs" role="tablist">
				{[{ value: "", label: "همه" }, ...optionsOf(BANNER_PLACEMENT)].map((t) => (
					<button key={t.value || "all"} type="button" role="tab" aria-selected={f.placement === t.value} className={classNames({ on: f.placement === t.value })} onClick={() => setF({ placement: t.value })}>
						{t.label}
						{t.value && !!countOf(t.value) && <span className="cnt">{toPersianDigits(countOf(t.value))}</span>}
					</button>
				))}
			</div>
			{banners.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!bannersError ? (
				<ErrorComponent retryable={bannersError.retryable} ticketAble={bannersError.ticketAble} errorText={bannersError.errorText} executeFunction={() => banners.refetch()} loading={banners.isFetching} />
			) : !banners.error && !!banners.data ? (
				<DataTable caption="بنرها" columns={columns} rows={rows} rowKey={(b) => b.id} loading={banners.isFetching} empty={<TableEmpty icon="image" title="بنری در این جایگاه نیست" />} />
			) : null}

			<BannerModal
				key={editing?.banner?.id ?? "new"}
				banner={editing?.banner ?? null}
				placement={(f.placement || undefined) as BannerPlacement | undefined}
				open={!!editing}
				onClose={() => setEditing(null)}
			/>
			<ConfirmModal
				open={!!removing}
				onClose={() => setRemoving(null)}
				tone="danger"
				icon="trash"
				title="حذف بنر"
				text={removing ? `بنر «${removing.title.replace(/\n/g, " ")}» حذف شود؟` : undefined}
				confirmLabel="حذف"
				loading={remove.isPending}
				onConfirm={() => removing && remove.mutate(removing)}
			/>
		</>
	);
}
