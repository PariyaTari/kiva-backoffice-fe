"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TaxonomyEndpoints } from "@/app/(panel)/_api/taxonomyEndpoints";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import SeoFields from "@/app/_components/panel/seoFields/seoFields";
import SingleMediaField, { PickedMedia } from "@/app/_components/panel/singleMediaField/singleMediaField";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import Select from "@/app/_components/ui/select/select";
import Switch from "@/app/_components/ui/switch/switch";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { AdminCategory, BagType, CategoryUpsertRequest } from "@/types/catalog.type";
import { SeoMeta, toSeoInput } from "@/types/common.type";
import { fieldErrorsWith } from "@/utils/fieldErrors";
import { BAG_TYPE, optionsOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { CategoriesEndpoints } from "../../_api/categoriesEndpoints";

const SLUG = /^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*$/;
type CategoryModalProps = { category: AdminCategory | null; open: boolean; onClose: () => void; nextSortOrder: number };

/**
 * `CategoryUpsertRequest` — name, slug, menu icon (bag type + colour, both required), image (`purpose=CATEGORY`,
 * photos only), order, menu visibility, SEO (title / description / noindex). A new slug breaks the old links.
 */
export default function CategoryModal({ category, open, onClose, nextSortOrder }: CategoryModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={680}>
			<CategoryForm category={category} onClose={onClose} nextSortOrder={nextSortOrder} />
		</Modal>
	);
}

function CategoryForm({ category, onClose, nextSortOrder }: Omit<CategoryModalProps, "open">) {
	const queryClient = useQueryClient();
	const [name, setName] = useState(category?.name ?? "");
	const [slug, setSlug] = useState(category?.slug ?? "");
	const [description, setDescription] = useState(category?.description ?? "");
	const [bagType, setBagType] = useState<BagType>(category?.icon?.bagType ?? "HOBO");
	const [colorKey, setColorKey] = useState(category?.icon?.colorKey ?? "lilac");
	const [image, setImage] = useState<PickedMedia>(category?.imageMediaId && category.imageUrl ? { id: category.imageMediaId, url: category.imageUrl } : null);
	const [sortOrder, setSortOrder] = useState<number | null>(category?.sortOrder ?? nextSortOrder);
	const [showInMenu, setShowInMenu] = useState(category?.showInMenu ?? true);
	const [seo, setSeo] = useState<SeoMeta>(category?.seo ?? {});
	const [touched, setTouched] = useState(false);

	const colors = useQuery({
		queryKey: ["taxonomy", "colors"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getColors()),
		meta: { showNotification: true },
	});

	const payload = (): CategoryUpsertRequest => ({
		name: name.trim(),
		slug: slug.trim(),
		description: description.trim() || null,
		iconBagType: bagType,
		iconColorKey: colorKey,
		imageMediaId: image?.id ?? null,
		sortOrder: sortOrder ?? 0,
		showInMenu,
		seo: toSeoInput(seo),
	});

	const save = useMutation({
		mutationFn: () => withMappedError(() => (category ? CategoriesEndpoints.update(category.id, payload()) : CategoriesEndpoints.create(payload()))),
		meta: { showNotification: true },
		onSuccess: (c) => {
			toast(category ? `دسته‌ی «${c.name}» ذخیره شد` : `دسته‌ی «${c.name}» ساخته شد`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
			onClose();
		},
	});

	const local = {
		name: !name.trim() ? "نام دسته را بنویس." : name.length > 100 ? "حداکثر ۱۰۰ حرف." : null,
		slug: !SLUG.test(slug) || slug.length > 100 ? "فقط حروف کوچک لاتین، رقم و خط تیره (مثل shoulder)." : null,
		iconColorKey: !colorKey ? "رنگ آیکن را انتخاب کن." : null,
		description: description.length > 500 ? "حداکثر ۵۰۰ حرف." : null,
	};
	const server = fieldErrorsWith(save.error, { DUPLICATE_SLUG: "slug" });
	const submit = () => {
		setTouched(true);
		if (!Object.values(local).some(Boolean)) save.mutate();
	};

	return (
		<>
			<ModalHead icon="layers" title={category ? `ویرایش «${category.name}»` : "دسته‌ی جدید"} subtitle="مگامنو، چیپ‌های فروشگاه و بخش دسته‌بندی صفحه‌ی اصلی" />
			<div className="m-body">
				<div className="form-grid">
					<Input label="نام" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} error={(touched && local.name) || server.name} />
					<Input
						label="slug"
						direction="ltr"
						value={slug}
						onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
						error={(touched && local.slug) || server.slug}
						hint={slug ? `/products?category=${slug}${category && slug !== category.slug ? " — لینک‌های قبلی دیگر کار نمی‌کنند" : ""}` : undefined}
					/>
					<Select label="آیکن: نوع کیف" value={bagType} onChange={(e) => setBagType(e.target.value as BagType)} options={optionsOf(BAG_TYPE)} error={server.iconBagType} />
					<Select
						label="آیکن: رنگ"
						value={colorKey}
						onChange={(e) => setColorKey(e.target.value)}
						options={(colors.data ?? []).map((c) => ({ value: c.key, label: c.name }))}
						error={(touched && local.iconColorKey) || server.iconColorKey}
					/>
					<NumberInput label="ترتیب" value={sortOrder} onChange={setSortOrder} />
					<div className="field" style={{ justifyContent: "flex-end" }}>
						<Switch label="در منو نمایش داده شود" checked={showInMenu} onChange={(e) => setShowInMenu(e.target.checked)} />
					</div>
				</div>
				<Textarea
					label="توضیح"
					labelNote="اختیاری"
					maxLength={500}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					error={(touched && local.description) || server.description}
					style={{ minHeight: 70 }}
				/>
				<SingleMediaField label="عکس دسته" labelNote="اختیاری، فقط عکس؛ بدون عکس، آیکن کیف نمایش داده می‌شود" purpose="CATEGORY" value={image} onChange={setImage} error={server.imageMediaId} />
				<details>
					<summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14 }}>SEO</summary>
					<div style={{ marginTop: 12 }}>
						<SeoFields serverBuilt value={seo} onChange={setSeo} errors={server} titlePlaceholder={name ? `${name} | کیوا` : undefined} />
					</div>
				</details>
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={save.isPending}>
					انصراف
				</Button>
				<Button onClick={submit} isLoading={save.isPending}>
					{category ? "ذخیره" : "ساخت دسته"}
				</Button>
			</div>
		</>
	);
}
