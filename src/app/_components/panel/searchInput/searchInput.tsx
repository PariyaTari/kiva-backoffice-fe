"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/app/_components/icon/icons";

type SearchInputProps = {
	/** The applied term (from the URL); the box shows what is typed. */
	value: string;
	onSearch: (term: string) => void;
	placeholder?: string;
	/** Wait after the last keystroke before searching. */
	delay?: number;
};

/**
 * `.search-in` — a search box that applies its term after typing pauses: one request per pause instead of one per
 * key. What is typed and what is searched are two values (data-fetching §3).
 */
export default function SearchInput({ value, onSearch, placeholder = "جستجو…", delay = 350 }: SearchInputProps) {
	const [typed, setTyped] = useState(value);
	const [applied, setApplied] = useState(value);
	const [seen, setSeen] = useState(value);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// the term changed from outside (filters cleared, back button) — show it; our own search coming back is not that
	if (value !== seen) {
		setSeen(value);
		if (value !== applied) {
			setApplied(value);
			setTyped(value);
		}
	}

	useEffect(() => () => {
		if (timer.current) clearTimeout(timer.current);
	}, []);

	const apply = (term: string) => {
		if (timer.current) clearTimeout(timer.current);
		const next = term.trim();
		setApplied(next);
		onSearch(next);
	};

	return (
		<div className="search-in grow">
			<Icon name="search" />
			<input
				className="input"
				type="search"
				placeholder={placeholder}
				aria-label={placeholder}
				value={typed}
				onChange={(e) => {
					const term = e.target.value;
					setTyped(term);
					if (timer.current) clearTimeout(timer.current);
					timer.current = setTimeout(() => apply(term), delay);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						apply(typed);
					}
				}}
			/>
		</div>
	);
}
