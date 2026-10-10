import type { Metadata } from "next";
import ProductEditView from "../_components/productEditView/productEditView";

export const metadata: Metadata = { title: "محصول جدید" };

/** `/products/new`. */
export default function NewProductPage() {
	return <ProductEditView id={null} />;
}
