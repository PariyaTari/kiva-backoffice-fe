"use client";

import { forwardRef, useId } from "react";
import classNames from "classnames";
import { TextareaProps } from "./textarea.type";

/** Design-system `.field` + `.textarea`. */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
	{ label, labelNote, error, hint, footer, wrapperClassName, wrapperStyle, wrapperId, className, id, ...rest },
	ref,
) {
	const autoId = useId();
	const textareaId = id ?? autoId;
	const message = error ? <span className="err">{error}</span> : hint ? <span className="help">{hint}</span> : null;

	return (
		<div className={classNames("field", { error: !!error }, wrapperClassName)} style={wrapperStyle} id={wrapperId}>
			{label && (
				<label htmlFor={textareaId}>
					{label}
					{labelNote && <span className="opt"> ({labelNote})</span>}
				</label>
			)}
			<textarea id={textareaId} ref={ref} className={classNames("textarea", className)} aria-invalid={!!error || undefined} {...rest} />
			{footer ? (
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					{message ?? <span />}
					{footer}
				</div>
			) : (
				message
			)}
		</div>
	);
});

export default Textarea;
