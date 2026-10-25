import type { Metadata } from "next";
import StockAlertsView from "./_components/stockAlertsView/stockAlertsView";

export const metadata: Metadata = { title: "موجود شد خبرم کن" };

/** `/stock-alerts` — who waits for which colour (`GET /admin/stock-alerts`, ADMIN, CATALOG_MANAGER). */
export default function StockAlertsPage() {
	return <StockAlertsView />;
}
