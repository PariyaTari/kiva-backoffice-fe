"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TaxonomyEndpoints } from "@/app/(panel)/_api/taxonomyEndpoints";
import { ERROR_BEHAVIOUR } from "@/app/(panel)/categories/_utils/apiError";
import { ColorsEndpoints } from "@/app/(panel)/colors/_api/colorsEndpoints";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import ChipsInput from "@/app/_components/panel/chipsInput/chipsInput";
import DataTable from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import Select from "@/app/_components/ui/select/select";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { toast } from "@/store/notification.store";
import { Material, MaterialFamily } from "@/types/catalog.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { labelOf, MATERIAL_FAMILY, optionsOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";

const SLUG = /^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*$/;

const COLUMNS: Column<Material>[] = [
	{
		key: "name",
		title: "متریال",
		render: (m) => (
			<>
				<b>{m.name}</b>
				<span className="sub ltr">{m.slug}</span>
			</>
		),
	},
	{ key: "family", title: "خانواده", className: "nowrap", render: (m) => labelOf(MATERIAL_FAMILY, m.family) },
	{ key: "care", title: "نگهداری", render: (m) => (m.careInstructions.length ? m.careInstructions.join("، ") : <span className="muted">—</span>) },
	{ key: "count", title: "محصول", className: "nowrap", render: (m) => toPersianDigits(m.productCount ?? 0) },
];

/** `/materials` — product materials (filters and the «مشخصات» tab). The contract only allows adding (FEATURES §7 #6). */
export default function MaterialsView() {
	const [adding, setAdding] = useState(false);

	const materials = useQuery({
		queryKey: ["taxonomy", "materials"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getMaterials()),
		meta: { showNotificationOnRefetch: true },
	});

	const materialsError = toErrorView(ERROR_BEHAVIOUR, materials.error, "دریافت متریال‌ها با خطا مواجه شد.");

	return (
		<>
			<PageHead
				title="متریال‌ها"
				subtitle="جنس محصولات؛ فیلتر فروشگاه و جدول مشخصات از این‌ها می‌خوانند."
				actions={
					<Button size="sm" onClick={() => setAdding(true)} iconStart={<Icon name="plus" />}>
						متریال جدید
					</Button>
				}
			/>
			{materials.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!materialsError ? (
				<ErrorComponent
					retryable={materialsError.retryable}
					ticketAble={materialsError.ticketAble}
					errorText={materialsError.errorText}
					executeFunction={() => materials.refetch()}
					loading={materials.isFetching}
				/>
			) : !materials.error && !!materials.data ? (
				<DataTable caption="متریال‌ها" columns={COLUMNS} rows={materials.data} rowKey={(m) => m.id} loading={materials.isFetching} />
			) : null}
			<p className="note" style={{ marginTop: 14 }}>
				ویرایش و حذف متریال در کانترکت فعلی endpoint ندارد؛ برای اصلاح، با تیم بک‌اند هماهنگ کن.
			</p>

			<Modal open={adding} onClose={() => setAdding(false)} width={560}>
				<MaterialForm onClose={() => setAdding(false)} />
			</Modal>
		</>
	);
}

function MaterialForm({ onClose }: { onClose: () => void }) {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [family, setFamily] = useState<MaterialFamily | "">("");
	const [description, setDescription] = useState("");
	const [care, setCare] = useState<string[]>([]);
	const [touched, setTouched] = useState(false);

	const save = useMutation({
		mutationFn: () =>
			withMappedError(() =>
				ColorsEndpoints.createMaterial({ name: name.trim(), slug, family: family as MaterialFamily, description: description.trim() || null, careInstructions: care }),
			),
		meta: { showNotification: true },
		onSuccess: (m) => {
			toast(`متریال «${m.name}» اضافه شد`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
			onClose();
		},
	});

	const local = { name: !name.trim() ? "نام را بنویس." : null, slug: !SLUG.test(slug) ? "حروف کوچک لاتین، رقم و خط تیره." : null, family: !family ? "خانواده را انتخاب کن." : null };
	const server = fieldErrorsOf(save.error);

	return (
		<>
			<ModalHead icon="leaf" title="متریال جدید" />
			<div className="m-body">
				<div className="form-grid">
					<Input label="نام" value={name} onChange={(e) => setName(e.target.value)} error={(touched && local.name) || server.name} placeholder="چرم طبیعی گاوی" />
					<Input label="slug" direction="ltr" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} error={(touched && local.slug) || server.slug} placeholder="genuine-cow-leather" />
					<Select label="خانواده" placeholder="انتخاب" value={family} onChange={(e) => setFamily(e.target.value as MaterialFamily)} options={optionsOf(MATERIAL_FAMILY)} error={(touched && local.family) || server.family} wrapperClassName="full" />
				</div>
				<Textarea label="توضیح" labelNote="اختیاری" value={description} onChange={(e) => setDescription(e.target.value)} style={{ minHeight: 70 }} />
				<ChipsInput label="نگهداری" labelNote="هر مورد یک چیپ" value={care} onChange={setCare} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={save.isPending}>
					انصراف
				</Button>
				<Button
					onClick={() => {
						setTouched(true);
						if (!local.name && !local.slug && !local.family) save.mutate();
					}}
					isLoading={save.isPending}
				>
					افزودن
				</Button>
			</div>
		</>
	);
}
