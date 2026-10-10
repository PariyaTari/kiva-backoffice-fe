import type { Metadata } from "next";
import PagesView from "./_components/pagesView/pagesView";

export const metadata: Metadata = { title: "صفحات ثابت" };

/** `/pages` — FEATURES §1.1 #16 (ADMIN, CONTENT_EDITOR). */
export default function PagesPage() {
	return <PagesView />;
}
