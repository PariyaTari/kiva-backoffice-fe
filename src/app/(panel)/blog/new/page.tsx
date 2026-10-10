import type { Metadata } from "next";
import BlogEditView from "../_components/blogEditView/blogEditView";

export const metadata: Metadata = { title: "مقاله‌ی جدید" };

/** `/blog/new`. */
export default function NewBlogPostPage() {
	return <BlogEditView id={null} />;
}
