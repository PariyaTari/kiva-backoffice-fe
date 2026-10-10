import "./_styles/order.css";

/** Order queue and order pages — their blocks are scoped under `.pg-orders`. */
export default function OrdersLayout({ children }: { children: React.ReactNode }) {
	return <div className="pg-orders">{children}</div>;
}
