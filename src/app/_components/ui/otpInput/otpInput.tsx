"use client";

import { ClipboardEvent, KeyboardEvent, useRef } from "react";
import classNames from "classnames";
import { convertPersianToEnglishString, toPersianDigits } from "@/utils/digits";
import { OtpInputProps } from "./otpInput.type";

const onlyDigits = (value: string) => convertPersianToEnglishString(value).replace(/\D/g, "");

/** The design's `.otp` boxes — one digit each, auto-advance, backspace back, arrows and paste. */
export default function OtpInput({
	id,
	label,
	length = 5,
	value,
	onChange,
	onComplete,
	error = false,
	errorKey,
	ok = false,
	disabled = false,
	autoFocus = false,
}: OtpInputProps) {
	const boxes = useRef<(HTMLInputElement | null)[]>([]);

	const focusAt = (i: number) => boxes.current[Math.max(0, Math.min(i, length - 1))]?.focus();

	const commit = (next: string) => {
		onChange(next);
		if (next.length === length && !next.includes(" ")) onComplete?.(next);
	};

	// several digits at once (autofill / a phone's SMS suggestion) fill from the first box
	const fill = (digits: string) => {
		const next = digits.slice(0, length);
		commit(next);
		focusAt(Math.min(next.length, length - 1));
	};

	const type = (i: number, raw: string) => {
		let d = onlyDigits(raw);
		const current = value[i]?.trim();
		// a key typed next to the digit already in the box (caret not on a selection) — keep the new one
		if (current && d.length === 2 && d.includes(current)) d = d.replace(current, "");
		if (d.length > 1) return fill(d);
		const chars = value.padEnd(length, " ").split("");
		chars[i] = d || " ";
		commit(chars.join("").trimEnd());
		if (d && i < length - 1) focusAt(i + 1);
	};

	const key = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Backspace" && !value[i]?.trim() && i > 0) {
			e.preventDefault();
			const chars = value.padEnd(length, " ").split("");
			chars[i - 1] = " ";
			onChange(chars.join("").trimEnd());
			focusAt(i - 1);
		}
		// boxes run left-to-right (`direction:ltr`) inside an RTL page
		if (e.key === "ArrowLeft" && i < length - 1) focusAt(i + 1);
		if (e.key === "ArrowRight" && i > 0) focusAt(i - 1);
	};

	const paste = (e: ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		fill(onlyDigits(e.clipboardData.getData("text")));
	};

	return (
		<div key={errorKey} className={classNames("otp", { err: error, ok })} id={id} role="group" aria-label={label}>
			{Array.from({ length }, (_, i) => {
				const digit = value[i]?.trim() ?? "";
				return (
					<input
						key={i}
						ref={(el) => {
							boxes.current[i] = el;
						}}
						className={classNames({ filled: !!digit })}
						inputMode="numeric"
						// no `maxLength`: an SMS autofill drops the whole code into one box and `fill` spreads it
						aria-label={`رقم ${toPersianDigits(i + 1)}`}
						autoComplete={i === 0 ? "one-time-code" : "off"}
						autoFocus={autoFocus && i === 0}
						disabled={disabled}
						value={digit ? toPersianDigits(digit) : ""}
						onChange={(e) => type(i, e.target.value)}
						onKeyDown={(e) => key(i, e)}
						onFocus={(e) => e.target.select()}
						onPaste={paste}
					/>
				);
			})}
		</div>
	);
}
