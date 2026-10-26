"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TaxonomyEndpoints } from "@/app/(panel)/_api/taxonomyEndpoints";
import JalaliDateTimeInput from "@/app/_components/panel/jalaliDateTimeInput/jalaliDateTimeInput";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import MoneyInput from "@/app/_components/panel/moneyInput/moneyInput";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import ProductPicker from "@/app/_components/panel/productPicker/productPicker";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import MultiSelect from "@/app/_components/ui/multiSelect/multiSelect";
import Switch from "@/app/_components/ui/switch/switch";
import { toast } from "@/store/notification.store";
import { DiscountCode, DiscountCodeUpsertRequest, DiscountType } from "@/types/marketing.type";
import { convertPersianToEnglishString } from "@/utils/digits";
import { fieldErrorsWith } from "@/utils/fieldErrors";
import { withMappedError } from "@/utils/withMappedError";
import { DiscountsEndpoints } from "../../_api/discountsEndpoints";

/** A new code is 3–32 of these; older two-letter codes stay valid when edited. */
const CODE = /^[A-Z0-9_-]{3,32}$/;
const OLD_CODE = /^[A-Z0-9_-]{2,32}$/;
/** `DiscountCodeUpsertRequest` ranges (1.12.0). */
const LIMITS = { fixed: [1_000, 100_000_000], maxDiscount: [1_000, 100_000_000], minSubtotal: 1_000_000_000, categories: 50, products: 200 } as const;

/** Trim, capitals, Latin digits — what the server does before checking the pattern. */
const normalizeCode = (s: string) => convertPersianToEnglishString(s).trim().toUpperCase().replace(/\s/g, "");

type DiscountModalProps = { code: DiscountCode | null; open: boolean; onClose: () => void };

/**
 * `DiscountCodeUpsertRequest` — the amount, every condition of FEATURES §3.8, and the period. Saving replaces the whole
 * code; past orders keep their stored amounts, carts drop a code that no longer applies (`DISCOUNT_REMOVED`).
 */
export default function DiscountModal({ code, open, onClose }: DiscountModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={720}>
			<DiscountForm code={code} onClose={onClose} />
		</Modal>
	);
}

function DiscountForm({ code, onClose }: Omit<DiscountModalProps, "open">) {
	const queryClient = useQueryClient();
	const [v, setV] = useState<DiscountCodeUpsertRequest>(() => ({
		code: code?.code ?? "",
		type: code?.type ?? "PERCENT",
		value: code?.value ?? 0,
		label: code?.label ?? "",
		minSubtotal: code?.minSubtotal ?? null,
		maxDiscount: code?.maxDiscount ?? null,
		startsAt: code?.startsAt ?? null,
		endsAt: code?.endsAt ?? null,
		usageLimit: code?.usageLimit ?? null,
		// 1.12.0: no default any more — missing = no cap
		perUserLimit: code?.perUserLimit ?? null,
		firstOrderOnly: code?.firstOrderOnly ?? false,
		requiresLogin: code?.requiresLogin ?? false,
		excludeSaleItems: code?.excludeSaleItems ?? false,
		categoryIds: code?.categoryIds ?? [],
		productIds: code?.productIds ?? [],
		isActive: code?.isActive ?? true,
	}));
	const [touched, setTouched] = useState(false);
	const set = <K extends keyof DiscountCodeUpsertRequest>(key: K, value: DiscountCodeUpsertRequest[K]) => setV((x) => ({ ...x, [key]: value }));

	// the page is ADMIN-only, so the panel's own list — every category, not only the storefront's menu
	const categories = useQuery({
		queryKey: ["taxonomy", "adminCategories"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getAdminCategories()),
		meta: { showNotification: true },
	});

	const percent = v.type === "PERCENT";
	// a per-shopper cap or «first order only» can't count guests — the server stores such a code as «فقط با ورود»
	const loginForced = !!v.firstOrderOnly || v.perUserLimit != null;
	const payload = (): DiscountCodeUpsertRequest => ({
		...v,
		code: normalizeCode(v.code),
		label: v.label.trim(),
		// `maxDiscount` is for percent codes only (`MAX_DISCOUNT_NOT_ALLOWED`)
		maxDiscount: percent ? (v.maxDiscount ?? null) : null,
		requiresLogin: !!v.requiresLogin || loginForced,
	});

	const save = useMutation({
		mutationFn: () => withMappedError(() => (code ? DiscountsEndpoints.update(code.id, payload()) : DiscountsEndpoints.create(payload()))),
		meta: { showNotification: true },
		onSuccess: (d) => {
			toast(`کد ${d.code} ذخیره شد`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["discounts"] });
			onClose();
		},
		// saved by someone else at the same moment — nothing of this one was stored; the list is read again
		onError: (e) => {
			if (e.code === "CHANGED_BY_SOMEONE_ELSE") {
				queryClient.invalidateQueries({ queryKey: ["discounts"] });
				onClose();
			}
		},
	});

	const typed = normalizeCode(v.code);
	const keepsOldCode = !!code && typed === code.code;
	const local: Record<string, string | null> = {
		code: !(CODE.test(typed) || (keepsOldCode && OLD_CODE.test(typed))) ? "۳ تا ۳۲ حرف بزرگ لاتین، رقم، _ یا -." : null,
		value: !v.value
			? "مقدار تخفیف را وارد کن."
			: percent
				? v.value > 100
					? "درصد حداکثر ۱۰۰."
					: null
				: v.value < LIMITS.fixed[0] || v.value > LIMITS.fixed[1]
					? "بین ۱٬۰۰۰ و ۱۰۰٬۰۰۰٬۰۰۰ تومان."
					: null,
		maxDiscount: percent && v.maxDiscount != null && (v.maxDiscount < LIMITS.maxDiscount[0] || v.maxDiscount > LIMITS.maxDiscount[1]) ? "بین ۱٬۰۰۰ و ۱۰۰٬۰۰۰٬۰۰۰ تومان." : null,
		minSubtotal: v.minSubtotal != null && v.minSubtotal > LIMITS.minSubtotal ? "حداکثر ۱٬۰۰۰٬۰۰۰٬۰۰۰ تومان." : null,
		label: !v.label.trim() ? "متنی که مشتری در سبد می‌بیند را بنویس." : v.label.length > 200 ? "حداکثر ۲۰۰ حرف." : null,
		usageLimit: v.usageLimit != null && v.usageLimit < 1 ? "حداقل ۱ (خالی = نامحدود)." : null,
		perUserLimit: v.perUserLimit != null && v.perUserLimit < 1 ? "حداقل ۱ (خالی = نامحدود)." : null,
		endsAt: v.startsAt && v.endsAt && Date.parse(v.endsAt) <= Date.parse(v.startsAt) ? "پایان باید بعد از شروع باشد." : null,
		categoryIds: (v.categoryIds?.length ?? 0) > LIMITS.categories ? "حداکثر ۵۰ دسته." : null,
		productIds: (v.productIds?.length ?? 0) > LIMITS.products ? "حداکثر ۲۰۰ محصول." : null,
	};
	const server = fieldErrorsWith(save.error, { DUPLICATE_CODE: "code" });
	const err = (k: string) => (touched && local[k]) || server[k] || null;

	return (
		<>
			<ModalHead icon="tag" title={code ? `ویرایش ${code.code}` : "کد تخفیف جدید"} subtitle="درصدی روی جمع بعد از تخفیف محصولات (گرد به ۱٬۰۰۰) یا مبلغ ثابت" />
			<div className="m-body">
				<div className="form-grid">
					<Input label="کد" direction="ltr" maxLength={32} value={v.code} onChange={(e) => set("code", normalizeCode(e.target.value))} error={err("code")} placeholder="PAEEZ15" />
					<div className="field">
						<label>نوع</label>
						<div className="radios">
							{(["PERCENT", "FIXED"] as DiscountType[]).map((t) => (
								<label key={t} className="opt-card">
									<input type="radio" name="dtype" checked={v.type === t} onChange={() => set("type", t)} />
									<span className="radio" />
									<span className="t">{t === "PERCENT" ? "درصدی" : "مبلغ ثابت"}</span>
								</label>
							))}
						</div>
					</div>
					{percent ? (
						<NumberInput label="درصد" value={v.value || null} onChange={(n) => set("value", n ?? 0)} error={err("value")} />
					) : (
						<MoneyInput label="مبلغ تخفیف" value={v.value || null} onChange={(n) => set("value", n ?? 0)} error={err("value")} />
					)}
					{percent ? <MoneyInput label="سقف تخفیف" labelNote="اختیاری" value={v.maxDiscount ?? null} onChange={(n) => set("maxDiscount", n)} error={err("maxDiscount")} /> : <span />}
					<Input label="متن نمایشی" maxLength={200} value={v.label} onChange={(e) => set("label", e.target.value)} error={err("label")} placeholder="۱۵٪ تخفیف پاییزه (خرید بالای ۲ میلیون)" wrapperClassName="full" />
				</div>

				<div className="form-grid">
					<MoneyInput label="حداقل خرید" labelNote="اختیاری" value={v.minSubtotal ?? null} onChange={(n) => set("minSubtotal", n)} error={err("minSubtotal")} />
					<NumberInput label="سقف استفاده‌ی کل" labelNote="خالی = نامحدود" value={v.usageLimit ?? null} onChange={(n) => set("usageLimit", n)} error={err("usageLimit")} />
					<NumberInput label="سقف هر کاربر" labelNote="خالی = نامحدود" value={v.perUserLimit ?? null} onChange={(n) => set("perUserLimit", n)} error={err("perUserLimit")} />
					<span />
					<div className="field">
						<label>شروع</label>
						<JalaliDateTimeInput value={v.startsAt ?? null} onChange={(d) => set("startsAt", d)} ariaLabel="شروع" />
					</div>
					<div className={`field${err("endsAt") ? " error" : ""}`}>
						<label>پایان</label>
						<JalaliDateTimeInput value={v.endsAt ?? null} onChange={(d) => set("endsAt", d)} defaultTime="23:59" ariaLabel="پایان" />
						{err("endsAt") && <span className="err">{err("endsAt")}</span>}
					</div>
				</div>

				<div style={{ display: "flex", gap: "10px 24px", flexWrap: "wrap" }}>
					<Switch label="فقط خرید اول" checked={!!v.firstOrderOnly} onChange={(e) => set("firstOrderOnly", e.target.checked)} />
					<Switch label="فقط با ورود" checked={!!v.requiresLogin || loginForced} disabled={loginForced} onChange={(e) => set("requiresLogin", e.target.checked)} />
					<Switch label="روی کالاهای تخفیف‌خورده اعمال نشود" checked={!!v.excludeSaleItems} onChange={(e) => set("excludeSaleItems", e.target.checked)} />
					<Switch label="فعال" checked={!!v.isActive} onChange={(e) => set("isActive", e.target.checked)} />
				</div>

				{loginForced && <small className="muted">با «سقف هر کاربر» یا «فقط خرید اول»، کد خودکار فقط با ورود کار می‌کند (مهمان را نمی‌شود شمرد).</small>}

				<div className={`field${err("categoryIds") ? " error" : ""}`}>
					<label>
						فقط برای این دسته‌ها <span className="opt">(خالی = همه؛ با محصول‌ها «یا» است)</span>
					</label>
					<MultiSelect
						options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
						value={(v.categoryIds ?? []).map(String)}
						onChange={(ids) => set("categoryIds", ids.map(Number))}
						placeholder="انتخاب دسته"
					/>
					{err("categoryIds") && <span className="err">{err("categoryIds")}</span>}
				</div>
				<ProductPicker label="فقط برای این محصول‌ها" labelNote="خالی = همه" value={v.productIds ?? []} onChange={(ids) => set("productIds", ids)} error={err("productIds")} />
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
					{code ? "ذخیره" : "ساخت کد"}
				</Button>
			</div>
		</>
	);
}
