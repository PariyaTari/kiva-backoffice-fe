import type { Metadata } from "next";
import OrdersView from "./_components/ordersView/ordersView";

export const metadata: Metadata = { title: "سفارش‌ها" };

/** `/orders` — FEATURES §1.1 #2 (ADMIN, OPERATOR). */
export default function OrdersPage() {
	return <OrdersView />;
}
