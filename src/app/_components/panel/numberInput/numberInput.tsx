"use client";

import { useState } from "react";
import Input from "@/app/_components/ui/input/input";
import { convertPersianToEnglishString, toPersianDigits } from "@/utils/digits";

type NumberInputProps = {
	label?: string;
	labelNote?: string;
	value: number | null;
	onChange: (value: number | null) => void;
	/** Allow a fraction (`9.5` litres) and/or a sign (stock change `-2`). */
	decimal?: boolean;
	signed?: boolean;
	error?: string | null | false;
	hint?: string;
	placeholder?: string;
	disabled?: boolean;
	wrapperClassName?: string;
};

/** A number typed with Persian or Latin digits, echoed in Persian; empty = `null`. */
export default function NumberInput({ label, labelNote, value, onChange, decimal = false, signed = false, error, hint, placeholder, disabled, wrapperClassName }: NumberInputProps) {
	// what is typed («۱۲.» while a fraction is on its way) — the value only changes when it parses
	const [text, setText] = useState(value == null ? "" : toPersianDigits(value));
	const [shown, setShown] = useState(value);
	if (value !== shown) {
		setShown(value);
		setText(value == null ? "" : toPersianDigits(value));
	}

	return (
		<Input
			label={label}
			labelNote={labelNote}
			inputMode={decimal ? "decimal" : "numeric"}
			value={text}
			error={error}
			hint={hint}
			placeholder={placeholder}
			disabled={disabled}
			wrapperClassName={wrapperClassName}
			onChange={(e) => {
				let raw = convertPersianToEnglishString(e.target.value).replace("٫", ".").replace(/[^\d.-]/g, "");
				if (!signed) raw = raw.replace(/-/g, "");
				else raw = raw.replace(/(?!^)-/g, "");
				if (!decimal) raw = raw.replace(/\./g, "");
				setText(toPersianDigits(raw));
				const n = raw === "" || raw === "-" ? null : Number(raw);
				const next = n == null || Number.isNaN(n) ? null : n;
				setShown(next);
				onChange(next);
			}}
		/>
	);
}
