import type { Metadata } from "next";
import FaqView from "./_components/faqView/faqView";

export const metadata: Metadata = { title: "سوالات متداول" };

/** `/faq` — FEATURES §1.1 #15 (ADMIN, CONTENT_EDITOR). */
export default function FaqPage() {
	return <FaqView />;
}
