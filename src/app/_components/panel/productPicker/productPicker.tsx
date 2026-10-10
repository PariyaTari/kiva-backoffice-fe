"use client";

import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { TaxonomyEndpoints } from "@/app/(panel)/_api/taxonomyEndpoints";
import { Icon } from "@/app/_components/icon/icons";
import { StoreProduct } from "@/types/marketing.type";
import { formatPrice } from "@/utils/format";
import { withMappedError } from "@/utils/withMappedError";

type ProductPickerProps = {
	label?: string;
	labelNote?: string;
	value: number[];
	onChange: (ids: number[], picked?: StoreProduct) => void;
	/** One product only (testimonial, blog «کارت محصول»). */
	single?: boolean;
	placeholder?: string;
	error?: string | null | false;
	hint?: string;
};

const DEBOUNCE_MS = 300;

/**
 * Choose products by typing (the design's `.ms` box): results from the storefront list (published products),
 * the chosen ones as chips — their names read back by id.
 */
export default function ProductPicker({ label, labelNote, value, onChange, single = false, placeholder = "نام یا SKU محصول…", error, hint }: ProductPickerProps) {
	const root = useRef<HTMLDivElement>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [typed, setTyped] = useState("");
	const [term, setTerm] = useState("");
	const [open, setOpen] = useState(false);

	const chosen = useQuery({
		queryKey: ["store", "productsByIds", value],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getProductsByIds(value)),
		enabled: value.length > 0,
		placeholderData: keepPreviousData,
		meta: { showNotification: true },
	});
	const results = useQuery({
		queryKey: ["store", "productSearch", term],
		queryFn: ({ signal }) => withMappedError(() => TaxonomyEndpoints.searchProducts(term, signal)),
		enabled: open,
		placeholderData: keepPreviousData,
		meta: { showNotification: true },
	});

	useEffect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (!root.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("click", onDoc);
		return () => document.removeEventListener("click", onDoc);
	}, [open]);
	useEffect(() => () => {
		if (timer.current) clearTimeout(timer.current);
	}, []);

	const byId = new Map((chosen.data ?? []).map((p) => [p.id, p]));
	const pick = (p: StoreProduct) => {
		if (single) {
			onChange([p.id], p);
			setOpen(false);
		} else onChange(value.includes(p.id) ? value.filter((id) => id !== p.id) : [...value, p.id], p);
		setTyped("");
		setTerm("");
	};

	return (
		<div className={classNames("field", { error: !!error })}>
			{label && (
				<label>
					{label}
					{labelNote && <span className="opt"> ({labelNote})</span>}
				</label>
			)}
			<div className={classNames("ms", { open })} ref={root}>
				<div className="ms-box" onClick={() => setOpen(true)}>
					<span className="ms-chips">
						{value.map((id) => (
							<span key={id} className="ms-chip">
								<span>{byId.get(id)?.name ?? `#${id}`}</span>
								<button
									type="button"
									aria-label="حذف"
									onClick={(e) => {
										e.stopPropagation();
										onChange(value.filter((x) => x !== id));
									}}
								>
									<Icon name="close" />
								</button>
							</span>
						))}
					</span>
					<input
						type="text"
						value={typed}
						placeholder={value.length && single ? "" : placeholder}
						aria-label={label ?? placeholder}
						onFocus={() => setOpen(true)}
						onChange={(e) => {
							const next = e.target.value;
							setTyped(next);
							if (timer.current) clearTimeout(timer.current);
							timer.current = setTimeout(() => setTerm(next.trim()), DEBOUNCE_MS);
						}}
					/>
				</div>
				<div className="ms-list" role="listbox" aria-multiselectable={!single}>
					{results.data?.length ? (
						results.data.map((p) => {
							const selected = value.includes(p.id);
							return (
								<div
									key={p.id}
									role="option"
									aria-selected={selected}
									className={classNames("ms-opt", { sel: selected })}
									onMouseDown={(e) => {
										e.preventDefault();
										pick(p);
									}}
								>
									{!single && <span className="cb" />}
									<span style={{ flex: 1 }}>{p.name}</span>
									<span className="cnt ltr">{p.sku}</span>
									<span className="cnt">{formatPrice(p.price.price)}</span>
								</div>
							);
						})
					) : (
						<div className="ms-none">{results.isFetching ? "در حال جستجو…" : "محصولی پیدا نشد"}</div>
					)}
				</div>
			</div>
			{error ? <span className="err">{error}</span> : hint ? <span className="help">{hint}</span> : null}
		</div>
	);
}
