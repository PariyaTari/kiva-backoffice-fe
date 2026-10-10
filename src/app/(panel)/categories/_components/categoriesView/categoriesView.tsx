"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TaxonomyEndpoints } from "@/app/(panel)/_api/taxonomyEndpoints";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import ConfirmModal from "@/app/_components/panel/confirmModal/confirmModal";
import DataTable from "@/app/_components/panel/dataTable/dataTable";
import { Column } from "@/app/_components/panel/dataTable/dataTable.type";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import { toast } from "@/store/notification.store";
import { Category } from "@/types/catalog.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { BAG_TYPE, labelOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { CategoriesEndpoints } from "../../_api/categoriesEndpoints";
import { ERROR_BEHAVIOUR } from "../../_utils/apiError";
import CategoryModal from "../categoryModal/categoryModal";

/** `/categories` — the catalogue's categories (FEATURES §2.1): order, menu visibility, icon, image, SEO. */
export default function CategoriesView() {
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<{ category: Category | null } | null>(null);
	const [removing, setRemoving] = useState<Category | null>(null);

	const categories = useQuery({
		queryKey: ["taxonomy", "adminCategories"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getAdminCategories()),
		meta: { showNotificationOnRefetch: true },
	});

	const remove = useMutation({
		mutationFn: (c: Category) => withMappedError(() => CategoriesEndpoints.remove(c.id)),
		meta: { showNotification: true },
		onSuccess: (_, c) => {
			toast(`دسته‌ی «${c.name}» حذف شد`, { icon: "check" });
			setRemoving(null);
			queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
		},
	});

	const columns: Column<Category>[] = [
		{ key: "order", title: "ترتیب", className: "nowrap", width: 60, render: (c) => toPersianDigits(c.sortOrder) },
		{
			key: "name",
			title: "دسته",
			render: (c) => (
				<span className="cell-prod" style={{ minWidth: 160 }}>
					<span className="th-img">
						{/* eslint-disable-next-line @next/next/no-img-element -- media URL */}
						{c.imageUrl ? <img src={c.imageUrl} alt="" /> : <Icon name="bag" style={{ width: 22, height: 22, margin: 9, color: "var(--purple)" }} />}
					</span>
					<span>
						<b>{c.name}</b>
						<span className="sub ltr">{c.slug}</span>
					</span>
				</span>
			),
		},
		{ key: "icon", title: "آیکن", className: "nowrap", render: (c) => (c.icon ? `${labelOf(BAG_TYPE, c.icon.bagType)} · ${c.icon.colorKey}` : "—") },
		{
			key: "count",
			title: "محصول",
			className: "nowrap",
			render: (c) => (
				<Link href={`/products?category=${c.slug}`} style={{ color: "var(--purple)" }}>
					{toPersianDigits(c.productCount)}
				</Link>
			),
		},
		{ key: "menu", title: "منو", className: "nowrap", render: (c) => (c.showInMenu ? <Badge tone="SUCCESS">در منو</Badge> : <Badge>پنهان</Badge>) },
		{
			key: "acts",
			title: "",
			className: "end",
			render: (c) => (
				<span className="row-acts">
					<button type="button" className="icon-btn" aria-label="ویرایش" title="ویرایش" onClick={() => setEditing({ category: c })}>
						<Icon name="edit" />
					</button>
					<button type="button" className="icon-btn del" aria-label="حذف" title="حذف" onClick={() => setRemoving(c)}>
						<Icon name="trash" />
					</button>
				</span>
			),
		},
	];

	const categoriesError = toErrorView(ERROR_BEHAVIOUR, categories.error, "دریافت دسته‌بندی‌ها با خطا مواجه شد.");
	const nextSortOrder = (categories.data?.reduce((m, c) => Math.max(m, c.sortOrder), 0) ?? 0) + 1;

	return (
		<>
			<PageHead
				title="دسته‌بندی‌ها"
				subtitle="مگامنو، منوی موبایل، چیپ‌های فروشگاه و بخش دسته‌بندی صفحه‌ی اصلی."
				actions={
					<Button size="sm" onClick={() => setEditing({ category: null })} iconStart={<Icon name="plus" />}>
						دسته‌ی جدید
					</Button>
				}
			/>
			{categories.isLoading ? (
				<div className="tbl-wrap">
					<Loading />
				</div>
			) : !!categoriesError ? (
				<ErrorComponent
					retryable={categoriesError.retryable}
					ticketAble={categoriesError.ticketAble}
					errorText={categoriesError.errorText}
					executeFunction={() => categories.refetch()}
					loading={categories.isFetching}
				/>
			) : !categories.error && !!categories.data ? (
				<DataTable caption="دسته‌بندی‌ها" columns={columns} rows={categories.data} rowKey={(c) => c.id} loading={categories.isFetching} />
			) : null}

			<CategoryModal key={editing?.category?.id ?? "new"} category={editing?.category ?? null} open={!!editing} onClose={() => setEditing(null)} nextSortOrder={nextSortOrder} />
			<ConfirmModal
				open={!!removing}
				onClose={() => setRemoving(null)}
				tone="danger"
				icon="trash"
				title="حذف دسته"
				text={removing ? `«${removing.name}» حذف شود؟ فقط دسته‌ی بدون محصول حذف می‌شود.` : undefined}
				confirmLabel="حذف"
				loading={remove.isPending}
				onConfirm={() => removing && remove.mutate(removing)}
			/>
		</>
	);
}
