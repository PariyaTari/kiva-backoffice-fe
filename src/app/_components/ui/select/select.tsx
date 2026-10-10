"use client";

import { forwardRef, useId } from "react";
import classNames from "classnames";
import { SelectProps } from "./select.type";

/** Design-system `.field` + `.select` (chevron comes from the CSS background). */
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
	{ label, labelNote, error, hint, placeholder, options, wrapperClassName, className, id, ...rest },
	ref,
) {
	const autoId = useId();
	const selectId = id ?? autoId;

	return (
		<div className={classNames("field", { error: !!error }, wrapperClassName)}>
			{label && (
				<label htmlFor={selectId}>
					{label}
					{labelNote && <span className="opt"> ({labelNote})</span>}
				</label>
			)}
			<select id={selectId} ref={ref} className={classNames("select", className)} aria-invalid={!!error || undefined} {...rest}>
				{placeholder !== undefined && <option value="">{placeholder}</option>}
				{options.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
			{error ? <span className="err">{error}</span> : hint ? <span className="help">{hint}</span> : null}
		</div>
	);
});

export default Select;
