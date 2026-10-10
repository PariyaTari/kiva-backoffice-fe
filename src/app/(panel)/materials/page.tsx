import type { Metadata } from "next";
import MaterialsView from "./_components/materialsView/materialsView";

export const metadata: Metadata = { title: "متریال‌ها" };

/** `/materials` — FEATURES §1.1 #7 (ADMIN, CATALOG_MANAGER). */
export default function MaterialsPage() {
	return <MaterialsView />;
}
