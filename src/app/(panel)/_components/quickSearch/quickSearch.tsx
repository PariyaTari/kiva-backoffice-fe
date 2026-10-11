"use client";

import { KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import classNames from "classnames";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import { CustomersEndpoints } from "@/app/(panel)/customers/_api/customersEndpoints";
import { OrdersEndpoints } from "@/app/(panel)/orders/_api/ordersEndpoints";
import { ProductsEndpoints } from "@/app/(panel)/products/_api/productsEndpoints";
import ErrorComponent2 from "@/app/_components/common/errorComponent2/errorComponent2";
import { Icon } from "@/app/_components/icon/icons";
import { IconName } from "@/app/_components/icon/icon.types";
import StatusTag from "@/app/_components/panel/statusTag/statusTag";
import Modal from "@/app/_components/ui/modal/modal";
import { useCan } from "@/hooks/useCan";
import { ApiErrorView, toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatPhone, formatToman } from "@/utils/format";
import { ORDER_STATUS, ORDER_STATUS_TONE, PRODUCT_STATUS, PRODUCT_STATUS_TONE } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";

const DEBOUNCE_MS = 250;
const MIN_LENGTH = 2;
const LIMIT = 5;

type QuickSearchProps = {
	open: boolean;
	onOpen: () => void;
	onClose: () => void;
};

/**
 * «جستجوی سریع» (`Ctrl+K` or `/`) — one box over the three things people look up all day: orders (code, phone,
 * name), products (name, SKU) and customers (phone, name), each only if the role has that section. Results are
 * plain links, so the unsaved-changes guard of an open form still gets its say.
 */
export default function QuickSearch({ open, onOpen, onClose }: QuickSearchProps) {
	useEffect(() => {
		const onKey = (e: globalThis.KeyboardEvent) => {
			const el = e.target instanceof HTMLElement ? e.target : null;
			const typing = !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
			// by key position, so a Persian keyboard layout works too
			if ((e.code === "KeyK" && (e.ctrlKey || e.metaKey)) || (e.code === "Slash" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) {
				e.preventDefault();
				onOpen();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onOpen]);

	return (
		<Modal open={open} onClose={onClose} width={640}>
			<SearchBox onClose={onClose} />
		</Modal>
	);
}

type Group = {
	key: string;
	title: string;
	icon: IconName;
	allHref: string;
	loading: boolean;
	error: ApiErrorView | null;
	onRetry: () => void;
	fetching: boolean;
	rows: { href: string; key: string; body: ReactNode }[] | undefined;
};

/** The box itself — its own component, so a closed (unmounted) modal starts empty next time. */
function SearchBox({ onClose }: { onClose: () => void }) {
	const can = useCan();
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const results = useRef<HTMLDivElement>(null);
	const [typed, setTyped] = useState("");
	const [term, setTerm] = useState("");
	const [active, setActive] = useState(0);
	const ready = term.length >= MIN_LENGTH;

	useEffect(() => () => {
		if (timer.current) clearTimeout(timer.current);
	}, []);
	// close on any result click — natively and in the capture phase, so it also runs when the unsaved-changes guard
	// holds the click (that guard stops the event before React's `onClick` would see it)
	useEffect(() => {
		const onClick = (e: MouseEvent) => {
			if (e.target instanceof Element && e.target.closest(".qs a")) onClose();
		};
		document.addEventListener("click", onClick, true);
		return () => document.removeEventListener("click", onClick, true);
	}, [onClose]);

	const orders = useQuery({
		queryKey: ["orders", "quickSearch", term],
		queryFn: ({ signal }) => withMappedError(() => OrdersEndpoints.getOrders({ status: [], q: term }, 1, LIMIT, signal)),
		enabled: ready && can("orders"),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});
	const products = useQuery({
		queryKey: ["products", "quickSearch", term],
		queryFn: ({ signal }) => withMappedError(() => ProductsEndpoints.getProducts({ q: term, sort: "updated" }, 1, LIMIT, signal)),
		enabled: ready && can("catalog"),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});
	const customers = useQuery({
		queryKey: ["customers", "quickSearch", term],
		queryFn: ({ signal }) => withMappedError(() => CustomersEndpoints.getCustomers(term, 1, LIMIT, signal)),
		enabled: ready && can("support"),
		placeholderData: keepPreviousData,
		meta: { showNotificationOnRefetch: true },
	});

	const ordersError = toErrorView(ERROR_BEHAVIOUR, orders.error, "جستجوی سفارش‌ها با خطا مواجه شد.");
	const productsError = toErrorView(ERROR_BEHAVIOUR, products.error, "جستجوی محصولات با خطا مواجه شد.");
	const customersError = toErrorView(ERROR_BEHAVIOUR, customers.error, "جستجوی مشتری‌ها با خطا مواجه شد.");

	const q = encodeURIComponent(term);
	const groups: Group[] = [];
	if (can("orders"))
		groups.push({
			key: "orders",
			title: "سفارش‌ها",
			icon: "receipt",
			allHref: `/orders?q=${q}`,
			loading: orders.isLoading,
			error: ordersError,
			onRetry: () => orders.refetch(),
			fetching: orders.isFetching,
			rows: orders.data?.items.map((o) => ({
				key: o.code,
				href: `/orders/${encodeURIComponent(o.code)}`,
				body: (
					<>
						<b className="ltr">{o.code}</b>
						<span>
							{o.customerName} · <span className="ltr">{formatPhone(o.customerPhone)}</span>
						</span>
						<small>{formatToman(o.payable)}</small>
						<StatusTag value={o.status} labels={ORDER_STATUS} tones={ORDER_STATUS_TONE} />
					</>
				),
			})),
		});
	if (can("catalog"))
		groups.push({
			key: "products",
			title: "محصولات",
			icon: "bag",
			allHref: `/products?q=${q}`,
			loading: products.isLoading,
			error: productsError,
			onRetry: () => products.refetch(),
			fetching: products.isFetching,
			rows: products.data?.items.map((p) => ({
				key: String(p.id),
				href: `/products/${p.id}`,
				body: (
					<>
						<b>{p.name}</b>
						<span className="ltr">{p.sku}</span>
						<small>موجودی {toPersianDigits(p.totalStock)}</small>
						<StatusTag value={p.status} labels={PRODUCT_STATUS} tones={PRODUCT_STATUS_TONE} />
					</>
				),
			})),
		});
	if (can("support"))
		groups.push({
			key: "customers",
			title: "مشتری‌ها",
			icon: "users",
			allHref: `/customers?q=${q}`,
			loading: customers.isLoading,
			error: customersError,
			onRetry: () => customers.refetch(),
			fetching: customers.isFetching,
			// no customer page in the contract (FEATURES §7) — the list, filtered to them
			rows: customers.data?.items.map((c) => ({
				key: String(c.id),
				href: `/customers?q=${encodeURIComponent(c.phone)}`,
				body: (
					<>
						<b>{c.fullName || "بی‌نام"}</b>
						<span className="ltr">{formatPhone(c.phone)}</span>
						<small>{toPersianDigits(c.ordersCount)} سفارش</small>
					</>
				),
			})),
		});

	const rowCount = groups.reduce((n, g) => n + (g.error ? 0 : (g.rows?.length ?? 0)), 0);
	const links = () => Array.from(results.current?.querySelectorAll<HTMLAnchorElement>("a.qs-row") ?? []);

	const onType = (value: string) => {
		setTyped(value);
		setActive(0);
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => setTerm(value.trim()), DEBOUNCE_MS);
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			if (!rowCount) return;
			const next = (active + (e.key === "ArrowDown" ? 1 : -1) + rowCount) % rowCount;
			setActive(next);
			links()[next]?.scrollIntoView({ block: "nearest" });
		} else if (e.key === "Enter") {
			e.preventDefault();
			// a real click — `<Link>` navigates (or an open form's unsaved-changes guard holds it) and the box closes
			links()[active]?.click();
		}
	};

	let index = -1;
	return (
		<div className="qs">
			<div className="qs-in">
				<Icon name="search" />
				<input
					autoFocus
					value={typed}
					onChange={(e) => onType(e.target.value)}
					onKeyDown={onKeyDown}
					placeholder="کد سفارش، موبایل، نام مشتری، محصول یا SKU…"
					aria-label="جستجوی سریع"
					role="combobox"
					aria-expanded={ready}
					aria-controls="qs-results"
				/>
				<kbd>Esc</kbd>
			</div>

			<div className="qs-body" id="qs-results" ref={results} role="listbox">
				{!ready ? (
					<p className="qs-hint">
						حداقل {toPersianDigits(MIN_LENGTH)} حرف بنویس. <kbd>↑</kbd> <kbd>↓</kbd> برای جابه‌جایی، <kbd>Enter</kbd> برای باز کردن.
					</p>
				) : (
					groups.map((g) => (
						<section key={g.key} className="qs-group">
							<h4>
								<Icon name={g.icon} /> {g.title}
								{g.fetching && !g.loading && <span className="qs-spin" aria-hidden />}
								<Link href={g.allHref} className="qs-all">
									همه‌ی نتایج
								</Link>
							</h4>
							{g.loading ? (
								<p className="qs-empty">در حال جستجو…</p>
							) : g.error ? (
								<ErrorComponent2
									retryable={g.error.retryable}
									ticketAble={g.error.ticketAble}
									errorText={g.error.errorText}
									executeFunction={g.onRetry}
									variant="text"
									height={40}
									loading={g.fetching}
								/>
							) : g.rows?.length ? (
								g.rows.map((r) => {
									index += 1;
									const i = index;
									return (
										<Link
											key={r.key}
											href={r.href}
											className={classNames("qs-row", { on: i === active })}
											role="option"
											aria-selected={i === active}
											onMouseEnter={() => setActive(i)}
										>
											{r.body}
										</Link>
									);
								})
							) : (
								<p className="qs-empty">چیزی پیدا نشد.</p>
							)}
						</section>
					))
				)}
			</div>
		</div>
	);
}
