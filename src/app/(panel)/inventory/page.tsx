import type { Metadata } from "next";
import InventoryView from "./_components/inventoryView/inventoryView";

export const metadata: Metadata = { title: "موجودی انبار" };

/** `/inventory` — FEATURES §1.1 #6 (ADMIN, CATALOG_MANAGER). */
export default function InventoryPage() {
	return <InventoryView />;
}
