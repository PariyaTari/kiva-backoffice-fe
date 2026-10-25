"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/app/_components/icon/icons";
import ChipsInput from "@/app/_components/panel/chipsInput/chipsInput";
import JalaliDateTimeInput from "@/app/_components/panel/jalaliDateTimeInput/jalaliDateTimeInput";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import SeoFields from "@/app/_components/panel/seoFields/seoFields";
import SingleMediaField, { PickedMedia } from "@/app/_components/panel/singleMediaField/singleMediaField";
import UnsavedGuard from "@/app/_components/panel/unsavedGuard/unsavedGuard";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Select from "@/app/_components/ui/select/select";
import Switch from "@/app/_components/ui/switch/switch";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { STORE_REFRESH_MINUTES, STORE_URL } from "@/config/global";
import { toast } from "@/store/notification.store";
import { SeoMeta, toSeoInput } from "@/types/common.type";
import { AdminBlogPost, BlogPostUpsertRequest, BlogStatus } from "@/types/content.type";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime, onSiteWithin } from "@/utils/format";
import { fieldErrorsWith } from "@/utils/fieldErrors";
import { BLOG_STATUS, optionsOf } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { BlogEndpoints } from "../../_api/blogEndpoints";
import BlockEditor, { EditableBlock, newBlock } from "../blockEditor/blockEditor";

const SLUG = /^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;

/** The 1.21.0 409/400s that are about one field. */
const CODE_FIELDS = { DUPLICATE_SLUG: "slug", BLOG_CATEGORY_NOT_FOUND: "categoryId", BLOG_AUTHOR_NOT_FOUND: "authorId" };

type Values = {
	title: string;
	slug: string;
	excerpt: string;
	lead: string;
	categoryId: string;
	authorId: string;
	cover: PickedMedia;
	coverBackground: string;
	readingMinutes: number | null;
	blocks: EditableBlock[];
	tags: string[];
	isFeatured: boolean;
	status: BlogStatus;
	publishedAt: string | null;
	seo: SeoMeta;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The post's blocks for the editor. A «کارت محصول» whose product left the store comes back with `product = null` and
 * its id in `unavailableProductIds` (in block order) — kept on the block so the editor can say so; saved as is it
 * answers `PRODUCT_NOT_FOUND`.
 */
const toBlocks = (p: AdminBlogPost): EditableBlock[] => {
	const gone = [...p.unavailableProductIds];
	return p.blocks.map((b, i) => ({
		key: `s${i}`,
		type: b.type,
		text: b.text ?? "",
		html: b.html ?? "",
		title: b.title ?? "",
		items: b.items ?? [],
		productId: b.type === "PRODUCT" ? (b.product?.id ?? gone.shift() ?? null) : null,
		imageMediaId: b.image?.id ?? null,
		imageUrl: b.image ? b.image.thumbnailUrl || b.image.url : null,
	}));
};

const toValues = (p: AdminBlogPost | null): Values => ({
	title: p?.title ?? "",
	slug: p?.slug ?? "",
	excerpt: p?.excerpt ?? "",
	lead: p?.lead ?? "",
	categoryId: p?.category ? String(p.category.id) : "",
	authorId: p?.author ? String(p.author.id) : "",
	cover: p?.cover ? { id: p.cover.id, url: p.cover.thumbnailUrl || p.cover.url } : null,
	coverBackground: p?.coverBackground ?? "",
	readingMinutes: p?.readingMinutes ?? null,
	blocks: p ? toBlocks(p) : [newBlock("HEADING"), newBlock("PARAGRAPH")],
	tags: p?.tags ?? [],
	isFeatured: p?.isFeatured ?? false,
	status: p?.status ?? "DRAFT",
	publishedAt: p?.publishedAt ?? null,
	seo: p?.seo ?? {},
});

const toPayload = (v: Values): BlogPostUpsertRequest => ({
	title: v.title.trim(),
	slug: v.slug.trim(),
	excerpt: v.excerpt.trim(),
	lead: v.lead.trim(),
	categoryId: Number(v.categoryId),
	...(v.authorId ? { authorId: Number(v.authorId) } : {}),
	...(v.cover ? { coverMediaId: v.cover.id } : {}),
	coverBackground: v.coverBackground || null,
	readingMinutes: v.readingMinutes,
	blocks: v.blocks.map((b) => ({
		type: b.type,
		text: b.text?.trim() || null,
		html: b.html?.trim() || null,
		title: b.title?.trim() || null,
		items: b.type === "LIST" ? (b.items ?? []).map((x) => x.trim()).filter(Boolean) : null,
		productId: b.type === "PRODUCT" ? b.productId : null,
		imageMediaId: b.type === "IMAGE" ? b.imageMediaId : null,
	})),
	tags: v.tags,
	isFeatured: v.isFeatured,
	status: v.status,
	publishedAt: v.publishedAt,
	// canonical, share image and JSON-LD are built by the server (ignored if sent)
	seo: toSeoInput(v.seo),
});

type BlogPostFormProps = {
	post: AdminBlogPost | null;
	/** Authors the posts already have — the contract has no authors list (FEATURES §7 #2). */
	authors: { id: number; name: string }[];
	categories: { id: number; name: string }[];
	onCreated?: (post: AdminBlogPost) => void;
	onDelete?: () => void;
};

/** `BlogPostUpsertRequest` — head (title, slug, excerpt, lead, category, author, cover), blocks, publication, SEO. */
export default function BlogPostForm({ post, authors, categories, onCreated, onDelete }: BlogPostFormProps) {
	const queryClient = useQueryClient();
	const [values, setValues] = useState<Values>(() => toValues(post));
	// what the form opened with — saving refetches the post and the page remounts the form (`key={updatedAt}`)
	const [base] = useState(values);
	const dirty = !same(values, base);
	const [touched, setTouched] = useState(false);
	const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));

	const save = useMutation({
		mutationFn: () => withMappedError(() => (post ? BlogEndpoints.update(post.id, toPayload(values)) : BlogEndpoints.create(toPayload(values)))),
		meta: { showNotification: true },
		onSuccess: (saved) => {
			toast(`${post ? "مقاله ذخیره شد" : "مقاله ساخته شد"} — ${onSiteWithin(STORE_REFRESH_MINUTES.blog)}`, { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["blog"] });
			if (!post) onCreated?.(saved);
		},
	});

	const local: Record<string, string | null> = {
		title: !values.title.trim() ? "عنوان را بنویس." : values.title.trim().length > 120 ? "حداکثر ۱۲۰ حرف." : null,
		slug: !SLUG.test(values.slug) ? "حروف کوچک لاتین، رقم و خط تیره." : values.slug.length > 100 ? "حداکثر ۱۰۰ حرف." : null,
		categoryId: !values.categoryId ? "دسته را انتخاب کن." : null,
		excerpt: values.excerpt.length > 300 ? "حداکثر ۳۰۰ حرف." : null,
		lead: values.lead.length > 600 ? "حداکثر ۶۰۰ حرف." : null,
		coverBackground: values.coverBackground && !HEX.test(values.coverBackground) ? "رنگ مثل #E4D9F3 (شش رقم hex)." : null,
		readingMinutes: values.readingMinutes != null && (values.readingMinutes < 1 || values.readingMinutes > 60) ? "بین ۱ تا ۶۰ دقیقه، یا خالی." : null,
		tags: values.tags.length > 10 ? "حداکثر ۱۰ برچسب." : values.tags.some((t) => t.trim().length > 30) ? "هر برچسب حداکثر ۳۰ حرف." : null,
		blocks: !values.blocks.length ? "مقاله حداقل یک بلوک می‌خواهد." : values.blocks.length > 100 ? "حداکثر ۱۰۰ بلوک." : null,
	};
	const server = fieldErrorsWith(save.error, CODE_FIELDS);
	const unavailable = post?.unavailableProductIds ?? [];
	const err = (k: string) => (touched && local[k]) || server[k] || null;

	const submit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setTouched(true);
		if (Object.values(local).some(Boolean)) {
			toast("چند فیلد را باید درست کنی", { type: "error" });
			return;
		}
		save.mutate();
	};

	return (
		<form onSubmit={submit} noValidate className="edit-grid">
			<div>
				<section className="fsec">
					<h3>
						<Icon name="feather" /> سربرگ
					</h3>
					<div className="stack" style={{ marginTop: 14 }}>
						<Input label="عنوان" value={values.title} onChange={(e) => set("title", e.target.value)} error={err("title")} />
						<div className="form-grid">
							<Input
								label="slug"
								direction="ltr"
								value={values.slug}
								onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
								error={err("slug")}
								hint={values.slug ? `/blog/${values.slug}` : undefined}
							/>
							<Select label="دسته" placeholder="انتخاب دسته" value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} options={categories.map((c) => ({ value: String(c.id), label: c.name }))} error={err("categoryId")} />
						</div>
						<Textarea
							label="خلاصه"
							labelNote="کارت مقاله"
							maxLength={300}
							value={values.excerpt}
							onChange={(e) => set("excerpt", e.target.value)}
							error={err("excerpt")}
							footer={<small className="muted">{toPersianDigits(values.excerpt.length)} / ۳۰۰</small>}
							style={{ minHeight: 70 }}
						/>
						<Textarea label="پاراگراف آغازین" labelNote="lead، متن ساده" maxLength={600} value={values.lead} onChange={(e) => set("lead", e.target.value)} error={err("lead")} style={{ minHeight: 70 }} />
					</div>
				</section>

				<section className="fsec">
					<h3>
						<Icon name="layers" /> متن مقاله
					</h3>
					<p className="d">هر تیتر در فهرست مطالب مقاله هم می‌آید.</p>
					{!!unavailable.length && (
						<p className="note cream">
							{toPersianDigits(unavailable.length)} کارت محصول به محصولی اشاره می‌کند که دیگر در فروشگاه نیست؛ سایت آن بلوک را نشان نمی‌دهد و ذخیره تا عوض یا حذفش رد می‌شود.
						</p>
					)}
					{err("blocks") && <p className="note danger">{err("blocks")}</p>}
					<BlockEditor blocks={values.blocks} onChange={(b) => set("blocks", b)} errors={server} unavailableProductIds={unavailable} />
				</section>

				<section className="fsec">
					<h3>
						<Icon name="search" /> SEO
					</h3>
					<SeoFields value={values.seo} onChange={(v) => set("seo", v)} errors={server} titlePlaceholder={values.title ? `${values.title} | مجله کیوا` : undefined} serverBuilt />
				</section>
			</div>

			<aside>
				<section className="icard">
					<h3>
						<Icon name="eye" /> انتشار
					</h3>
					<div className="stack">
						<Select label="وضعیت" value={values.status} onChange={(e) => set("status", e.target.value as BlogStatus)} options={optionsOf(BLOG_STATUS)} error={err("status")} />
						<div className="field">
							<label>زمان انتشار</label>
							<JalaliDateTimeInput value={values.publishedAt} onChange={(d) => set("publishedAt", d)} ariaLabel="زمان انتشار" />
							<span className="help">خالی = همان لحظه‌ی انتشار؛ زمان آینده = زمان‌بندی</span>
						</div>
						{post?.scheduled && <p className="note cream">زمان‌بندی‌شده: از {formatDateTime(post.publishedAt)} در مجله دیده می‌شود.</p>}
						<Switch label="منتخب سردبیر" checked={values.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
						<Button type="submit" isLoading={save.isPending} fullWidth>
							{post ? "ذخیره" : "ساخت مقاله"}
						</Button>
						{post && post.status === "PUBLISHED" && !post.scheduled && (
							<Button variant="white" size="sm" href={`${STORE_URL}/blog/${post.slug}`} target="_blank" rel="noreferrer" iconStart={<Icon name="external" />}>
								مشاهده در سایت
							</Button>
						)}
						{post?.helpfulStats && (
							<p className="muted" style={{ fontSize: 12.5 }}>
								«مفید بود؟» {toPersianDigits(post.helpfulStats.helpfulCount)} آره · {toPersianDigits(post.helpfulStats.notHelpfulCount)} نه
							</p>
						)}
						{post && (
							<p className="muted" style={{ fontSize: 12.5, lineHeight: 1.9 }}>
								ساخت {formatDateTime(post.createdAt)}
								{post.createdBy && ` · ${post.createdBy}`}
								<br />
								آخرین ویرایش {formatDateTime(post.updatedAt)}
								{post.updatedBy && ` · ${post.updatedBy}`}
							</p>
						)}
						{onDelete && (
							<button type="button" className="btn btn-link" style={{ color: "var(--danger)", justifySelf: "start" }} onClick={onDelete}>
								<Icon name="trash" /> حذف مقاله
							</button>
						)}
					</div>
				</section>
				<section className="icard">
					<h3>
						<Icon name="image" /> کاور و نویسنده
					</h3>
					<div className="stack">
						<SingleMediaField label="کاور" purpose="BLOG" value={values.cover} onChange={(m) => set("cover", m)} error={err("coverMediaId")} />
						<div className="field">
							<label>رنگ پس‌زمینه‌ی کاور</label>
							<div style={{ display: "flex", gap: 8 }}>
								<input type="color" aria-label="رنگ کاور" value={values.coverBackground || "#E4D9F3"} onChange={(e) => set("coverBackground", e.target.value.toUpperCase())} style={{ width: 50, height: 50, border: 0, background: "none", padding: 0 }} />
								<input className="input ltr" value={values.coverBackground} onChange={(e) => set("coverBackground", e.target.value)} placeholder="#E4D9F3" aria-label="کد رنگ کاور" />
							</div>
							{err("coverBackground") && <span className="err" style={{ display: "block" }}>{err("coverBackground")}</span>}
						</div>
						<Select label="نویسنده" placeholder="—" value={values.authorId} onChange={(e) => set("authorId", e.target.value)} options={authors.map((a) => ({ value: String(a.id), label: a.name }))} error={err("authorId")} />
						<NumberInput label="زمان مطالعه (دقیقه)" labelNote="خالی = خودکار" value={values.readingMinutes} onChange={(n) => set("readingMinutes", n)} error={err("readingMinutes")} />
						<ChipsInput label="برچسب‌ها" value={values.tags} onChange={(t) => set("tags", t)} />
						{err("tags") && <span className="err" style={{ display: "block" }}>{err("tags")}</span>}
					</div>
				</section>
				{!!post?.feedbackComments.length && (
					<section className="icard">
						<h3>
							<Icon name="chat" /> نظرهای «مفید نبود»
						</h3>
						<ul className="note-list">
							{post.feedbackComments.map((c, i) => (
								<li key={i}>
									«{c.comment}»<small>{formatDateTime(c.createdAt)}</small>
								</li>
							))}
						</ul>
					</section>
				)}
			</aside>
			<UnsavedGuard dirty={dirty && !save.isSuccess} />
		</form>
	);
}
