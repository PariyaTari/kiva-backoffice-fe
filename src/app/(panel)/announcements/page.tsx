import type { Metadata } from "next";
import AnnouncementsView from "./_components/announcementsView/announcementsView";

export const metadata: Metadata = { title: "نوار اطلاعیه" };

/** `/announcements` — FEATURES §1.1 #12 (ADMIN, CONTENT_EDITOR). */
export default function AnnouncementsPage() {
	return <AnnouncementsView />;
}
