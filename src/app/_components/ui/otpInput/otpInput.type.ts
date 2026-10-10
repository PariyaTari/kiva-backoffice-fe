export type OtpInputProps = {
	id?: string;
	/** Names the group of boxes for screen readers — needed when a form has two codes. */
	label?: string;
	length?: number;
	/** ASCII digits typed so far. */
	value: string;
	onChange: (next: string) => void;
	/** Fired once every box is filled (typing or paste) — the design verifies right away. */
	onComplete?: (code: string) => void;
	/** `.otp.err` — the boxes shake; bump `errorKey` to replay it. */
	error?: boolean;
	errorKey?: number;
	/** `.otp.ok` — accepted. */
	ok?: boolean;
	disabled?: boolean;
	autoFocus?: boolean;
};
