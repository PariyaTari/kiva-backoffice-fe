"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import ConfirmModal from "@/app/_components/panel/confirmModal/confirmModal";
import DataTable, { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import IconSelect from "@/app/_components/panel/iconSelect/iconSelect";
import JalaliDateTimeInput from "@/app/_components/panel/jalaliDateTimeInput/jalaliDateTimeInput";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import ProductPicker from "@/app/_components/panel/productPicker/productPicker";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import Switch from "@/app/_components/ui/switch/switch";
import { STORE_REFRESH_MINUTES } from "@/config/global";
import { toast } from "@/store/notification.store";
import { AdminCampaign, CampaignUpsertRequest } from "@/types/marketing.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { onSiteWithin } from "@/utils/format";
import { fieldErrorsWith } from "@/utils/fieldErrors";
import { PERIOD_LABEL, PERIOD_TONE, periodState, periodText } from "@/utils/period";
import { withMappedError } from "@/utils/withMappedError";
import { CampaignsEndpoints } from "../../_api/campaignsEndpoints";

const SLUG = /^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*$/;

/** `/campaigns` — the home page's sale section (title, countdown to `endsAt`, products). Only one runs at a time on the site. */
export default function CampaignsView() {
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<{ campaign: AdminCampaign | null } | null>(null);
	const [removing, setRemoving] = useState<AdminCampaign | null>(null);

	const campaigns = useQuery({
		queryKey: ["campaigns", "list"],
		queryFn: () => withMappedError(() => CampaignsEndpoints.getCampaigns()),
		meta: { showNotificationOnRefetch: true },
	});

	const remove = useMutation({
		mutationFn: (c: AdminCampaign) => withMappedError(() => CampaignsEndpoints.remove(c.id)),
		meta: { showNotification: true },
		onSuccess: (_, c) => {
			toast(`کمپین «${c.title}» حذف شد`, { icon: "check" });
			setRemoving(null);
			queryClient.invalidateQueries({ queryKey: ["campaigns"] });
		},
	});

	const columns: Column<AdminCampaign>[] = [
		{
			key: "title",
			title: "کمپین",
			render: (c) => (
				<span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
					<span className="si" style={{ width: 36, height: 36, borderRadius: 12, background: "var(--lilac-50)", color: "var(--purple)", display: "grid", placeItems: "center" }}>
						<Icon name={c.icon || "fire"} style={{ width: 18, height: 18 }} />
					</span>
					<span>
						<b>{c.title}</b>
						{c.subtitle && <span className="sub">{c.subtitle}</span>}
					</span>
				</span>
			),
		},
		{ key: "slug", title: "slug", className: "nowrap", render: (c) => <span className="code">{c.slug}</span> },
		{
			key: "period",
			title: "زمان",
			render: (c) => {
				const state = periodState(c.startsAt, c.endsAt);
				return (
					<>
						<Badge tone={PERIOD_TONE[state]}>{PERIOD_LABEL[state]}</Badge>
						<span className="sub">{periodText(c.startsAt, c.endsAt)}</span>
					</>
				);
			},
		},
		{
			key: "products",
			title: "محصولات",
			className: "nowrap",
			render: (c) => (c.productIds.length ? `${toPersianDigits(c.productIds.length)} محصول` : "همه‌ی تخفیف‌دارها"),
		},
		{ key: "active", title: "فعال", className: "nowrap", render: (c) => (c.isActive ? <Badge tone="SUCCESS">فعال</Badge> : <Badge>غیرفعال</Badge>) },
		{
			key: "acts",
			title: "",
			className: "end",
			render: (c) => (
				<span className="row-acts">
					<button type="button" className="icon-btn" aria-label="ویرایش" title="ویرایش" onClick={() => setEditing({ campaign: c })}>
						<Icon name="edit" />
					</button>
					<button type="button" className="icon-btn del" aria-label="حذف" title="حذف" onClick={() => setRemoving(c)}>
						<Icon name="trash" />
					</button>
				</span>
			),
		},
	];

	const campaignsError = toErrorView(ERROR_BEHAVIOUR, campaigns.error, "دریافت کمپین‌ها با خطا مواجه شد.");

	return (
		<>
			<PageHead
				title="کمپین‌ها"
				subtitle="جشنواره‌ی حراج صفحه‌ی اصلی با شمارش معکوس؛ بدون محصول انتخابی، همه‌ی محصولات تخفیف‌دار نشان داده می‌شوند."
				actions={
					<Button size="sm" onClick={() => setEditing({ campaign: null })} iconStart={<Icon name="plus" />}>
						کمپین جدید
					</Button>
				}
			/>
			{campaigns.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!campaignsError ? (
				<ErrorComponent
					retryable={campaignsError.retryable}
					ticketAble={campaignsError.ticketAble}
					errorText={campaignsError.errorText}
					executeFunction={() => campaigns.refetch()}
					loading={campaigns.isFetching}
				/>
			) : !campaigns.error && !!campaigns.data ? (
				<DataTable caption="کمپین‌ها" columns={columns} rows={campaigns.data} rowKey={(c) => c.id} loading={campaigns.isFetching} empty={<TableEmpty icon="fire" title="کمپینی نیست" />} />
			) : null}
			<p className="note" style={{ marginTop: 14 }}>
				کمپین فقط نمایشی است و هیچ قیمتی را عوض نمی‌کند (تخفیف هر محصول همان قیمت قبل از تخفیف خودش است)؛ حذف یا تمام شدنش هم قیمتی را برنمی‌گرداند. دو کمپین فعال با بازه‌ی هم‌پوشان ساخته نمی‌شوند. برای پنهان کردن موقت، «فعال» را خاموش کن.
			</p>

			<Modal open={!!editing} onClose={() => setEditing(null)} width={640}>
				{editing && <CampaignForm key={editing.campaign?.id ?? "new"} campaign={editing.campaign} all={campaigns.data ?? []} onClose={() => setEditing(null)} />}
			</Modal>
			<ConfirmModal
				open={!!removing}
				onClose={() => setRemoving(null)}
				tone="danger"
				icon="trash"
				title="حذف کمپین"
				text={removing ? `کمپین «${removing.title}» حذف شود؟ قیمت‌ها و سفارش‌ها دست نمی‌خورند.` : undefined}
				confirmLabel="حذف"
				loading={remove.isPending}
				onConfirm={() => removing && remove.mutate(removing)}
			/>
		</>
	);
}

/** 1.21.0 — the 409s that are about one field: a taken `slug`, or a period that overlaps another active campaign. */
const CODE_FIELDS = { DUPLICATE_SLUG: "slug", CAMPAIGN_OVERLAP: "endsAt" };

function CampaignForm({ campaign, all, onClose }: { campaign: AdminCampaign | null; all: AdminCampaign[]; onClose: () => void }) {
	const queryClient = useQueryClient();
	const [v, setV] = useState<CampaignUpsertRequest>(() => ({
		slug: campaign?.slug ?? "",
		title: campaign?.title ?? "",
		subtitle: campaign?.subtitle ?? "",
		icon: campaign?.icon ?? "fire",
		startsAt: campaign?.startsAt ?? "",
		endsAt: campaign?.endsAt ?? "",
		// the stored choice (`AdminCampaign.productIds`), not the computed `products`; empty = every discounted product
		productIds: campaign?.productIds ?? [],
		isActive: campaign?.isActive ?? true,
	}));
	const [touched, setTouched] = useState(false);
	const set = <K extends keyof CampaignUpsertRequest>(key: K, value: CampaignUpsertRequest[K]) => setV((x) => ({ ...x, [key]: value }));

	// `PUT` replaces everything (1.21.0): an empty subtitle goes as `null`
	const payload = (): CampaignUpsertRequest => ({ ...v, title: v.title.trim(), subtitle: v.subtitle?.trim() || null });
	const save = useMutation({
		mutationFn: () => withMappedError(() => (campaign ? CampaignsEndpoints.update(campaign.id, payload()) : CampaignsEndpoints.create(payload()))),
		meta: { showNotification: true },
		onSuccess: (c) => {
			toast(`کمپین «${c.title}» ذخیره شد — ${onSiteWithin(STORE_REFRESH_MINUTES.home)}`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["campaigns"] });
			onClose();
		},
	});

	const local: Record<string, string | null> = {
		slug: !SLUG.test(v.slug) ? "حروف کوچک لاتین، رقم و خط تیره (مثل paeez-1405)." : v.slug.length > 60 ? "حداکثر ۶۰ حرف." : null,
		title: !v.title.trim() ? "عنوان را بنویس." : v.title.trim().length > 80 ? "حداکثر ۸۰ حرف." : null,
		subtitle: (v.subtitle?.trim().length ?? 0) > 120 ? "حداکثر ۱۲۰ حرف." : null,
		startsAt: !v.startsAt ? "زمان شروع را وارد کن." : null,
		endsAt: !v.endsAt ? "زمان پایان را وارد کن." : v.startsAt && Date.parse(v.endsAt) <= Date.parse(v.startsAt) ? "پایان باید بعد از شروع باشد." : null,
		productIds: (v.productIds?.length ?? 0) > 200 ? "حداکثر ۲۰۰ محصول." : null,
	};
	const server = fieldErrorsWith(save.error, CODE_FIELDS);
	// `CAMPAIGN_OVERLAP` carries the other campaign's id — name it
	const overlapping = save.error?.code === "CAMPAIGN_OVERLAP" ? all.find((c) => c.id === Number(save.error?.meta?.campaignId)) : undefined;
	if (overlapping) server.endsAt = `${server.endsAt} (کمپین «${overlapping.title}»)`;
	// `productIds.{i}` — a product that is gone or archived
	const productError = server.productIds ?? Object.entries(server).find(([k]) => k.startsWith("productIds."))?.[1];
	const err = (k: string) => (touched && local[k]) || server[k] || null;

	return (
		<>
			<ModalHead icon="fire" title={campaign ? `ویرایش «${campaign.title}»` : "کمپین جدید"} />
			<div className="m-body">
				<div className="form-grid">
					<Input label="عنوان" value={v.title} onChange={(e) => set("title", e.target.value)} error={err("title")} placeholder="جشنواره پاییزه" />
					<Input label="slug" direction="ltr" value={v.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} error={err("slug")} placeholder="paeez-1405" />
					<Input label="زیرعنوان" labelNote="اختیاری" maxLength={120} value={v.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="تا پایان جشنواره فرصت داری" wrapperClassName="full" error={err("subtitle")} />
					<div className={`field${err("startsAt") ? " error" : ""}`}>
						<label>شروع</label>
						<JalaliDateTimeInput value={v.startsAt || null} onChange={(d) => set("startsAt", d ?? "")} clearable={false} ariaLabel="شروع" />
						{err("startsAt") && <span className="err">{err("startsAt")}</span>}
					</div>
					<div className={`field${err("endsAt") ? " error" : ""}`}>
						<label>پایان (مقصد شمارش معکوس)</label>
						<JalaliDateTimeInput value={v.endsAt || null} onChange={(d) => set("endsAt", d ?? "")} clearable={false} defaultTime="23:59" ariaLabel="پایان" />
						{err("endsAt") && <span className="err">{err("endsAt")}</span>}
					</div>
				</div>
				<IconSelect value={v.icon ?? null} onChange={(icon) => set("icon", icon ?? "fire")} />
				<ProductPicker label="محصولات" labelNote="خالی = همه‌ی محصولات تخفیف‌دار" value={v.productIds ?? []} onChange={(ids) => set("productIds", ids)} error={(touched && local.productIds) || productError} />
				<Switch label="فعال" checked={!!v.isActive} onChange={(e) => set("isActive", e.target.checked)} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={save.isPending}>
					انصراف
				</Button>
				<Button
					onClick={() => {
						setTouched(true);
						if (!Object.values(local).some(Boolean)) save.mutate();
					}}
					isLoading={save.isPending}
				>
					{campaign ? "ذخیره" : "ساخت کمپین"}
				</Button>
			</div>
		</>
	);
}
