import type { Metadata } from "next";
import BannersView from "./_components/bannersView/bannersView";

export const metadata: Metadata = { title: "بنرها" };

/** `/banners` — FEATURES §1.1 #11 (ADMIN, CONTENT_EDITOR). */
export default function BannersPage() {
	return <BannersView />;
}
