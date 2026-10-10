import type { Metadata } from "next";
import OrderDetailView from "../_components/orderDetailView/orderDetailView";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { code } = await params;
	return { title: `سفارش ${decodeURIComponent(code)}` };
}

/** `/orders/KV-218340`. */
export default async function OrderPage({ params }: Props) {
	const { code } = await params;
	return <OrderDetailView code={decodeURIComponent(code)} />;
}
