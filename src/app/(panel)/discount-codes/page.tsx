import type { Metadata } from "next";
import DiscountsView from "./_components/discountsView/discountsView";

export const metadata: Metadata = { title: "کدهای تخفیف" };

/** `/discount-codes` — FEATURES §1.1 #9 (ADMIN only). */
export default function DiscountCodesPage() {
	return <DiscountsView />;
}
