"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import Button from "@/app/_components/ui/button/button";
import { STORE_URL } from "@/config/global";
import { toErrorView } from "@/utils/apiError";
import { formatDateTime } from "@/utils/format";
import { withMappedError } from "@/utils/withMappedError";
import { KNOWN_PAGES, PagesEndpoints } from "../../_api/pagesEndpoints";

const SLUG = /^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*$/;

/** `/pages` — the written static pages (`GET /admin/pages`), the usual ones not written yet, and any other slug to create. */
export default function PagesView() {
	const router = useRouter();
	const [slug, setSlug] = useState("");
	const [error, setError] = useState<string | null>(null);

	const pages = useQuery({
		queryKey: ["pages", "list"],
		queryFn: () => withMappedError(() => PagesEndpoints.getPages()),
		meta: { showNotificationOnRefetch: true },
	});

	const open = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!SLUG.test(slug)) return setError("حروف کوچک لاتین، رقم و خط تیره (مثل about-us).");
		router.push(`/pages/${slug}`);
	};

	const pagesError = toErrorView(ERROR_BEHAVIOUR, pages.error, "دریافت صفحات ثابت با خطا مواجه شد.");
	const missing = KNOWN_PAGES.filter((k) => !pages.data?.some((p) => p.slug === k.slug));

	return (
		<>
			<PageHead title="صفحات ثابت" subtitle="صفحه‌های `/pages/{slug}` فروشگاه؛ متن HTML و SEO. صفحه حذف ندارد." />
			{pages.isLoading ? (
				<Loading />
			) : !!pagesError ? (
				<ErrorComponent retryable={pagesError.retryable} ticketAble={pagesError.ticketAble} errorText={pagesError.errorText} executeFunction={() => pages.refetch()} loading={pages.isFetching} />
			) : !pages.error && !!pages.data ? (
				<>
					<div className="cols2" style={{ marginBottom: 16 }}>
						{pages.data.map((p) => (
							<Link key={p.slug} href={`/pages/${p.slug}`} className="stat link">
								<span className="si">
									<Icon name="file" />
								</span>
								<span style={{ minWidth: 0 }}>
									<b style={{ fontSize: 15 }}>{p.title}</b>
									<span className="ltr" style={{ display: "block" }}>
										/pages/{p.slug}
									</span>
									<span>آخرین ویرایش {formatDateTime(p.updatedAt)}</span>
								</span>
							</Link>
						))}
					</div>
					{!pages.data.length && <p className="note" style={{ marginBottom: 14 }}>هنوز صفحه‌ای نوشته نشده.</p>}
					{!!missing.length && (
						<section className="icard" style={{ marginBottom: 16 }}>
							<h3>
								<Icon name="alert" /> هنوز نوشته نشده
							</h3>
							<div className="stack" style={{ gap: 8 }}>
								{missing.map((k) => (
									<div key={k.slug} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13.5 }}>
										<b>{k.title}</b>
										<span className="ltr muted">/pages/{k.slug}</span>
										<span className="muted">{k.usedBy}</span>
										<Button size="sm" variant="white" href={`/pages/${k.slug}`} style={{ marginInlineStart: "auto" }}>
											نوشتن
										</Button>
									</div>
								))}
							</div>
						</section>
					)}
				</>
			) : null}
			<form className="icard" onSubmit={open}>
				<h3>
					<Icon name="plus" /> صفحه‌ی دیگر
				</h3>
				<div className="fbar" style={{ marginBottom: 0 }}>
					<div className={`field grow${error ? " error" : ""}`}>
						<input
							className="input ltr"
							aria-label="slug"
							placeholder="about-us"
							value={slug}
							onChange={(e) => {
								setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
								setError(null);
							}}
						/>
						{error && <span className="err">{error}</span>}
					</div>
					<Button type="submit" size="sm">
						باز کردن / ساختن
					</Button>
					<a className="btn btn-link" href={`${STORE_URL}/pages/terms`} target="_blank" rel="noreferrer">
						<Icon name="external" /> نمونه در سایت
					</a>
				</div>
			</form>
		</>
	);
}
