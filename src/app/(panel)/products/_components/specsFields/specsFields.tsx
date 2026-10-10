"use client";

import { Icon } from "@/app/_components/icon/icons";
import ChipsInput from "@/app/_components/panel/chipsInput/chipsInput";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import Checkbox from "@/app/_components/ui/checkbox/checkbox";
import Input from "@/app/_components/ui/input/input";
import Select from "@/app/_components/ui/select/select";
import Switch from "@/app/_components/ui/switch/switch";
import { ClosureType, Occasion, ProductSpecs, StrapInfo, StrapType } from "@/types/catalog.type";
import { CLOSURE_TYPE, OCCASION, optionsOf, STRAP_TYPE } from "@/utils/labels";

type SpecsFieldsProps = { value: ProductSpecs; onChange: (value: ProductSpecs) => void };

/**
 * The structured `ProductSpecs` (FEATURES §4.1) — the storefront builds the «مشخصات» tab and filters from them.
 * Dimensions, weight, closure, straps, pockets, occasions, lining, hardware, made in, care, warranty.
 */
export default function SpecsFields({ value, onChange }: SpecsFieldsProps) {
	const set = (patch: Partial<ProductSpecs>) => onChange({ ...value, ...patch });
	const dims = value.dimensions ?? null;
	const setDim = (key: "lengthCm" | "heightCm" | "widthCm", n: number | null) => {
		const next = { lengthCm: dims?.lengthCm ?? 0, heightCm: dims?.heightCm ?? 0, widthCm: dims?.widthCm ?? 0, [key]: n ?? 0 };
		set({ dimensions: next.lengthCm || next.heightCm || next.widthCm ? next : null });
	};
	const straps = value.straps ?? [];
	const setStrap = (i: number, patch: Partial<StrapInfo>) => set({ straps: straps.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
	const occasions = (value.occasions ?? []).map((o) => o.code);

	return (
		<div className="stack">
			<div className="form-grid g4">
				<NumberInput label="طول (سانتی‌متر)" decimal value={dims?.lengthCm || null} onChange={(n) => setDim("lengthCm", n)} />
				<NumberInput label="ارتفاع" decimal value={dims?.heightCm || null} onChange={(n) => setDim("heightCm", n)} />
				<NumberInput label="عرض" decimal value={dims?.widthCm || null} onChange={(n) => setDim("widthCm", n)} />
				<NumberInput label="وزن (گرم)" value={value.weightGrams ?? null} onChange={(n) => set({ weightGrams: n })} />
			</div>
			<div className="form-grid g3">
				<Select
					label="بسته شدن"
					placeholder="—"
					value={value.closure?.type ?? ""}
					onChange={(e) => set({ closure: e.target.value ? { type: e.target.value as ClosureType, label: CLOSURE_TYPE[e.target.value as ClosureType] } : null })}
					options={optionsOf(CLOSURE_TYPE)}
				/>
				<NumberInput label="جای لپ‌تاپ تا (اینچ)" labelNote="اختیاری" decimal value={value.laptopMaxInch ?? null} onChange={(n) => set({ laptopMaxInch: n })} />
				<Input label="ساخت" value={value.madeIn ?? ""} placeholder="ایران" onChange={(e) => set({ madeIn: e.target.value })} />
			</div>

			<div className="field">
				<label>بند و دسته</label>
				<div className="rows">
					{straps.map((s, i) => (
						<div key={i} className="row-card">
							<div className="form-grid g4">
								<Select label="نوع" value={s.type ?? "SHOULDER"} onChange={(e) => setStrap(i, { type: e.target.value as StrapType })} options={optionsOf(STRAP_TYPE)} />
								<Input label="توضیح" value={s.label ?? ""} placeholder="بند دوشی ثابت ۵۵ سانتی‌متر" onChange={(e) => setStrap(i, { label: e.target.value })} wrapperClassName="full" />
								<NumberInput label="طول (سانتی‌متر)" value={s.lengthCm ?? null} onChange={(n) => setStrap(i, { lengthCm: n })} />
							</div>
							<div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
								<Checkbox label="قابل تنظیم" checked={!!s.adjustable} onChange={(e) => setStrap(i, { adjustable: e.target.checked })} />
								<Checkbox label="جداشونده" checked={!!s.detachable} onChange={(e) => setStrap(i, { detachable: e.target.checked })} />
								<button type="button" className="btn btn-link" style={{ color: "var(--danger)", marginInlineStart: "auto" }} onClick={() => set({ straps: straps.filter((_, k) => k !== i) })}>
									<Icon name="trash" /> حذف
								</button>
							</div>
						</div>
					))}
					<button type="button" className="add-row" onClick={() => set({ straps: [...straps, { type: "SHOULDER", label: "", adjustable: false, detachable: false }] })}>
						<Icon name="plus" /> افزودن بند
					</button>
				</div>
			</div>

			<Input
				label="جیب‌ها"
				value={value.pockets?.summary ?? ""}
				placeholder="۱ جیب زیپ‌دار داخلی، ۲ جیب موبایل"
				onChange={(e) => set({ pockets: e.target.value ? { ...(value.pockets ?? {}), summary: e.target.value } : null })}
			/>

			<div className="field">
				<label>مناسب برای</label>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
					{optionsOf(OCCASION).map((o) => (
						<Checkbox
							key={o.value}
							label={o.label}
							checked={occasions.includes(o.value as Occasion)}
							onChange={(e) =>
								set({
									occasions: (e.target.checked ? [...occasions, o.value as Occasion] : occasions.filter((c) => c !== o.value)).map((code) => ({ code, label: OCCASION[code] })),
								})
							}
						/>
					))}
				</div>
			</div>

			<div className="form-grid g4">
				<Input label="جنس آستر" value={value.lining?.material ?? ""} onChange={(e) => set({ lining: { ...(value.lining ?? {}), material: e.target.value } })} />
				<Input label="رنگ آستر" value={value.lining?.color ?? ""} onChange={(e) => set({ lining: { ...(value.lining ?? {}), color: e.target.value } })} />
				<Input label="یراق‌آلات" value={value.hardware?.material ?? ""} placeholder="فلز ضدزنگ" onChange={(e) => set({ hardware: { ...(value.hardware ?? {}), material: e.target.value } })} />
				<Input label="روکش یراق" value={value.hardware?.finish ?? ""} placeholder="طلایی مات" onChange={(e) => set({ hardware: { ...(value.hardware ?? {}), finish: e.target.value } })} />
			</div>
			<Input label="دوخت" value={value.stitching ?? ""} placeholder="دوخت دولایه و لبه‌دوزی دستی" onChange={(e) => set({ stitching: e.target.value || null })} />
			<div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
				<Switch label="ضدآب" checked={!!value.waterproof} onChange={(e) => set({ waterproof: e.target.checked })} />
				<Switch label="دست‌دوز" checked={!!value.handmade} onChange={(e) => set({ handmade: e.target.checked })} />
			</div>
			<ChipsInput label="نگهداری" labelNote="هر مورد یک چیپ" value={value.careInstructions ?? []} onChange={(careInstructions) => set({ careInstructions })} />
			<div className="form-grid">
				<NumberInput label="ضمانت (ماه)" labelNote="اختیاری" value={value.warranty?.months ?? null} onChange={(months) => set({ warranty: months ? { ...(value.warranty ?? {}), months } : null })} />
				<Input
					label="توضیح ضمانت"
					value={value.warranty?.description ?? ""}
					placeholder="ضمانت ۶ ماهه‌ی دوخت و یراق‌آلات"
					onChange={(e) => set({ warranty: { ...(value.warranty ?? {}), description: e.target.value } })}
				/>
			</div>
		</div>
	);
}
