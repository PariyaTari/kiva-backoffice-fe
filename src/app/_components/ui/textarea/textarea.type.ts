import { CSSProperties, ReactNode, TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
	label?: ReactNode;
	labelNote?: string;
	error?: string | false | null;
	hint?: ReactNode;
	/** Rendered under the textarea next to the error (e.g. the `۰ / ۶۰۰` counter). */
	footer?: ReactNode;
	wrapperClassName?: string;
	wrapperStyle?: CSSProperties;
	wrapperId?: string;
};
