import type { Metadata } from "next";
import SettingsView from "./_components/settingsView/settingsView";

export const metadata: Metadata = { title: "تنظیمات" };

/** `/settings` — FEATURES §1.1 #17 (ADMIN only). */
export default function SettingsPage() {
	return <SettingsView />;
}
