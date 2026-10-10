import type { Metadata } from "next";
import ContactView from "./_components/contactView/contactView";

export const metadata: Metadata = { title: "پیام‌های تماس" };

/** `/contact-messages` — FEATURES §1.1 #19 (ADMIN, SUPPORT). */
export default function ContactMessagesPage() {
	return <ContactView />;
}
