import type { Metadata } from "next";
import ProductsView from "./_components/productsView/productsView";

export const metadata: Metadata = { title: "محصولات" };

/** `/products` — FEATURES §1.1 #5 (ADMIN, CATALOG_MANAGER). */
export default function ProductsPage() {
	return <ProductsView />;
}
