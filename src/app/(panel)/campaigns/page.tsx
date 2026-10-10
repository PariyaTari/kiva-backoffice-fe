import type { Metadata } from "next";
import CampaignsView from "./_components/campaignsView/campaignsView";

export const metadata: Metadata = { title: "کمپین‌ها" };

/** `/campaigns` — FEATURES §1.1 #10 (ADMIN, CONTENT_EDITOR). */
export default function CampaignsPage() {
	return <CampaignsView />;
}
