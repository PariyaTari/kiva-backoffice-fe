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
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { withMappedError } from "@/utils/withMappedError";
import { DiscountsEndpoints } from "../../_api/discountsEndpoints";

const CODE = /^[A-Z0-9_-]{3,32}$/;

type DiscountModalProps = { code: DiscountCode | null; open: boolean; onClose: () => void };

/** `DiscountCodeUpsertRequest` — the amount, every condition of FEATURES §3.8, and the period. */
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
		perUserLimit: code?.perUserLimit ?? 1,
		firstOrderOnly: code?.firstOrderOnly ?? false,
		requiresLogin: code?.requiresLogin ?? false,
		excludeSaleItems: code?.excludeSaleItems ?? false,
		categoryIds: code?.categoryIds ?? [],
		productIds: code?.productIds ?? [],
		isActive: code?.isActive ?? true,
	}));
	const [touched, setTouched] = useState(false);
	const set = <K extends keyof DiscountCodeUpsertRequest>(key: K, value: DiscountCodeUpsertRequest[K]) => setV((x) => ({ ...x, [key]: value }));

	const categories = useQuery({
		queryKey: ["taxonomy", "categories"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getCategories()),
		meta: { showNotification: true },
	});

	const save = useMutation({
		mutationFn: () => withMappedError(() => (code ? DiscountsEndpoints.update(code.id, v) : DiscountsEndpoints.create(v))),
		meta: { showNotification: true },
		onSuccess: (d) => {
			toast(`کد ${d.code} ذخیره شد`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["discounts"] });
			onClose();
		},
	});

	const percent = v.type === "PERCENT";
	const local: Record<string, string | null> = {
		code: !CODE.test(v.code) ? "۳ تا ۳۲ حرف بزرگ لاتین، رقم، _ یا -." : null,
		value: !v.value ? "مقدار تخفیف را وارد کن." : percent && v.value > 100 ? "درصد حداکثر ۱۰۰." : null,
		label: !v.label.trim() ? "متنی که مشتری در سبد می‌بیند را بنویس." : null,
		endsAt: v.startsAt && v.endsAt && Date.parse(v.endsAt) <= Date.parse(v.startsAt) ? "پایان باید بعد از شروع باشد." : null,
	};
	const server = fieldErrorsOf(save.error);
	const err = (k: string) => (touched && local[k]) || server[k] || null;

	return (
		<>
			<ModalHead icon="tag" title={code ? `ویرایش ${code.code}` : "کد تخفیف جدید"} subtitle="درصدی روی جمع بعد از تخفیف محصولات (گرد به ۱٬۰۰۰) یا مبلغ ثابت" />
			<div className="m-body">
				<div className="form-grid">
					<Input label="کد" direction="ltr" value={v.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))} error={err("code")} placeholder="PAEEZ15" />
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
					<Input label="متن نمایشی" value={v.label} onChange={(e) => set("label", e.target.value)} error={err("label")} placeholder="۱۵٪ تخفیف پاییزه (خرید بالای ۲ میلیون)" wrapperClassName="full" />
				</div>

				<div className="form-grid">
					<MoneyInput label="حداقل خرید" labelNote="اختیاری" value={v.minSubtotal ?? null} onChange={(n) => set("minSubtotal", n)} />
					<NumberInput label="سقف استفاده‌ی کل" labelNote="خالی = نامحدود" value={v.usageLimit ?? null} onChange={(n) => set("usageLimit", n)} error={err("usageLimit")} />
					<NumberInput label="سقف هر کاربر" value={v.perUserLimit ?? null} onChange={(n) => set("perUserLimit", n)} error={err("perUserLimit")} />
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
					<Switch label="فقط با ورود" checked={!!v.requiresLogin} onChange={(e) => set("requiresLogin", e.target.checked)} />
					<Switch label="روی کالاهای تخفیف‌خورده اعمال نشود" checked={!!v.excludeSaleItems} onChange={(e) => set("excludeSaleItems", e.target.checked)} />
					<Switch label="فعال" checked={!!v.isActive} onChange={(e) => set("isActive", e.target.checked)} />
				</div>

				<div className="field">
					<label>
						فقط برای این دسته‌ها <span className="opt">(خالی = همه)</span>
					</label>
					<MultiSelect
						options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
						value={(v.categoryIds ?? []).map(String)}
						onChange={(ids) => set("categoryIds", ids.map(Number))}
						placeholder="انتخاب دسته"
					/>
				</div>
				<ProductPicker label="فقط برای این محصول‌ها" labelNote="خالی = همه" value={v.productIds ?? []} onChange={(ids) => set("productIds", ids)} />
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
