"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { Icon } from "@/app/_components/icon/icons";
import { toPersianDigits } from "@/utils/digits";
import { MultiSelectProps } from "./multiSelect.type";

/** Design-system `.ms` — type-to-filter multi select with chips (design `K.multiSelect`). */
export default function MultiSelect({ options, value, onChange, placeholder = "", id }: MultiSelectProps) {
	const root = useRef<HTMLDivElement>(null);
	const input = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [term, setTerm] = useState("");
	const [highlight, setHighlight] = useState(-1);

	const visible = options.filter((o) => !term.trim() || o.label.includes(term.trim()));
	const byValue = (v: string) => options.find((o) => o.value === v);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (!root.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("click", onDoc);
		return () => document.removeEventListener("click", onDoc);
	}, [open]);

	const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlight((h) => Math.min(h + 1, visible.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlight((h) => Math.max(h - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const o = visible[highlight];
			if (o) {
				toggle(o.value);
				setTerm("");
			}
		} else if (e.key === "Backspace" && !term && value.length) {
			toggle(value[value.length - 1]);
		} else if (e.key === "Escape") {
			setOpen(false);
			input.current?.blur();
		}
	};

	return (
		<div className={classNames("ms", { open })} ref={root} id={id}>
			<div className="ms-box" onClick={() => input.current?.focus()}>
				<span className="ms-chips">
					{value.map((v) => {
						const o = byValue(v);
						if (!o) return null;
						return (
							<span key={v} className="ms-chip">
								{o.swatch && <span className="swatch-dot" style={{ background: o.swatch }} />}
								{o.label}
								<button
									type="button"
									aria-label={`حذف ${o.label}`}
									onClick={(e) => {
										e.stopPropagation();
										toggle(v);
									}}
								>
									<Icon name="close" />
								</button>
							</span>
						);
					})}
				</span>
				<input
					ref={input}
					type="text"
					placeholder={value.length ? "" : placeholder}
					aria-label={placeholder}
					value={term}
					onFocus={() => setOpen(true)}
					onChange={(e) => {
						setTerm(e.target.value);
						setHighlight(0);
					}}
					onKeyDown={onKeyDown}
				/>
			</div>
			<div className="ms-list" role="listbox" aria-multiselectable="true">
				{visible.length ? (
					visible.map((o, i) => {
						const selected = value.includes(o.value);
						return (
							<div
								key={o.value}
								className={classNames("ms-opt", { sel: selected, hl: i === highlight })}
								role="option"
								aria-selected={selected}
								onMouseDown={(e) => {
									e.preventDefault();
									toggle(o.value);
									setTerm("");
								}}
							>
								<span className="cb" />
								{o.swatch && <span className="swatch-dot" style={{ background: o.swatch }} />}
								<span>{o.label}</span>
								{o.count != null && <span className="cnt">{toPersianDigits(o.count)}</span>}
							</div>
						);
					})
				) : (
					<div className="ms-none">موردی پیدا نشد</div>
				)}
			</div>
		</div>
	);
}
