"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/app/_components/icon/icons";
import IconSelect from "@/app/_components/panel/iconSelect/iconSelect";
import JalaliDateTimeInput from "@/app/_components/panel/jalaliDateTimeInput/jalaliDateTimeInput";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import SingleMediaField, { PickedMedia } from "@/app/_components/panel/singleMediaField/singleMediaField";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import Select from "@/app/_components/ui/select/select";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { SocialChannel } from "@/types/common.type";
import { Banner, BannerPlacement, BannerTheme, BannerUpsertRequest } from "@/types/marketing.type";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { BANNER_PLACEMENT, BANNER_THEME, optionsOf, SOCIAL_CHANNEL } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { BannersEndpoints } from "../../_api/bannersEndpoints";

/** Background / text of each theme — the design's promo banners (`.promo.cream`, `.promo.purple`, …). */
export const THEME_STYLE: Record<BannerTheme, { background: string; color: string }> = {
	CREAM: { background: "var(--cream)", color: "var(--ink)" },
	PURPLE: { background: "var(--purple)", color: "#fff" },
	LILAC: { background: "var(--lilac)", color: "var(--ink)" },
	DARK: { background: "var(--ink)", color: "#fff" },
	WHITE: { background: "#fff", color: "var(--ink)" },
};

type Form = Omit<BannerUpsertRequest, "imageMediaId"> & { image: PickedMedia };

type BannerModalProps = { banner: Banner | null; open: boolean; onClose: () => void; placement?: BannerPlacement };

/** `BannerUpsertRequest` — placement, theme, tag, text, button, image with its overlay, order and period; with a preview. */
export default function BannerModal({ banner, open, onClose, placement }: BannerModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={820}>
			<BannerForm banner={banner} onClose={onClose} placement={placement} />
		</Modal>
	);
}

function BannerForm({ banner, onClose, placement }: Omit<BannerModalProps, "open">) {
	const queryClient = useQueryClient();
	const [v, setV] = useState<Form>(() => ({
		placement: banner?.placement ?? placement ?? "HOME_PROMO",
		theme: banner?.theme ?? "CREAM",
		tagLabel: banner?.tag?.label ?? "",
		tagIcon: banner?.tag?.icon ?? null,
		title: banner?.title ?? "",
		text: banner?.text ?? "",
		ctaLabel: banner?.cta.label ?? "",
		ctaUrl: banner?.cta.url ?? "",
		image: banner?.image ? { id: banner.image.id, url: banner.image.thumbnailUrl || banner.image.url } : null,
		overlayHighlight: banner?.overlay?.highlight ?? "",
		overlayTitle: banner?.overlay?.title ?? "",
		overlaySubtitle: banner?.overlay?.subtitle ?? "",
		overlayChannel: banner?.overlay?.channel ?? null,
		sortOrder: banner?.sortOrder ?? 1,
		startsAt: banner?.startsAt ?? null,
		endsAt: banner?.endsAt ?? null,
	}));
	const [touched, setTouched] = useState(false);
	const set = <K extends keyof Form>(key: K, value: Form[K]) => setV((x) => ({ ...x, [key]: value }));

	const payload = (): BannerUpsertRequest => {
		const { image, ...rest } = v;
		return {
			...rest,
			tagLabel: v.tagLabel?.trim() || null,
			tagIcon: v.tagLabel?.trim() ? v.tagIcon : null,
			overlayHighlight: v.overlayHighlight?.trim() || null,
			overlayTitle: v.overlayTitle?.trim() || null,
			overlaySubtitle: v.overlaySubtitle?.trim() || null,
			...(image ? { imageMediaId: image.id } : {}),
		};
	};

	const save = useMutation({
		mutationFn: () => withMappedError(() => (banner ? BannersEndpoints.update(banner.id, payload()) : BannersEndpoints.create(payload()))),
		meta: { showNotification: true },
		onSuccess: () => {
			toast(banner ? "بنر ذخیره شد" : "بنر ساخته شد", { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["banners"] });
			onClose();
		},
	});

	const local: Record<string, string | null> = {
		title: !v.title.trim() ? "عنوان را بنویس." : null,
		endsAt: v.startsAt && v.endsAt && Date.parse(v.endsAt) <= Date.parse(v.startsAt) ? "پایان باید بعد از شروع باشد." : null,
	};
	const server = fieldErrorsOf(save.error);
	const err = (k: string) => (touched && local[k]) || server[k] || null;
	const theme = THEME_STYLE[v.theme ?? "CREAM"];

	return (
		<>
			<ModalHead icon="image" title={banner ? "ویرایش بنر" : "بنر جدید"} />
			<div className="m-body">
				{/* preview — the shape of the design's promo card, not a pixel copy */}
				<div style={{ ...theme, borderRadius: 18, padding: 18, display: "grid", gridTemplateColumns: "1fr 120px", gap: 14, alignItems: "center", border: "1px solid var(--line)" }}>
					<div style={{ display: "grid", gap: 6 }}>
						{v.tagLabel && (
							<span className="tag tag-glass" style={{ justifySelf: "start", color: "var(--ink)" }}>
								{v.tagIcon && <Icon name={v.tagIcon} />}
								{v.tagLabel}
							</span>
						)}
						<b style={{ fontSize: 17, whiteSpace: "pre-line", lineHeight: 1.5 }}>{v.title || "عنوان بنر"}</b>
						<span style={{ fontSize: 12.5, opacity: 0.85 }}>{v.text}</span>
						{v.ctaLabel && <span style={{ fontWeight: 700, fontSize: 13 }}>{v.ctaLabel} ←</span>}
					</div>
					<div style={{ position: "relative", aspectRatio: "1", borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,.4)" }}>
						{/* eslint-disable-next-line @next/next/no-img-element -- media URL */}
						{v.image && <img src={v.image.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
						{(v.overlayTitle || v.overlayHighlight) && (
							<span style={{ position: "absolute", insetInline: 6, bottom: 6, background: "#fff", color: "var(--ink)", borderRadius: 10, padding: "4px 8px", fontSize: 11 }}>
								<b>{v.overlayHighlight}</b> {v.overlayTitle}
							</span>
						)}
					</div>
				</div>

				<div className="form-grid g3">
					<Select label="جایگاه" value={v.placement} onChange={(e) => set("placement", e.target.value as BannerPlacement)} options={optionsOf(BANNER_PLACEMENT)} error={err("placement")} />
					<Select label="تم" value={v.theme} onChange={(e) => set("theme", e.target.value as BannerTheme)} options={optionsOf(BANNER_THEME)} />
					<NumberInput label="ترتیب" value={v.sortOrder ?? null} onChange={(n) => set("sortOrder", n ?? 0)} />
				</div>
				<Textarea label="عنوان" labelNote="Enter = خط جدید" value={v.title} onChange={(e) => set("title", e.target.value)} error={err("title")} style={{ minHeight: 64 }} />
				<Textarea label="متن" value={v.text ?? ""} onChange={(e) => set("text", e.target.value)} style={{ minHeight: 70 }} />
				<div className="form-grid">
					<Input label="برچسب" labelNote="اختیاری" value={v.tagLabel ?? ""} onChange={(e) => set("tagLabel", e.target.value)} placeholder="رزرو ۴ روزه" />
					<span />
					<Input label="متن دکمه" value={v.ctaLabel ?? ""} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="بیشتر بدونم" />
					<Input label="لینک دکمه" direction="ltr" value={v.ctaUrl ?? ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/faq#reserve" error={err("ctaUrl")} />
				</div>
				{v.tagLabel && <IconSelect label="آیکن برچسب" clearable value={v.tagIcon ?? null} onChange={(icon) => set("tagIcon", icon)} />}
				<SingleMediaField label="عکس" purpose="BANNER" value={v.image} onChange={(image) => set("image", image)} error={err("imageMediaId")} />
				<div className="form-grid g4">
					<Input label="برچسب روی عکس: عدد" value={v.overlayHighlight ?? ""} onChange={(e) => set("overlayHighlight", e.target.value)} placeholder="4" />
					<Input label="عنوان" value={v.overlayTitle ?? ""} onChange={(e) => set("overlayTitle", e.target.value)} placeholder="روز رزرو" />
					<Input label="زیرعنوان" value={v.overlaySubtitle ?? ""} onChange={(e) => set("overlaySubtitle", e.target.value)} placeholder="یک هزینه ارسال" />
					<Select label="پیام‌رسان" placeholder="—" value={v.overlayChannel ?? ""} onChange={(e) => set("overlayChannel", (e.target.value || null) as SocialChannel | null)} options={optionsOf(SOCIAL_CHANNEL)} />
				</div>
				<div className="form-grid">
					<div className="field">
						<label>نمایش از</label>
						<JalaliDateTimeInput value={v.startsAt ?? null} onChange={(d) => set("startsAt", d)} ariaLabel="نمایش از" />
					</div>
					<div className={`field${err("endsAt") ? " error" : ""}`}>
						<label>تا</label>
						<JalaliDateTimeInput value={v.endsAt ?? null} onChange={(d) => set("endsAt", d)} defaultTime="23:59" ariaLabel="نمایش تا" />
						{err("endsAt") && <span className="err">{err("endsAt")}</span>}
					</div>
				</div>
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
					{banner ? "ذخیره" : "ساخت بنر"}
				</Button>
			</div>
		</>
	);
}
