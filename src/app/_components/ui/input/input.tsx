"use client";

import { forwardRef, useId } from "react";
import classNames from "classnames";
import { InputProps } from "./input.type";

/** Design-system `.field` + `.input`. */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ label, labelNote, error, hint, direction, wrapperClassName, wrapperStyle, wrapperId, className, id, ...rest },
	ref,
) {
	const autoId = useId();
	const inputId = id ?? autoId;

	return (
		<div className={classNames("field", { error: !!error }, wrapperClassName)} style={wrapperStyle} id={wrapperId}>
			{label && (
				<label htmlFor={inputId}>
					{label}
					{labelNote && <span className="opt"> ({labelNote})</span>}
				</label>
			)}
			<input
				id={inputId}
				ref={ref}
				className={classNames("input", { ltr: direction === "ltr" }, className)}
				aria-invalid={!!error || undefined}
				{...rest}
			/>
			{error ? <span className="err">{error}</span> : hint ? <span className="help">{hint}</span> : null}
		</div>
	);
});

export default Input;
