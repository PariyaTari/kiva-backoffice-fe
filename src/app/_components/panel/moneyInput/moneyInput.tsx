"use client";

import { useId } from "react";
import classNames from "classnames";
import { convertPersianToEnglishString } from "@/utils/digits";
import { formatPrice } from "@/utils/format";

type MoneyInputProps = {
	label?: string;
	labelNote?: string;
	/** Integer Toman, `null` = empty. */
	value: number | null;
	onChange: (value: number | null) => void;
	error?: string | null | false;
	hint?: string;
	unit?: string;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	wrapperClassName?: string;
};

/** `.field` + an amount typed with Persian or Latin digits, shown grouped (`۱٬۸۹۰٬۰۰۰`) with its unit. */
export default function MoneyInput({ label, labelNote, value, onChange, error, hint, unit = "تومان", placeholder = "۰", disabled, id, wrapperClassName }: MoneyInputProps) {
	const autoId = useId();
	const inputId = id ?? autoId;
	return (
		<div className={classNames("field", { error: !!error }, wrapperClassName)}>
			{label && (
				<label htmlFor={inputId}>
					{label}
					{labelNote && <span className="opt"> ({labelNote})</span>}
				</label>
			)}
			<div className="unit-in">
				<input
					id={inputId}
					className="input"
					inputMode="numeric"
					placeholder={placeholder}
					disabled={disabled}
					aria-invalid={!!error || undefined}
					value={value == null ? "" : formatPrice(value)}
					onChange={(e) => {
						const digits = convertPersianToEnglishString(e.target.value).replace(/\D/g, "").slice(0, 13);
						onChange(digits ? Number(digits) : null);
					}}
				/>
				<span className="u">{unit}</span>
			</div>
			{error ? <span className="err">{error}</span> : hint ? <span className="help">{hint}</span> : null}
		</div>
	);
}
