"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
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
import { Campaign, CampaignUpsertRequest } from "@/types/marketing.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { onSiteWithin } from "@/utils/format";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { PERIOD_LABEL, PERIOD_TONE, periodState, periodText } from "@/utils/period";
import { withMappedError } from "@/utils/withMappedError";
import { CampaignsEndpoints } from "../../_api/campaignsEndpoints";

const SLUG = /^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*$/;

/** `/campaigns` — the home page's sale section (title, countdown to `endsAt`, products). Only one runs at a time on the site. */
export default function CampaignsView() {
	const [editing, setEditing] = useState<{ campaign: Campaign | null } | null>(null);

	const campaigns = useQuery({
		queryKey: ["campaigns", "list"],
		queryFn: () => withMappedError(() => CampaignsEndpoints.getCampaigns()),
		meta: { showNotificationOnRefetch: true },
	});

	const columns: Column<Campaign>[] = [
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
						<span className="sub">{c.subtitle}</span>
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
			render: (c) => (c.productIds && !c.productIds.length ? "همه‌ی تخفیف‌دارها" : `${toPersianDigits(c.productIds?.length ?? c.products.length)} محصول`),
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
				حذف کمپین در کانترکت نیست؛ برای کنار گذاشتن، «فعال» را خاموش کن.
			</p>

			<Modal open={!!editing} onClose={() => setEditing(null)} width={640}>
				{editing && <CampaignForm key={editing.campaign?.id ?? "new"} campaign={editing.campaign} onClose={() => setEditing(null)} />}
			</Modal>
		</>
	);
}

function CampaignForm({ campaign, onClose }: { campaign: Campaign | null; onClose: () => void }) {
	const queryClient = useQueryClient();
	const [v, setV] = useState<CampaignUpsertRequest>(() => ({
		slug: campaign?.slug ?? "",
		title: campaign?.title ?? "",
		subtitle: campaign?.subtitle ?? "",
		icon: campaign?.icon ?? "fire",
		startsAt: campaign?.startsAt ?? "",
		endsAt: campaign?.endsAt ?? "",
		// the contract's `Campaign` has products, not their ids — without `productIds` the chosen set can't be told from «all on sale»
		productIds: campaign ? (campaign.productIds ?? campaign.products.map((p) => p.id)) : [],
		isActive: campaign?.isActive ?? true,
	}));
	const [touched, setTouched] = useState(false);
	const set = <K extends keyof CampaignUpsertRequest>(key: K, value: CampaignUpsertRequest[K]) => setV((x) => ({ ...x, [key]: value }));

	const save = useMutation({
		mutationFn: () => withMappedError(() => (campaign ? CampaignsEndpoints.update(campaign.id, v) : CampaignsEndpoints.create(v))),
		meta: { showNotification: true },
		onSuccess: (c) => {
			toast(`کمپین «${c.title}» ذخیره شد — ${onSiteWithin(STORE_REFRESH_MINUTES.home)}`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["campaigns"] });
			onClose();
		},
	});

	const local: Record<string, string | null> = {
		slug: !SLUG.test(v.slug) ? "حروف کوچک لاتین، رقم و خط تیره (مثل paeez-1405)." : null,
		title: !v.title.trim() ? "عنوان را بنویس." : null,
		startsAt: !v.startsAt ? "زمان شروع را وارد کن." : null,
		endsAt: !v.endsAt ? "زمان پایان را وارد کن." : v.startsAt && Date.parse(v.endsAt) <= Date.parse(v.startsAt) ? "پایان باید بعد از شروع باشد." : null,
	};
	const server = fieldErrorsOf(save.error);
	const err = (k: string) => (touched && local[k]) || server[k] || null;

	return (
		<>
			<ModalHead icon="fire" title={campaign ? `ویرایش «${campaign.title}»` : "کمپین جدید"} />
			<div className="m-body">
				<div className="form-grid">
					<Input label="عنوان" value={v.title} onChange={(e) => set("title", e.target.value)} error={err("title")} placeholder="جشنواره پاییزه" />
					<Input label="slug" direction="ltr" value={v.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} error={err("slug")} placeholder="paeez-1405" />
					<Input label="زیرعنوان" value={v.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="تا پایان جشنواره فرصت داری" wrapperClassName="full" />
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
				<ProductPicker label="محصولات" labelNote="خالی = همه‌ی محصولات تخفیف‌دار" value={v.productIds ?? []} onChange={(ids) => set("productIds", ids)} error={server.productIds} />
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
