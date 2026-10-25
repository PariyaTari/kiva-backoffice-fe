import type { Metadata } from "next";
import CustomerDetailView from "../_components/customerDetailView/customerDetailView";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "مشتری" };

/** `/customers/1024` — one shopper's page (ADMIN, SUPPORT). */
export default async function CustomerPage({ params }: Props) {
	const { id } = await params;
	return <CustomerDetailView id={Number(id)} />;
}
