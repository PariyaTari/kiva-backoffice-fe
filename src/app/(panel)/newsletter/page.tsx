import type { Metadata } from "next";
import NewsletterView from "./_components/newsletterView/newsletterView";

export const metadata: Metadata = { title: "مشترکین خبرنامه" };

/** `/newsletter` — the footer's e-mail newsletter subscribers (ADMIN only). */
export default function NewsletterPage() {
	return <NewsletterView />;
}
