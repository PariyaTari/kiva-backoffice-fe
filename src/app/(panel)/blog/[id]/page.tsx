import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogEditView from "../_components/blogEditView/blogEditView";

export const metadata: Metadata = { title: "ویرایش مقاله" };

type Props = { params: Promise<{ id: string }> };

/** `/blog/3`. */
export default async function BlogPostPage({ params }: Props) {
	const { id } = await params;
	if (!/^\d+$/.test(id)) notFound();
	return <BlogEditView id={Number(id)} />;
}
