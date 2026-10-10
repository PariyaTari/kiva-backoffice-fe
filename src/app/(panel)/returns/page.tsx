import type { Metadata } from "next";
import ReturnsView from "./_components/returnsView/returnsView";

export const metadata: Metadata = { title: "مرجوعی‌ها" };

/** `/returns` — FEATURES §1.1 #3 (ADMIN, OPERATOR). */
export default function ReturnsPage() {
	return <ReturnsView />;
}
