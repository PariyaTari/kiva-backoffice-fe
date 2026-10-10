import type { Metadata } from "next";
import ReviewsView from "./_components/reviewsView/reviewsView";

export const metadata: Metadata = { title: "نظرات" };

/** `/reviews` — FEATURES §1.1 #18 (ADMIN, SUPPORT). */
export default function ReviewsPage() {
	return <ReviewsView />;
}
