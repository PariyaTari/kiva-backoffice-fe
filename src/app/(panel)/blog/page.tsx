import type { Metadata } from "next";
import BlogView from "./_components/blogView/blogView";

export const metadata: Metadata = { title: "بلاگ" };

/** `/blog` — FEATURES §1.1 #14 (ADMIN, CONTENT_EDITOR). */
export default function BlogPage() {
	return <BlogView />;
}
