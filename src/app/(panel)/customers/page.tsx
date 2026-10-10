import type { Metadata } from "next";
import CustomersView from "./_components/customersView/customersView";

export const metadata: Metadata = { title: "مشتریان" };

/** `/customers` — FEATURES §1.1 #20 (ADMIN, SUPPORT; roles ADMIN only). */
export default function CustomersPage() {
	return <CustomersView />;
}
