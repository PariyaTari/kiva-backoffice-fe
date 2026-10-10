"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { TableEmpty } from "@/app/_components/panel/dataTable/dataTable";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import { toErrorView } from "@/utils/apiError";
import { formatDateTime } from "@/utils/format";
import { PRODUCT_STATUS, PRODUCT_STATUS_TONE } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ProductsEndpoints } from "../../_api/productsEndpoints";
import { ERROR_BEHAVIOUR, isProductNotFoundError } from "../../_utils/apiError";
import ProductForm from "../productForm/productForm";
import ProductStatusCard from "../productStatusCard/productStatusCard";
import VariantsSection from "../variantsSection/variantsSection";

const BACK = { href: "/products", label: "محصولات" };

/** `/products/[id]` (edit) and `/products/new` (`id = null`): the product document, its publication and its colours. */
export default function ProductEditView({ id }: { id: number | null }) {
	const router = useRouter();

	const product = useQuery({
		queryKey: ["products", "detail", id],
		queryFn: () => withMappedError(() => ProductsEndpoints.getProduct(id as number)),
		enabled: id !== null,
		meta: { showNotificationOnRefetch: true },
	});

	if (id === null)
		return (
			<>
				<PageHead title="محصول جدید" back={BACK} subtitle="بعد از ساخت، عکس هر رنگ را اضافه کن و منتشرش کن." />
				<ProductForm product={null} onCreated={(p) => router.replace(`/products/${p.id}`)} />
			</>
		);

	const productMissing = isProductNotFoundError(product.error);
	const productError = productMissing ? null : toErrorView(ERROR_BEHAVIOUR, product.error, "دریافت محصول با خطا مواجه شد.");

	if (product.isLoading) return <Loading />;
	if (productMissing)
		return (
			<>
				<PageHead title="محصول" back={BACK} />
				<div className="tbl-wrap">
					<TableEmpty icon="bag" title="این محصول پیدا نشد" />
				</div>
			</>
		);
	if (productError)
		return (
			<>
				<PageHead title="محصول" back={BACK} />
				<ErrorComponent
					retryable={productError.retryable}
					ticketAble={productError.ticketAble}
					errorText={productError.errorText}
					executeFunction={() => product.refetch()}
					loading={product.isFetching}
				/>
			</>
		);
	if (!product.data) return null;
	const p = product.data;

	return (
		<>
			<PageHead
				back={BACK}
				title={
					<span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
						{p.name}
						<StatusTag value={p.status} labels={PRODUCT_STATUS} tones={PRODUCT_STATUS_TONE} />
					</span>
				}
				subtitle={
					<>
						<span className="ltr">{p.sku}</span> · {p.category?.name} · آخرین ویرایش {formatDateTime(p.updatedAt)}
					</>
				}
			/>
			<div className="edit-grid">
				<ProductForm product={p} />
				<aside>
					<ProductStatusCard product={p} />
				</aside>
			</div>
			<VariantsSection product={p} />
		</>
	);
}
