export type ErrorComponentProps = {
	retryable: boolean;
	ticketAble: boolean;
	errorText: string;
	/** Retry handler — usually `() => query.refetch()`. */
	executeFunction?: () => void;
	/** `bordered` (default) draws its own frame; `text` for places that already have one (cards, modals). */
	variant?: "bordered" | "text";
	/** Below 72px the block collapses into a one-line bar with icon buttons. */
	height?: number;
	/** `isFetching` of the query — disables the buttons while a retry runs. */
	loading?: boolean;
};
