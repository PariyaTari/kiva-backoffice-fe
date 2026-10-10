import { CSSProperties, InputHTMLAttributes, ReactNode } from "react";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
	label?: ReactNode;
	/** «(اختیاری)» etc. next to the label (`.opt`). */
	labelNote?: string;
	/** Puts the field in the `.field.error` state and shows the message (`.err`). */
	error?: string | false | null;
	hint?: ReactNode;
	/** `"ltr"` → `.input.ltr` (phone numbers, postal codes, emails, codes). */
	direction?: "ltr" | "rtl";
	wrapperClassName?: string;
	wrapperStyle?: CSSProperties;
	wrapperId?: string;
};
