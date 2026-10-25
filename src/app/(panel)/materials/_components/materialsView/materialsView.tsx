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
import ConfirmModal from "@/app/_components/panel/confirmModal/confirmModal";
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
import { Material, MaterialFamily, MaterialUpsertRequest } from "@/types/catalog.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsWith } from "@/utils/fieldErrors";
import { labelOf, MATERIAL_FAMILY, optionsOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";

const SLUG = /^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * `/materials` — product materials (the shop's filter and the «مشخصات» tab): `GET /admin/materials` with product
 * counts, add, edit, and delete one no product uses (`409 IN_USE` otherwise).
 */
export default function MaterialsView() {
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<{ material: Material | null } | null>(null);
	const [removing, setRemoving] = useState<Material | null>(null);

	const materials = useQuery({
		queryKey: ["taxonomy", "materials"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getMaterials()),
		meta: { showNotificationOnRefetch: true },
	});

	const remove = useMutation({
		mutationFn: (m: Material) => withMappedError(() => ColorsEndpoints.deleteMaterial(m.id)),
		meta: { showNotification: true },
		onSuccess: (_, m) => {
			toast(`متریال «${m.name}» حذف شد`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["taxonomy", "materials"] });
			setRemoving(null);
		},
	});

	const columns: Column<Material>[] = [
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
		{
			key: "acts",
			title: "",
			className: "end",
			render: (m) => (
				<span className="row-acts">
					<button type="button" className="icon-btn" aria-label="ویرایش" title="ویرایش" onClick={() => setEditing({ material: m })}>
						<Icon name="edit" />
					</button>
					<button
						type="button"
						className="icon-btn del"
						aria-label="حذف"
						title={m.productCount ? `${toPersianDigits(m.productCount)} محصول از این متریال است` : "حذف"}
						disabled={!!m.productCount}
						onClick={() => setRemoving(m)}
					>
						<Icon name="trash" />
					</button>
				</span>
			),
		},
	];

	const materialsError = toErrorView(ERROR_BEHAVIOUR, materials.error, "دریافت متریال‌ها با خطا مواجه شد.");

	return (
		<>
			<PageHead
				title="متریال‌ها"
				subtitle="جنس محصولات؛ فیلتر فروشگاه و جدول مشخصات از این‌ها می‌خوانند. فقط متریالی که هیچ محصولی ندارد حذف می‌شود."
				actions={
					<Button size="sm" onClick={() => setEditing({ material: null })} iconStart={<Icon name="plus" />}>
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
				<DataTable caption="متریال‌ها" columns={columns} rows={materials.data} rowKey={(m) => m.id} loading={materials.isFetching} />
			) : null}

			<ConfirmModal
				open={!!removing}
				onClose={() => setRemoving(null)}
				icon="trash"
				tone="danger"
				title="حذف متریال"
				text={removing ? `«${removing.name}» حذف شود؟` : undefined}
				confirmLabel="حذف"
				loading={remove.isPending}
				onConfirm={() => removing && remove.mutate(removing)}
			/>

			<Modal open={!!editing} onClose={() => setEditing(null)} width={560}>
				{editing && <MaterialForm key={editing.material?.id ?? "new"} material={editing.material} onClose={() => setEditing(null)} />}
			</Modal>
		</>
	);
}

function MaterialForm({ material, onClose }: { material: Material | null; onClose: () => void }) {
	const queryClient = useQueryClient();
	const [name, setName] = useState(material?.name ?? "");
	const [slug, setSlug] = useState(material?.slug ?? "");
	const [family, setFamily] = useState<MaterialFamily | "">(material?.family ?? "");
	const [description, setDescription] = useState(material?.description ?? "");
	const [care, setCare] = useState<string[]>(material?.careInstructions ?? []);
	const [touched, setTouched] = useState(false);

	const payload = (): MaterialUpsertRequest => ({ name: name.trim(), slug, family: family as MaterialFamily, description: description.trim() || null, careInstructions: care });
	const save = useMutation({
		mutationFn: () => withMappedError(() => (material ? ColorsEndpoints.updateMaterial(material.id, payload()) : ColorsEndpoints.createMaterial(payload()))),
		meta: { showNotification: true },
		onSuccess: (m) => {
			toast(material ? `متریال «${m.name}» ذخیره شد` : `متریال «${m.name}» اضافه شد`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
			onClose();
		},
	});

	const local = {
		name: !name.trim() ? "نام را بنویس." : name.length > 120 ? "حداکثر ۱۲۰ حرف." : null,
		slug: !SLUG.test(slug) || slug.length > 100 ? "حروف کوچک لاتین، رقم و خط تیره." : null,
		family: !family ? "خانواده را انتخاب کن." : null,
	};
	const server = fieldErrorsWith(save.error, { DUPLICATE_SLUG: "slug" });

	return (
		<>
			<ModalHead icon="leaf" title={material ? `ویرایش «${material.name}»` : "متریال جدید"} subtitle={material?.productCount ? `${toPersianDigits(material.productCount)} محصول؛ نام تازه در جستجوی آن‌ها هم می‌نشیند.` : undefined} />
			<div className="m-body">
				<div className="form-grid">
					<Input label="نام" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} error={(touched && local.name) || server.name} placeholder="چرم طبیعی گاوی" />
					<Input label="slug" direction="ltr" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} error={(touched && local.slug) || server.slug} placeholder="genuine-cow-leather" />
					<Select label="خانواده" placeholder="انتخاب" value={family} onChange={(e) => setFamily(e.target.value as MaterialFamily)} options={optionsOf(MATERIAL_FAMILY)} error={(touched && local.family) || server.family} wrapperClassName="full" />
				</div>
				<Textarea label="توضیح" labelNote="اختیاری" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} error={server.description} style={{ minHeight: 70 }} />
				<ChipsInput label="نگهداری" labelNote="هر مورد یک چیپ، حداکثر ۱۰" max={10} maxLength={200} value={care} onChange={setCare} error={server.careInstructions} />
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
					{material ? "ذخیره" : "افزودن"}
				</Button>
			</div>
		</>
	);
}
