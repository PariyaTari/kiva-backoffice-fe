import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageEditView from "../_components/pageEditView/pageEditView";

export const metadata: Metadata = { title: "ویرایش صفحه" };

type Props = { params: Promise<{ slug: string }> };

/** `/pages/terms`. */
export default async function StaticPageEditPage({ params }: Props) {
	const { slug } = await params;
	if (!/^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) notFound();
	return <PageEditView slug={slug} />;
}
