"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import HtmlField from "@/app/_components/panel/htmlField/htmlField";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import SeoFields from "@/app/_components/panel/seoFields/seoFields";
import UnsavedGuard from "@/app/_components/panel/unsavedGuard/unsavedGuard";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import { STORE_REFRESH_MINUTES, STORE_URL } from "@/config/global";
import { toast } from "@/store/notification.store";
import { toSeoInput } from "@/types/common.type";
import { StaticPage } from "@/types/content.type";
import { toErrorView } from "@/utils/apiError";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime, onSiteWithin } from "@/utils/format";
import { withMappedError } from "@/utils/withMappedError";
import { KNOWN_PAGES, PagesEndpoints } from "../../_api/pagesEndpoints";

const BACK = { href: "/pages", label: "صفحات ثابت" };
/** `StaticPageUpsertRequest` caps (1.12.0). */
const TITLE_MAX = 120;
const CONTENT_MAX = 50_000;

/**
 * `/pages/[slug]` — title, HTML content and SEO of one static page. Whether it exists comes from the panel's list
 * (`GET /admin/pages`); a slug not in it starts a new page, so a missing page is never read as an error.
 */
export default function PageEditView({ slug }: { slug: string }) {
	const pages = useQuery({
		queryKey: ["pages", "list"],
		queryFn: () => withMappedError(() => PagesEndpoints.getPages()),
		meta: { showNotificationOnRefetch: true },
	});
	const exists = !!pages.data?.some((p) => p.slug === slug);
	const page = useQuery({
		queryKey: ["pages", "detail", slug],
		queryFn: () => withMappedError(() => PagesEndpoints.getPage(slug)),
		enabled: exists,
		meta: { showNotificationOnRefetch: true },
	});

	const pagesError = toErrorView(ERROR_BEHAVIOUR, pages.error, "دریافت صفحات ثابت با خطا مواجه شد.");
	const pageError = toErrorView(ERROR_BEHAVIOUR, page.error, "دریافت صفحه با خطا مواجه شد.");

	if (pages.isLoading || page.isLoading) return <Loading />;
	if (pagesError || pageError) {
		const view = (pagesError ?? pageError)!;
		return (
			<>
				<PageHead title={`/pages/${slug}`} back={BACK} />
				<ErrorComponent
					retryable={view.retryable}
					ticketAble={view.ticketAble}
					errorText={view.errorText}
					executeFunction={() => (pagesError ? pages.refetch() : page.refetch())}
					loading={pages.isFetching || page.isFetching}
				/>
			</>
		);
	}
	if (exists && !page.data) return null;
	return <PageForm key={page.data?.updatedAt ?? "new"} slug={slug} page={exists ? (page.data ?? null) : null} />;
}

function PageForm({ slug, page }: { slug: string; page: StaticPage | null }) {
	const queryClient = useQueryClient();
	// what the form opened with — saving refetches the page and remounts the form (`key={updatedAt}`)
	const [base] = useState(() => ({ title: page?.title ?? KNOWN_PAGES.find((p) => p.slug === slug)?.title ?? "", content: page?.content ?? "<h2></h2>\n<p></p>", seo: page?.seo ?? {} }));
	const [title, setTitle] = useState(base.title);
	const [content, setContent] = useState(base.content);
	const [seo, setSeo] = useState(base.seo);
	const dirty = JSON.stringify({ title, content, seo }) !== JSON.stringify(base);
	const [touched, setTouched] = useState(false);

	const save = useMutation({
		mutationFn: () => withMappedError(() => PagesEndpoints.save(slug, { title: title.trim(), content, seo: toSeoInput(seo) })),
		meta: { showNotification: true },
		onSuccess: () => {
			toast(`${page ? "صفحه ذخیره شد" : "صفحه ساخته شد"} — ${onSiteWithin(STORE_REFRESH_MINUTES.pages)}`, { icon: "check" });
			// the list (a new page joins it) and this page
			queryClient.invalidateQueries({ queryKey: ["pages"] });
		},
	});

	const local = {
		title: !title.trim() ? "عنوان را بنویس." : title.length > TITLE_MAX ? "حداکثر ۱۲۰ حرف." : null,
		content: !content.replace(/<[^>]+>/g, "").trim() ? "متن صفحه خالی است." : content.length > CONTENT_MAX ? "حداکثر ۵۰٬۰۰۰ نویسه." : null,
	};
	const server = fieldErrorsOf(save.error);
	const submit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setTouched(true);
		if (!local.title && !local.content) save.mutate();
	};

	return (
		<>
			<PageHead
				title={page?.title ?? "صفحه‌ی تازه"}
				back={BACK}
				subtitle={
					<>
						<span className="ltr">/pages/{slug}</span>
						{page?.updatedAt ? ` · آخرین ویرایش ${formatDateTime(page.updatedAt)}` : " · هنوز ساخته نشده"}
					</>
				}
				actions={
					page && (
						<Button size="sm" variant="white" href={`${STORE_URL}/pages/${slug}`} target="_blank" rel="noreferrer" iconStart={<Icon name="external" />}>
							مشاهده در سایت
						</Button>
					)
				}
			/>
			<form onSubmit={submit} noValidate>
				<section className="fsec">
					<h3>
						<Icon name="file" /> متن
					</h3>
					<div className="stack" style={{ marginTop: 14 }}>
						<Input label="عنوان" maxLength={TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} error={(touched && local.title) || server.title} />
						<HtmlField
							label="محتوا (HTML)"
							value={content}
							onChange={(e) => setContent(e.target.value)}
							error={(touched && local.content) || server.content}
							style={{ minHeight: 360 }}
						/>
					</div>
				</section>
				<section className="fsec">
					<h3>
						<Icon name="search" /> SEO
					</h3>
					<SeoFields serverBuilt value={seo} onChange={setSeo} errors={server} titlePlaceholder={title ? `${title} | کیوا` : undefined} />
				</section>
				<UnsavedGuard dirty={dirty && !save.isSuccess} />
				<div className="savebar">
					<span className="msg">سایت صفحه‌های ثابت را هر {toPersianDigits(STORE_REFRESH_MINUTES.pages)} دقیقه تازه می‌کند (ISR).</span>
					<Button type="submit" size="sm" isLoading={save.isPending}>
						{page ? "ذخیره" : "ساخت صفحه"}
					</Button>
				</div>
			</form>
		</>
	);
}
