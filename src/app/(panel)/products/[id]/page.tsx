import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductEditView from "../_components/productEditView/productEditView";

export const metadata: Metadata = { title: "ویرایش محصول" };

type Props = { params: Promise<{ id: string }> };

/** `/products/12`. */
export default async function ProductPage({ params }: Props) {
	const { id } = await params;
	if (!/^\d+$/.test(id)) notFound();
	return <ProductEditView id={Number(id)} />;
}
