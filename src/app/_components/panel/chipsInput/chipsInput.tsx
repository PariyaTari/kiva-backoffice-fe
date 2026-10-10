"use client";

import { KeyboardEvent, useId, useRef, useState } from "react";
import classNames from "classnames";
import { Icon } from "@/app/_components/icon/icons";

type ChipsInputProps = {
	label?: string;
	labelNote?: string;
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	/** Most chips allowed (e.g. 8 highlights). */
	max?: number;
	/** Longest chip, in characters. */
	maxLength?: number;
	error?: string | null | false;
	hint?: string;
};

/**
 * Free-text chips on the design's `.ms-box` / `.ms-chip` (tags, care instructions): Enter or «،» adds, Backspace on
 * an empty box removes the last, duplicates are ignored.
 */
export default function ChipsInput({ label, labelNote, value, onChange, placeholder = "بنویس و Enter بزن", max, maxLength = 160, error, hint }: ChipsInputProps) {
	const id = useId();
	const input = useRef<HTMLInputElement>(null);
	const [term, setTerm] = useState("");
	const full = max !== undefined && value.length >= max;

	const add = (raw: string) => {
		const text = raw.trim().slice(0, maxLength);
		if (!text || value.includes(text) || full) return;
		onChange([...value, text]);
		setTerm("");
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === "،" || e.key === ",") {
			e.preventDefault();
			add(term);
		} else if (e.key === "Backspace" && !term && value.length) {
			onChange(value.slice(0, -1));
		}
	};

	return (
		<div className={classNames("field chips-in", { error: !!error })}>
			{label && (
				<label htmlFor={id}>
					{label}
					{labelNote && <span className="opt"> ({labelNote})</span>}
				</label>
			)}
			<div className="ms">
				<div className="ms-box" onClick={() => input.current?.focus()}>
					<span className="ms-chips">
						{value.map((chip) => (
							<span key={chip} className="ms-chip">
								<span>{chip}</span>
								<button
									type="button"
									aria-label={`حذف ${chip}`}
									onClick={(e) => {
										e.stopPropagation();
										onChange(value.filter((c) => c !== chip));
									}}
								>
									<Icon name="close" />
								</button>
							</span>
						))}
					</span>
					<input
						id={id}
						ref={input}
						type="text"
						value={term}
						disabled={full}
						placeholder={full ? "" : placeholder}
						onChange={(e) => setTerm(e.target.value)}
						onKeyDown={onKeyDown}
						onBlur={() => add(term)}
					/>
				</div>
			</div>
			{error ? <span className="err">{error}</span> : hint ? <span className="help">{hint}</span> : null}
		</div>
	);
}
