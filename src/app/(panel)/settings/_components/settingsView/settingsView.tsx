"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import { MessengerIcon } from "@/app/_components/icon/messengerIcon";
import MoneyInput from "@/app/_components/panel/moneyInput/moneyInput";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import UnsavedGuard from "@/app/_components/panel/unsavedGuard/unsavedGuard";
import Button from "@/app/_components/ui/button/button";
import Checkbox from "@/app/_components/ui/checkbox/checkbox";
import Input from "@/app/_components/ui/input/input";
import Switch from "@/app/_components/ui/switch/switch";
import { toast } from "@/store/notification.store";
import { AdminSettings, Weekday } from "@/types/settings.type";
import { toErrorView } from "@/utils/apiError";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { optionsOf, WEEKDAY } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { SettingsEndpoints } from "../../_api/settingsEndpoints";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const FEATURE_LABEL: Record<string, string> = { reviews: "ثبت نظر", wishlistShare: "اشتراک علاقه‌مندی‌ها", newsletter: "خبرنامه", stockAlerts: "«موجود شد خبرم کن»" };

/** `/settings` (ADMIN) — shipping, reservation, returns, timings, support, social, gateways, site stats, features. */
export default function SettingsView() {
	const queryClient = useQueryClient();
	const current = useQuery({
		queryKey: ["settings"],
		queryFn: () => withMappedError(() => SettingsEndpoints.get()),
		meta: { showNotificationOnRefetch: true },
	});

	const [base, setBase] = useState<AdminSettings | null>(null);
	const [v, setV] = useState<AdminSettings | null>(null);
	const dirty = !!base && !same(v, base);
	if (current.data && !dirty && !same(current.data, base)) {
		setBase(current.data);
		setV(current.data);
	}

	const save = useMutation({
		mutationFn: () => withMappedError(() => SettingsEndpoints.save(v as AdminSettings)),
		meta: { showNotification: true },
		onSuccess: (saved) => {
			toast("تنظیمات ذخیره شد", { icon: "check" });
			setBase(saved);
			setV(saved);
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});

	const errors = fieldErrorsOf(save.error);
	const currentError = toErrorView(ERROR_BEHAVIOUR, current.error, "دریافت تنظیمات با خطا مواجه شد.");
	if (current.isLoading) return <Loading />;
	if (currentError)
		return <ErrorComponent retryable={currentError.retryable} ticketAble={currentError.ticketAble} errorText={currentError.errorText} executeFunction={() => current.refetch()} loading={current.isFetching} />;
	if (!v) return null;

	const set = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => setV((x) => (x ? { ...x, [key]: value } : x));
	const setAt = <K extends "shippingMethods" | "supportHours" | "social" | "paymentGateways">(key: K, i: number, patch: Partial<AdminSettings[K][number]>) =>
		setV((x) => (x ? { ...x, [key]: (x[key] as AdminSettings[K][number][]).map((row, k) => (k === i ? { ...row, ...patch } : row)) } : x));
	const toggleDay = (list: Weekday[], day: Weekday, on: boolean) => (on ? [...list, day] : list.filter((d) => d !== day));

	return (
		<>
			<PageHead title="تنظیمات" subtitle="مقادیری که سایت در `/config` منتشر می‌کند؛ محاسبه‌ی سبد و سفارش همیشه با بک‌اند است." />
			<p className="note cream" style={{ marginBottom: 14 }}>
				فروشگاه فعلاً متن‌های فوتر، پشتیبانی و نوار اطلاعیه را از تنظیمات ثابت خودش می‌خواند (FEATURES §۶)؛ پول (ارسال، رایگان، رزرو) با بک‌اند حساب می‌شود و همین‌جا اثر دارد.
			</p>

			<section className="fsec">
				<h3>
					<Icon name="truck" /> ارسال
				</h3>
				<div className="rows" style={{ marginTop: 14 }}>
					{v.shippingMethods.map((m, i) => (
						<div key={m.code} className="row-card">
							<div className="rh">
								<b>{m.name}</b>
								<span className="tag ltr">{m.code}</span>
								<span className="acts">
									<Switch label="فعال" checked={m.isActive} onChange={(e) => setAt("shippingMethods", i, { isActive: e.target.checked })} />
								</span>
							</div>
							<div className="form-grid g4">
								<Input label="نام" value={m.name} onChange={(e) => setAt("shippingMethods", i, { name: e.target.value })} error={errors[`shippingMethods[${i}].name`]} />
								<MoneyInput label="هزینه" value={m.baseCost} onChange={(n) => setAt("shippingMethods", i, { baseCost: n ?? 0 })} error={errors[`shippingMethods[${i}].baseCost`]} />
								<NumberInput label="حداقل روز" value={m.minDays} onChange={(n) => setAt("shippingMethods", i, { minDays: n ?? 0 })} />
								<NumberInput label="حداکثر روز" value={m.maxDays} onChange={(n) => setAt("shippingMethods", i, { maxDays: n ?? 0 })} error={errors[`shippingMethods[${i}].maxDays`]} />
								<Input label="توضیح" value={m.description} onChange={(e) => setAt("shippingMethods", i, { description: e.target.value })} wrapperClassName="full" />
								<Input label="لینک رهگیری" labelNote="{code} = کد رهگیری" direction="ltr" value={m.trackingUrlTemplate} onChange={(e) => setAt("shippingMethods", i, { trackingUrlTemplate: e.target.value })} wrapperClassName="full" />
							</div>
						</div>
					))}
				</div>
				{errors.shippingMethods && <p className="note danger">{errors.shippingMethods}</p>}
				<div className="form-grid" style={{ marginTop: 14 }}>
					<MoneyInput label="آستانه‌ی ارسال رایگان" value={v.freeShippingThreshold} onChange={(n) => set("freeShippingThreshold", n ?? 0)} error={errors.freeShippingThreshold} hint="جمع بعد از تخفیف محصولات و قبل از کد تخفیف" />
					<div className="field">
						<label>ارسال رایگان برای</label>
						<div style={{ display: "flex", gap: 18, minHeight: 50, alignItems: "center" }}>
							{v.shippingMethods.map((m) => (
								<Checkbox
									key={m.code}
									label={m.name}
									checked={v.freeShippingMethods.includes(m.code)}
									onChange={(e) => set("freeShippingMethods", e.target.checked ? [...v.freeShippingMethods, m.code] : v.freeShippingMethods.filter((c) => c !== m.code))}
								/>
							))}
						</div>
					</div>
				</div>
				<div className="field" style={{ marginTop: 14 }}>
					<label>روزهای بدون ارسال</label>
					<div style={{ display: "flex", gap: "8px 18px", flexWrap: "wrap" }}>
						{optionsOf(WEEKDAY).map((d) => (
							<Checkbox key={d.value} label={d.label} checked={v.nonShippingWeekdays.includes(d.value)} onChange={(e) => set("nonShippingWeekdays", toggleDay(v.nonShippingWeekdays, d.value, e.target.checked))} />
						))}
					</div>
				</div>
			</section>

			<section className="fsec">
				<h3>
					<Icon name="timer" /> رزرو، بازگشت و مهلت‌ها
				</h3>
				<div className="form-grid g3" style={{ marginTop: 14 }}>
					<div className="field" style={{ justifyContent: "flex-end" }}>
						<Switch label="رزرو فعال است" checked={v.reservationEnabled} onChange={(e) => set("reservationEnabled", e.target.checked)} />
					</div>
					<NumberInput label="مهلت رزرو (روز)" value={v.reservationHoldDays} onChange={(n) => set("reservationHoldDays", n ?? 0)} error={errors.reservationHoldDays} />
					<NumberInput label="مهلت بازگشت (روز بعد از تحویل)" value={v.returnWindowDays} onChange={(n) => set("returnWindowDays", n ?? 0)} error={errors.returnWindowDays} />
					<NumberInput label="آستانه‌ی «فقط N عدد»" value={v.lowStockThreshold} onChange={(n) => set("lowStockThreshold", n ?? 0)} error={errors.lowStockThreshold} />
					<NumberInput label="مهلت پاسخ به عکس (ساعت)" value={v.preShipmentFeedbackHours} onChange={(n) => set("preShipmentFeedbackHours", n ?? 0)} error={errors.preShipmentFeedbackHours} hint="بعدش خودکار تأییدشده" />
					<NumberInput label="مهلت پرداخت (دقیقه)" value={v.paymentPendingMinutes} onChange={(n) => set("paymentPendingMinutes", n ?? 0)} error={errors.paymentPendingMinutes} hint="بعدش سفارش منقضی" />
				</div>
			</section>

			<section className="fsec">
				<h3>
					<Icon name="headset" /> پشتیبانی و شبکه‌ها
				</h3>
				<div className="form-grid" style={{ marginTop: 14 }}>
					<Input label="تلفن" direction="ltr" value={v.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} error={errors.supportPhone} />
					<Input label="ایمیل" direction="ltr" value={v.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} error={errors.supportEmail} />
				</div>
				<div className="rows" style={{ marginTop: 14 }}>
					{v.supportHours.map((h, i) => (
						<div key={i} className="row-card">
							<div className="form-grid g4">
								<Input label="برچسب" value={h.label} onChange={(e) => setAt("supportHours", i, { label: e.target.value })} />
								<Input label="از" direction="ltr" value={h.from ?? ""} disabled={h.messengerOnly} onChange={(e) => setAt("supportHours", i, { from: e.target.value || null })} error={errors[`supportHours[${i}].from`]} />
								<Input label="تا" direction="ltr" value={h.to ?? ""} disabled={h.messengerOnly} onChange={(e) => setAt("supportHours", i, { to: e.target.value || null })} />
								<div className="field" style={{ justifyContent: "flex-end" }}>
									<Switch label="فقط پیام‌رسان" checked={h.messengerOnly} onChange={(e) => setAt("supportHours", i, { messengerOnly: e.target.checked })} />
								</div>
							</div>
							<div style={{ display: "flex", gap: "6px 14px", flexWrap: "wrap" }}>
								{optionsOf(WEEKDAY).map((d) => (
									<Checkbox key={d.value} label={d.label} checked={h.weekdays.includes(d.value)} onChange={(e) => setAt("supportHours", i, { weekdays: toggleDay(h.weekdays, d.value, e.target.checked) })} />
								))}
								<button type="button" className="btn btn-link" style={{ color: "var(--danger)", marginInlineStart: "auto" }} onClick={() => set("supportHours", v.supportHours.filter((_, k) => k !== i))}>
									<Icon name="trash" /> حذف
								</button>
							</div>
						</div>
					))}
					<button type="button" className="add-row" onClick={() => set("supportHours", [...v.supportHours, { label: "", weekdays: [], from: "09:00", to: "17:00", messengerOnly: false }])}>
						<Icon name="plus" /> افزودن بازه‌ی پاسخگویی
					</button>
				</div>
				<div className="stack" style={{ marginTop: 14, gap: 10 }}>
					{v.social.map((s, i) => (
						<div key={s.channel} className="form-grid g3" style={{ alignItems: "end" }}>
							<Input
								label={
									<span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
										<MessengerIcon channel={s.channel} width={18} height={18} /> {s.name}
									</span>
								}
								direction="ltr"
								value={s.url}
								onChange={(e) => setAt("social", i, { url: e.target.value })}
								wrapperClassName="full"
							/>
							<Input label="شناسه" direction="ltr" value={s.handle} onChange={(e) => setAt("social", i, { handle: e.target.value })} />
						</div>
					))}
				</div>
			</section>

			<section className="fsec">
				<h3>
					<Icon name="card" /> درگاه‌های پرداخت
				</h3>
				<div className="stack" style={{ marginTop: 14, gap: 10 }}>
					{v.paymentGateways.map((g, i) => (
						<div key={g.code} className="row-card" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
							<span style={{ width: 36, height: 36, borderRadius: 10, background: g.brandColor, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900 }}>{g.initial}</span>
							<b>{g.name}</b>
							<span style={{ marginInlineStart: "auto", display: "flex", gap: 18, alignItems: "center" }}>
								<label className="check">
									<input type="radio" name="defaultGateway" checked={g.isDefault} onChange={() => set("paymentGateways", v.paymentGateways.map((x) => ({ ...x, isDefault: x.code === g.code })))} /> پیش‌فرض
								</label>
								<Switch label="فعال" checked={g.available} onChange={(e) => setAt("paymentGateways", i, { available: e.target.checked })} />
							</span>
						</div>
					))}
					{errors.paymentGateways && <p className="note danger">{errors.paymentGateways}</p>}
				</div>
			</section>

			<section className="fsec">
				<h3>
					<Icon name="chart" /> آمار «درباره ما» و قابلیت‌ها
				</h3>
				<div className="form-grid g4" style={{ marginTop: 14 }}>
					<NumberInput label="مشتری راضی" value={v.siteStats.happyCustomers} onChange={(n) => set("siteStats", { ...v.siteStats, happyCustomers: n ?? 0 })} />
					<NumberInput label="عکس قبل از ارسال" value={v.siteStats.preShipmentPhotos} onChange={(n) => set("siteStats", { ...v.siteStats, preShipmentPhotos: n ?? 0 })} />
					<NumberInput label="درصد رضایت از تطابق" value={v.siteStats.photoMatchSatisfactionPercent} onChange={(n) => set("siteStats", { ...v.siteStats, photoMatchSatisfactionPercent: n ?? 0 })} />
					<NumberInput label="تعداد مدل" value={v.siteStats.productModels} onChange={(n) => set("siteStats", { ...v.siteStats, productModels: n ?? 0 })} />
				</div>
				<div style={{ display: "flex", gap: "10px 24px", flexWrap: "wrap", marginTop: 14 }}>
					{Object.entries(v.features).map(([key, on]) => (
						<Switch key={key} label={FEATURE_LABEL[key] ?? key} checked={on} onChange={(e) => set("features", { ...v.features, [key]: e.target.checked })} />
					))}
				</div>
			</section>

			<UnsavedGuard dirty={dirty} />
			<div className="savebar">
				<span className="msg">{dirty ? "تغییرات ذخیره‌نشده داری." : "همه‌چیز ذخیره است."}</span>
				{dirty && (
					<Button variant="white" size="sm" onClick={() => base && setV(base)} disabled={save.isPending}>
						برگرداندن
					</Button>
				)}
				<Button size="sm" onClick={() => save.mutate()} isLoading={save.isPending} disabled={!dirty}>
					ذخیره‌ی تنظیمات
				</Button>
			</div>
		</>
	);
}
