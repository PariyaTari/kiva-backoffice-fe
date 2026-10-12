import { ReactNode, SelectHTMLAttributes } from "react";

export type SelectOption = {
	value: string;
	label: string;
	/** Shown but not choosable (e.g. a sold-out colour). */
	disabled?: boolean;
};

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
	label?: ReactNode;
	labelNote?: string;
	error?: string | false | null;
	hint?: ReactNode;
	/** First empty option («انتخاب استان»). */
	placeholder?: string;
	options: SelectOption[];
	wrapperClassName?: string;
};
