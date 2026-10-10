"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/_components/icon/icons";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import Button from "@/app/_components/ui/button/button";
import { STORE_URL } from "@/config/global";
import { KNOWN_PAGES } from "../../_api/pagesEndpoints";

const SLUG = /^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*$/;

/** `/pages` — the static pages the storefront links to, and any other slug to create. */
export default function PagesView() {
	const router = useRouter();
	const [slug, setSlug] = useState("");
	const [error, setError] = useState<string | null>(null);

	const open = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!SLUG.test(slug)) return setError("حروف کوچک لاتین، رقم و خط تیره (مثل about-us).");
		router.push(`/pages/${slug}`);
	};

	return (
		<>
			<PageHead title="صفحات ثابت" subtitle="صفحه‌های `/pages/{slug}` فروشگاه؛ متن HTML و SEO." />
			<p className="note" style={{ marginBottom: 14 }}>
				فهرست صفحه‌ها در کانترکت نیست؛ این‌ها slugهایی‌اند که سایت به آن‌ها لینک می‌دهد. برای صفحه‌ی تازه، slug را پایین بنویس.
			</p>
			<div className="cols2" style={{ marginBottom: 16 }}>
				{KNOWN_PAGES.map((p) => (
					<Link key={p.slug} href={`/pages/${p.slug}`} className="stat link">
						<span className="si">
							<Icon name="file" />
						</span>
						<span style={{ minWidth: 0 }}>
							<b style={{ fontSize: 15 }}>{p.title}</b>
							<span className="ltr" style={{ display: "block" }}>
								/pages/{p.slug}
							</span>
							<span>{p.usedBy}</span>
						</span>
					</Link>
				))}
			</div>
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
