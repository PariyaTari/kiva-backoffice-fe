"use client";

import Input from "@/app/_components/ui/input/input";
import Switch from "@/app/_components/ui/switch/switch";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { SeoMeta } from "@/types/common.type";
import { toPersianDigits } from "@/utils/digits";

const DESCRIPTION_MAX = 170;

type SeoFieldsProps = {
	value: SeoMeta;
	onChange: (value: SeoMeta) => void;
	/** Server field errors keyed by path (`seo.description`, …). */
	errors?: Record<string, string>;
	/** What the title falls back to on the storefront when empty (the entity's name). */
	titlePlaceholder?: string;
};

/**
 * The SEO block every storefront page entity has (FEATURES §2.16): title, description ≤ 170, canonical, OG image,
 * `noIndex`. `jsonLd` is left to the server (it builds Product/Article data itself).
 */
export default function SeoFields({ value, onChange, errors = {}, titlePlaceholder }: SeoFieldsProps) {
	const set = (patch: Partial<SeoMeta>) => onChange({ ...value, ...patch });
	const description = value.description ?? "";

	return (
		<div className="stack">
			<Input label="عنوان صفحه" labelNote="title" value={value.title ?? ""} placeholder={titlePlaceholder} onChange={(e) => set({ title: e.target.value || null })} error={errors["seo.title"]} />
			<Textarea
				label="توضیح"
				labelNote="meta description"
				maxLength={DESCRIPTION_MAX}
				value={description}
				onChange={(e) => set({ description: e.target.value || null })}
				error={errors["seo.description"]}
				footer={
					<small className="muted">
						{toPersianDigits(description.length)} / {toPersianDigits(DESCRIPTION_MAX)}
					</small>
				}
				style={{ minHeight: 80 }}
			/>
			<div className="form-grid">
				<Input label="آدرس canonical" labelNote="اختیاری" direction="ltr" value={value.canonicalUrl ?? ""} onChange={(e) => set({ canonicalUrl: e.target.value || null })} error={errors["seo.canonicalUrl"]} />
				<Input label="تصویر اشتراک‌گذاری (OG)" labelNote="اختیاری" direction="ltr" value={value.ogImageUrl ?? ""} onChange={(e) => set({ ogImageUrl: e.target.value || null })} error={errors["seo.ogImageUrl"]} />
			</div>
			<Switch label="از نتایج جستجو پنهان باشد (noindex)" checked={!!value.noIndex} onChange={(e) => set({ noIndex: e.target.checked })} />
		</div>
	);
}
