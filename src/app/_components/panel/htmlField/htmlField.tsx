"use client";

import { useId, useMemo, useState } from "react";
import classNames from "classnames";
import { TextareaProps } from "@/app/_components/ui/textarea/textarea.type";
import { cleanHtml, HTML_TAGS } from "@/utils/html";

type HtmlFieldProps = Omit<TextareaProps, "value" | "footer"> & { value: string };

/**
 * An `HtmlString` editor (product description, blog paragraph / tip, FAQ answer, static page): the code as a
 * left-to-right textarea, and «پیش‌نمایش» — the text as the storefront's `.prose` draws it, after a rough copy of the
 * server's sanitizer, with the tags the server would strip listed under it. Same props as `Textarea`.
 */
export default function HtmlField({ label, labelNote, error, hint, wrapperClassName, wrapperStyle, wrapperId, className, id, style, value, ...rest }: HtmlFieldProps) {
	const autoId = useId();
	const textareaId = id ?? autoId;
	const [preview, setPreview] = useState(false);
	const clean = useMemo(() => (preview ? cleanHtml(value) : null), [preview, value]);
	const message = error ? <span className="err">{error}</span> : hint ? <span className="help">{hint}</span> : null;

	return (
		<div className={classNames("field html-field", { error: !!error }, wrapperClassName)} style={wrapperStyle} id={wrapperId}>
			<div className="html-head">
				{label && (
					<label htmlFor={textareaId}>
						{label}
						{labelNote && <span className="opt"> ({labelNote})</span>}
					</label>
				)}
				<div className="seg" role="tablist" aria-label={`نمایش ${typeof label === "string" ? label : rest["aria-label"] ?? "HTML"}`} title={`تگ‌های مجاز: ${HTML_TAGS.join("، ")}`}>
					<button type="button" role="tab" aria-selected={!preview} className={classNames({ on: !preview })} onClick={() => setPreview(false)}>
						کد
					</button>
					<button type="button" role="tab" aria-selected={preview} className={classNames({ on: preview })} onClick={() => setPreview(true)}>
						پیش‌نمایش
					</button>
				</div>
			</div>

			{clean ? (
				clean.html.trim() ? (
					<div className="html-preview prose" style={{ minHeight: style?.minHeight }} dangerouslySetInnerHTML={{ __html: clean.html }} />
				) : (
					<div className="html-preview empty" style={{ minHeight: style?.minHeight }}>
						چیزی برای نمایش نیست.
					</div>
				)
			) : (
				<textarea
					id={textareaId}
					className={classNames("textarea code", className)}
					aria-invalid={!!error || undefined}
					value={value}
					style={style}
					placeholder="<p>…</p>"
					{...rest}
				/>
			)}
			{!!clean?.dropped.length && (
				<span className="help warn">
					سایت این تگ‌ها را حذف می‌کند: <span className="ltr">{clean.dropped.join(", ")}</span>
				</span>
			)}
			{message}
		</div>
	);
}
