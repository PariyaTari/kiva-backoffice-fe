import type { Metadata } from "next";
import CategoriesView from "./_components/categoriesView/categoriesView";

export const metadata: Metadata = { title: "دسته‌بندی‌ها" };

/** `/categories` — FEATURES §1.1 #7 (ADMIN, CATALOG_MANAGER). */
export default function CategoriesPage() {
	return <CategoriesView />;
}
