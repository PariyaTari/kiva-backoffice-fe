import type { Metadata } from "next";
import ColorsView from "./_components/colorsView/colorsView";

export const metadata: Metadata = { title: "رنگ‌ها" };

/** `/colors` — FEATURES §1.1 #7 (ADMIN, CATALOG_MANAGER). */
export default function ColorsPage() {
	return <ColorsView />;
}
