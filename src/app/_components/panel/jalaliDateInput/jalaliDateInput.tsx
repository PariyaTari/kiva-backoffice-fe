"use client";

import { useState } from "react";
import classNames from "classnames";
import { convertPersianToEnglishString, toPersianDigits } from "@/utils/digits";
import { gregorianToJalali, jalaliToGregorian } from "@/utils/jalali";

type JalaliDateInputProps = {
	/** Gregorian `YYYY-MM-DD` (what the API takes), `""` for none. */
	value: string;
	onChange: (gregorian: string) => void;
	placeholder?: string;
	className?: string;
	id?: string;
	"aria-label"?: string;
	disabled?: boolean;
};

/**
 * A Jalali date typed as `۱۴۰۵/۰۷/۱۸` (Persian or Latin digits) — the API value stays Gregorian. A half-typed or
 * impossible date is kept in the box (red) and not reported until it is a real date; clearing it reports `""`.
 */
export default function JalaliDateInput({ value, onChange, placeholder = "۱۴۰۵/۰۷/۱۸", className, id, disabled, ...rest }: JalaliDateInputProps) {
	const [text, setText] = useState(() => toPersianDigits(gregorianToJalali(value)));
	const [shown, setShown] = useState(value);

	// a new value from outside (filters cleared, form reset) replaces what is typed
	if (value !== shown) {
		setShown(value);
		if (jalaliToGregorian(text) !== value) setText(toPersianDigits(gregorianToJalali(value)));
	}

	const typed = convertPersianToEnglishString(text).trim();
	const invalid = typed !== "" && !jalaliToGregorian(typed);

	return (
		<input
			id={id}
			className={classNames("input", className)}
			inputMode="numeric"
			dir="ltr"
			style={{ textAlign: "right" }}
			placeholder={placeholder}
			aria-label={rest["aria-label"]}
			aria-invalid={invalid || undefined}
			disabled={disabled}
			value={text}
			onChange={(e) => {
				const next = toPersianDigits(convertPersianToEnglishString(e.target.value).replace(/[^\d/-]/g, "").slice(0, 10));
				setText(next);
				const raw = convertPersianToEnglishString(next).trim();
				if (raw === "") {
					setShown("");
					onChange("");
					return;
				}
				const g = jalaliToGregorian(raw);
				if (g) {
					setShown(g);
					onChange(g);
				}
			}}
			// a red border while it isn't a date yet
			{...(invalid ? { "data-invalid": true } : {})}
		/>
	);
}
