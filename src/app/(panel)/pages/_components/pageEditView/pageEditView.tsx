"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import SeoFields from "@/app/_components/panel/seoFields/seoFields";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { STORE_URL } from "@/config/global";
import { toast } from "@/store/notification.store";
import { StaticPage } from "@/types/content.type";
import { toErrorView } from "@/utils/apiError";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { formatDateTime } from "@/utils/format";
import { withMappedError } from "@/utils/withMappedError";
import { isPageMissingError, KNOWN_PAGES, PagesEndpoints } from "../../_api/pagesEndpoints";

const BACK = { href: "/pages", label: "صفحات ثابت" };

/** `/pages/[slug]` — title, HTML content and SEO of one static page; a slug without a page starts a new one. */
export default function PageEditView({ slug }: { slug: string }) {
	const page = useQuery({
		queryKey: ["pages", "detail", slug],
		queryFn: () => withMappedError(() => PagesEndpoints.getPage(slug)),
		meta: { showNotificationOnRefetch: true },
	});

	const missing = isPageMissingError(page.error);
	const pageError = missing ? null : toErrorView(ERROR_BEHAVIOUR, page.error, "دریافت صفحه با خطا مواجه شد.");

	if (page.isLoading) return <Loading />;
	if (pageError)
		return (
			<>
				<PageHead title={`/pages/${slug}`} back={BACK} />
				<ErrorComponent retryable={pageError.retryable} ticketAble={pageError.ticketAble} errorText={pageError.errorText} executeFunction={() => page.refetch()} loading={page.isFetching} />
			</>
		);
	return <PageForm key={page.data?.updatedAt ?? "new"} slug={slug} page={page.data ?? null} />;
}

function PageForm({ slug, page }: { slug: string; page: StaticPage | null }) {
	const queryClient = useQueryClient();
	const [title, setTitle] = useState(page?.title ?? KNOWN_PAGES.find((p) => p.slug === slug)?.title ?? "");
	const [content, setContent] = useState(page?.content ?? "<h2></h2>\n<p></p>");
	const [seo, setSeo] = useState(page?.seo ?? {});
	const [touched, setTouched] = useState(false);

	const save = useMutation({
		mutationFn: () => withMappedError(() => PagesEndpoints.save(slug, { title: title.trim(), content, seo })),
		meta: { showNotification: true },
		onSuccess: () => {
			toast(page ? "صفحه ذخیره شد" : "صفحه ساخته شد", { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["pages", "detail", slug] });
		},
	});

	const local = { title: !title.trim() ? "عنوان را بنویس." : null, content: !content.replace(/<[^>]+>/g, "").trim() ? "متن صفحه خالی است." : null };
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
						<Input label="عنوان" value={title} onChange={(e) => setTitle(e.target.value)} error={(touched && local.title) || server.title} />
						<Textarea
							label="محتوا (HTML)"
							labelNote="p، h2، h3، ul، ol، li، a، b، strong، em، mark، blockquote"
							className="code"
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
					<SeoFields value={seo} onChange={setSeo} errors={server} titlePlaceholder={title ? `${title} | کیوا` : undefined} />
				</section>
				<div className="savebar">
					<span className="msg">سایت صفحه‌های ثابت را هر ۱۰ دقیقه تازه می‌کند (ISR).</span>
					<Button type="submit" size="sm" isLoading={save.isPending}>
						{page ? "ذخیره" : "ساخت صفحه"}
					</Button>
				</div>
			</form>
		</>
	);
}
