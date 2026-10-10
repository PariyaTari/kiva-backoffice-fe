import type { Metadata } from "next";
import TestimonialsView from "./_components/testimonialsView/testimonialsView";

export const metadata: Metadata = { title: "پیام‌های رضایت" };

/** `/testimonials` — FEATURES §1.1 #13 (ADMIN, CONTENT_EDITOR). */
export default function TestimonialsPage() {
	return <TestimonialsView />;
}
