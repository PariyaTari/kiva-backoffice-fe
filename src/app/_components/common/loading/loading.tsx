/** First-load placeholder of a query (`isLoading`). */
export default function Loading({ text = "لطفاً منتظر بمانید", className = "" }: { text?: string; className?: string }) {
	return (
		<div className={`kv-loading ${className}`} role="status">
			<span className="kv-spin" aria-hidden="true" />
			{text}
		</div>
	);
}
