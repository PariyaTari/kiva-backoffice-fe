"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TaxonomyEndpoints } from "@/app/(panel)/_api/taxonomyEndpoints";
import { ERROR_BEHAVIOUR } from "@/app/(panel)/categories/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import DataTable from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import Switch from "@/app/_components/ui/switch/switch";
import { toast } from "@/store/notification.store";
import { Color } from "@/types/order.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { withMappedError } from "@/utils/withMappedError";
import { ColorsEndpoints } from "../../_api/colorsEndpoints";

const KEY = /^[a-z][a-z0-9-]{1,30}$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;

/** `/colors` — the palette every colour variant picks from (swatches on cards, the colour filter). */
export default function ColorsView() {
	const [editing, setEditing] = useState<{ color: Color | null } | null>(null);

	const colors = useQuery({
		queryKey: ["taxonomy", "colors"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getColors()),
		meta: { showNotificationOnRefetch: true },
	});

	const columns: Column<Color>[] = [
		{ key: "order", title: "ترتیب", className: "nowrap", width: 60, render: (c) => toPersianDigits(c.sortOrder ?? 0) },
		{
			key: "swatch",
			title: "رنگ",
			render: (c) => (
				<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
					<span className="swatch-dot" style={{ background: c.hex, width: 28, height: 28 }} />
					<b>{c.name}</b>
				</span>
			),
		},
		{ key: "key", title: "کلید", className: "nowrap", render: (c) => <span className="code">{c.key}</span> },
		{ key: "hex", title: "کد", className: "nowrap", render: (c) => <span className="code">{c.hex}</span> },
		{ key: "light", title: "روشن", className: "nowrap", render: (c) => (c.isLight ? <Badge>روشن</Badge> : <span className="muted">—</span>) },
		{
			key: "count",
			title: "محصول",
			className: "nowrap",
			render: (c) => toPersianDigits(c.productCount ?? 0),
		},
		{
			key: "acts",
			title: "",
			className: "end",
			render: (c) => (
				<span className="row-acts">
					<button type="button" className="icon-btn" aria-label="ویرایش" title="ویرایش" onClick={() => setEditing({ color: c })}>
						<Icon name="edit" />
					</button>
				</span>
			),
		},
	];

	const colorsError = toErrorView(ERROR_BEHAVIOUR, colors.error, "دریافت رنگ‌ها با خطا مواجه شد.");

	return (
		<>
			<PageHead
				title="رنگ‌ها"
				subtitle="پالت رنگ‌های کیوا؛ هر رنگ محصول (ورینت) یکی از این‌هاست. رنگ حذف‌شدنی نیست."
				actions={
					<Button size="sm" onClick={() => setEditing({ color: null })} iconStart={<Icon name="plus" />}>
						رنگ جدید
					</Button>
				}
			/>
			{colors.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!colorsError ? (
				<ErrorComponent retryable={colorsError.retryable} ticketAble={colorsError.ticketAble} errorText={colorsError.errorText} executeFunction={() => colors.refetch()} loading={colors.isFetching} />
			) : !colors.error && !!colors.data ? (
				<DataTable caption="رنگ‌ها" columns={columns} rows={colors.data} rowKey={(c) => c.key} loading={colors.isFetching} />
			) : null}
			<p className="note" style={{ marginTop: 14 }}>
				برای دیدن محصولات یک رنگ از <Link href="/products">فهرست محصولات</Link> استفاده کن.
			</p>

			<Modal open={!!editing} onClose={() => setEditing(null)} width={480}>
				{editing && <ColorForm key={editing.color?.key ?? "new"} color={editing.color} nextSortOrder={(colors.data?.length ?? 0) + 1} onClose={() => setEditing(null)} />}
			</Modal>
		</>
	);
}

function ColorForm({ color, nextSortOrder, onClose }: { color: Color | null; nextSortOrder: number; onClose: () => void }) {
	const queryClient = useQueryClient();
	const [key, setKey] = useState(color?.key ?? "");
	const [name, setName] = useState(color?.name ?? "");
	const [hex, setHex] = useState(color?.hex ?? "#");
	const [isLight, setIsLight] = useState(color?.isLight ?? false);
	const [sortOrder, setSortOrder] = useState<number | null>(color?.sortOrder ?? nextSortOrder);
	const [touched, setTouched] = useState(false);

	const save = useMutation({
		mutationFn: () => {
			const payload = { key, name: name.trim(), hex: hex.toUpperCase(), isLight, sortOrder: sortOrder ?? 0 };
			return withMappedError(() => (color ? ColorsEndpoints.updateColor(color.key, payload) : ColorsEndpoints.createColor(payload)));
		},
		meta: { showNotification: true },
		onSuccess: (c) => {
			toast(`رنگ «${c.name}» ذخیره شد`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
			onClose();
		},
	});

	const local = { key: !KEY.test(key) ? "حروف کوچک لاتین، رقم و خط تیره (مثل lilac)." : null, name: !name.trim() ? "نام رنگ را بنویس." : null, hex: !HEX.test(hex) ? "مثل #C8B6E2" : null };
	const server = fieldErrorsOf(save.error);

	return (
		<>
			<ModalHead icon="palette" title={color ? `ویرایش «${color.name}»` : "رنگ جدید"} />
			<div className="m-body">
				<div className="form-grid">
					<Input label="نام" value={name} onChange={(e) => setName(e.target.value)} error={(touched && local.name) || server.name} />
					<Input label="کلید" labelNote="ثابت؛ در آدرس‌ها" direction="ltr" value={key} readOnly={!!color} onChange={(e) => setKey(e.target.value.toLowerCase())} error={(touched && local.key) || server.key} />
					<div className="field">
						<label>کد رنگ</label>
						<div style={{ display: "flex", gap: 8 }}>
							<input type="color" aria-label="انتخاب رنگ" value={HEX.test(hex) ? hex : "#000000"} onChange={(e) => setHex(e.target.value.toUpperCase())} style={{ width: 50, height: 50, border: 0, background: "none", padding: 0 }} />
							<input className="input ltr" value={hex} onChange={(e) => setHex(e.target.value)} aria-invalid={!!((touched && local.hex) || server.hex) || undefined} />
						</div>
						{((touched && local.hex) || server.hex) && <span className="err" style={{ display: "block" }}>{(touched && local.hex) || server.hex}</span>}
					</div>
					<NumberInput label="ترتیب" value={sortOrder} onChange={setSortOrder} />
				</div>
				<Switch label="رنگ روشن است (تیک تیره روی سواچ)" checked={isLight} onChange={(e) => setIsLight(e.target.checked)} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={save.isPending}>
					انصراف
				</Button>
				<Button
					onClick={() => {
						setTouched(true);
						if (!local.key && !local.name && !local.hex) save.mutate();
					}}
					isLoading={save.isPending}
				>
					ذخیره
				</Button>
			</div>
		</>
	);
}
