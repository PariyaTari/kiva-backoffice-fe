"use client";

import Link from "next/link";
import classNames from "classnames";
import { useQuery } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import { ContactEndpoints } from "@/app/(panel)/contact-messages/_api/contactEndpoints";
import { OrdersEndpoints } from "@/app/(panel)/orders/_api/ordersEndpoints";
import { ProductsEndpoints } from "@/app/(panel)/products/_api/productsEndpoints";
import { ReturnsEndpoints } from "@/app/(panel)/returns/_api/returnsEndpoints";
import { ReviewsEndpoints } from "@/app/(panel)/reviews/_api/reviewsEndpoints";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import { MessengerIcon } from "@/app/_components/icon/messengerIcon";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import { useCan } from "@/hooks/useCan";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { displayNameOf, useAuthStore } from "@/store/auth.store";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { formatDate, formatPrice, formatToman } from "@/utils/format";
import { labelOf, MESSENGER, SHIPPING_METHOD } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { ReportsEndpoints } from "../../_api/reportsEndpoints";
import RevenueChart from "../revenueChart/revenueChart";

const RANGES = [
	{ value: "7", label: "۷ روز" },
	{ value: "30", label: "۳۰ روز" },
	{ value: "90", label: "۹۰ روز" },
];

/** `YYYY-MM-DD` in Tehran, `days` back from today (0 = today). */
const tehranDate = (daysBack: number) =>
	new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(
		new Date(Date.now() - daysBack * 864e5),
	);

/** The work waiting for each role (FEATURES §1.3) — same keys as the side menu's counters, so no extra requests. */
function QueueCards() {
	const can = useCan();
	const awaiting = useQuery({
		queryKey: ["orders", "queueCount", "awaitingPhotos"],
		queryFn: () => withMappedError(() => OrdersEndpoints.getOrders({ status: [], awaitingPhotos: true }, 1, 1)),
		enabled: can("orders"),
		select: (d) => d.meta.totalItems,
	});
	const returns = useQuery({
		queryKey: ["returns", "queueCount"],
		queryFn: () => withMappedError(() => ReturnsEndpoints.getReturns("REQUESTED", "newest", 1, 1)),
		enabled: can("returns"),
		select: (d) => d.meta.totalItems,
	});
	const reviews = useQuery({
		queryKey: ["reviews", "queueCount"],
		queryFn: () => withMappedError(() => ReviewsEndpoints.getReviews({ status: "PENDING" }, 1, 1)),
		enabled: can("support"),
		select: (d) => d.pendingCount,
	});
	const tickets = useQuery({
		queryKey: ["contact", "queueCount"],
		queryFn: () => withMappedError(() => ContactEndpoints.getMessages("OPEN", "", 1, 1)),
		enabled: can("support"),
		select: (d) => d.meta.totalItems,
	});
	// the manual refund queue (ADMIN): orders with a refund still to transfer
	const refunds = useQuery({
		queryKey: ["orders", "queueCount", "pendingRefunds"],
		queryFn: () => withMappedError(() => OrdersEndpoints.getOrders({ status: [], refundStatus: "PENDING" }, 1, 1)),
		enabled: can("refunds"),
		select: (d) => d.meta.totalItems,
	});
	// colours shoppers wait for that are still out of stock
	const stockAlerts = useQuery({
		queryKey: ["stockAlerts", "queueCount"],
		queryFn: () => withMappedError(() => ProductsEndpoints.getStockAlerts({ inStock: false }, 1, 1)),
		enabled: can("catalog"),
		select: (d) => d.meta.totalItems,
	});

	const cards = [
		can("orders") && { href: "/orders?tab=awaiting", icon: "camera", label: "باید عکاسی شود", count: awaiting.data },
		can("returns") && { href: "/returns", icon: "swap", label: "مرجوعی منتظر تصمیم", count: returns.data },
		can("refunds") && { href: "/orders?refund=PENDING", icon: "wallet", label: "استرداد منتظر انتقال", count: refunds.data },
		can("support") && { href: "/reviews", icon: "star", label: "نظر منتظر تأیید", count: reviews.data },
		can("support") && { href: "/contact-messages", icon: "chat", label: "پیام تماس باز", count: tickets.data },
		can("catalog") && { href: "/products?stock=LOW_STOCK&sort=stock_asc", icon: "pkg", label: "محصولات کم‌موجود", count: undefined },
		can("catalog") && { href: "/stock-alerts", icon: "bell", label: "رنگ ناموجود با منتظر", count: stockAlerts.data },
		can("content") && { href: "/blog/new", icon: "feather", label: "نوشتن مقاله‌ی تازه", count: undefined },
	].filter(Boolean) as { href: string; icon: string; label: string; count?: number }[];

	if (!cards.length) return null;
	return (
		<div className="stats">
			{cards.map((c) => (
				<Link key={c.href} href={c.href} className="stat link">
					<span className="si">
						<Icon name={c.icon} />
					</span>
					<span>
						<b>{c.count === undefined ? <Icon name="arrow" style={{ width: 20, height: 20 }} /> : toPersianDigits(c.count)}</b>
						<span>{c.label}</span>
					</span>
				</Link>
			))}
		</div>
	);
}

function ShareBars({ title, mix, label }: { title: string; mix: Record<string, number | undefined>; label: (key: string) => React.ReactNode }) {
	const total = Object.values(mix).reduce<number>((s, n) => s + (n ?? 0), 0);
	return (
		<section className="icard">
			<h3>{title}</h3>
			<ul className="share">
				{Object.entries(mix)
					.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
					.map(([key, n]) => (
						<li key={key}>
							<span>{label(key)}</span>
							<span className="tr" aria-hidden>
								<i style={{ width: `${total ? ((n ?? 0) / total) * 100 : 0}%` }} />
							</span>
							<span className="muted">
								{toPersianDigits(n ?? 0)} · {toPersianDigits(total ? Math.round(((n ?? 0) / total) * 100) : 0)}٪
							</span>
						</li>
					))}
			</ul>
		</section>
	);
}

/** ADMIN's report for a range (`GET /admin/reports/overview`). */
function Report() {
	const [f, setF] = useUrlFilters({ range: "30" });
	const from = tehranDate(Number(f.range) - 1);
	const to = tehranDate(0);

	const report = useQuery({
		queryKey: ["reports", "overview", { from, to }],
		queryFn: () => withMappedError(() => ReportsEndpoints.getOverview(from, to)),
		meta: { showNotificationOnRefetch: true },
	});
	const reportError = toErrorView(ERROR_BEHAVIOUR, report.error, "دریافت گزارش با خطا مواجه شد.");
	const r = report.data;

	return (
		<>
			<div className="bo-head" style={{ marginTop: 8, marginBottom: 14 }}>
				<div>
					<h1 style={{ fontSize: 18 }}>گزارش فروش</h1>
					<p>
						{formatDate(`${from}T12:00:00+03:30`)} تا {formatDate(`${to}T12:00:00+03:30`)}
					</p>
				</div>
				<div className="seg" role="tablist" aria-label="بازه">
					{RANGES.map((x) => (
						<button
							key={x.value}
							type="button"
							role="tab"
							aria-selected={f.range === x.value}
							className={classNames({ on: f.range === x.value })}
							onClick={() => setF({ range: x.value })}
						>
							{x.label}
						</button>
					))}
				</div>
			</div>
			{report.isLoading ? (
				<Loading />
			) : reportError ? (
				<ErrorComponent
					retryable={reportError.retryable}
					ticketAble={reportError.ticketAble}
					errorText={reportError.errorText}
					executeFunction={() => report.refetch()}
					loading={report.isFetching}
				/>
			) : r ? (
				<div className="stack" style={{ gap: 16, opacity: report.isFetching ? 0.6 : 1, transition: "opacity .2s" }}>
					<div className="stats" style={{ marginBottom: 0 }}>
						{[
							{ icon: "wallet", label: "فروش (تومان)", value: formatPrice(r.revenue) },
							{ icon: "box", label: "سفارش پرداخت‌شده", value: toPersianDigits(r.ordersCount) },
							{ icon: "receipt", label: "میانگین سبد (تومان)", value: formatPrice(r.averageOrderValue) },
							{ icon: "users", label: "مشتری جدید", value: toPersianDigits(r.newCustomers) },
						].map((k) => (
							<div key={k.label} className="stat">
								<span className="si">
									<Icon name={k.icon} />
								</span>
								<span style={{ minWidth: 0 }}>
									<b>{k.value}</b>
									<span>{k.label}</span>
								</span>
							</div>
						))}
					</div>
					<section className="icard">
						<h3>
							<Icon name="chart" /> فروش روزانه (تومان)
						</h3>
						<RevenueChart series={r.dailySeries} />
					</section>
					<div className="cols3">
						<section className="icard">
							<h3>
								<Icon name="camera" /> امضای کیوا و رزرو
							</h3>
							<dl className="kv">
								<dt>تأیید عکس</dt>
								<dd>{toPersianDigits(r.mediaApprovalRate)}٪</dd>
								<dt>درخواست تغییر</dt>
								<dd>{toPersianDigits(r.changeRequestRate)}٪</dd>
								<dt>سهم رزرو</dt>
								<dd>{toPersianDigits(r.reservationShare)}٪</dd>
								<dt>نرخ مرجوعی</dt>
								<dd>{toPersianDigits(r.returnRate)}٪</dd>
								<dt>جمع تخفیف</dt>
								<dd>{formatToman(r.discountTotal)}</dd>
							</dl>
						</section>
						<ShareBars title="روش ارسال" mix={r.shippingMix} label={(k) => labelOf(SHIPPING_METHOD, k)} />
						<ShareBars
							title="پیام‌رسان عکس"
							mix={r.messengerMix}
							label={(k) => (
								<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
									<MessengerIcon channel={k} width={16} height={16} />
									{labelOf(MESSENGER, k)}
								</span>
							)}
						/>
					</div>
					<section className="icard">
						<h3>
							<Icon name="award" /> پرفروش‌ها
						</h3>
						{r.topProducts.length ? (
							<div className="tbl-scroll">
								<table className="tbl">
									<thead>
										<tr>
											<th>محصول</th>
											<th>تعداد</th>
											<th>فروش</th>
										</tr>
									</thead>
									<tbody>
										{r.topProducts.map((t) => (
											<tr key={t.product.id}>
												<td>
													<span className="cell-prod">
														<span className="th-img">
															{/* eslint-disable-next-line @next/next/no-img-element -- API image URL */}
															{t.product.imageUrl && <img src={t.product.imageUrl} alt="" />}
														</span>
														<Link href={`/products/${t.product.id}`}>{t.product.name}</Link>
													</span>
												</td>
												<td>{toPersianDigits(t.unitsSold)}</td>
												<td className="nowrap">{formatToman(t.revenue)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<p className="muted">در این بازه فروشی نبوده.</p>
						)}
					</section>
				</div>
			) : null}
		</>
	);
}

/** `/` — the work waiting for the signed-in roles; ADMIN also gets the sales report. */
export default function DashboardView() {
	const can = useCan();
	const user = useAuthStore((s) => s.user);
	return (
		<>
			<PageHead title={`سلام ${displayNameOf(user)}`} subtitle="کارهایی که منتظرت هستند." />
			<QueueCards />
			{can("reports") && <Report />}
		</>
	);
}
