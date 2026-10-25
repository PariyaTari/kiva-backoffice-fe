"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import ConfirmModal from "@/app/_components/panel/confirmModal/confirmModal";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import { toast } from "@/store/notification.store";
import { toErrorView } from "@/utils/apiError";
import { withMappedError } from "@/utils/withMappedError";
import { BlogEndpoints } from "../../_api/blogEndpoints";
import BlogPostForm from "../blogPostForm/blogPostForm";

const BACK = { href: "/blog", label: "بلاگ" };

/** `/blog/new` (`id = null`) and `/blog/[id]` — one post, with the lookups its form needs. */
export default function BlogEditView({ id }: { id: number | null }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [confirmDelete, setConfirmDelete] = useState(false);

	const post = useQuery({
		queryKey: ["blog", "detail", id],
		queryFn: () => withMappedError(() => BlogEndpoints.getPost(id as number)),
		enabled: id !== null,
		meta: { showNotificationOnRefetch: true },
	});
	const categories = useQuery({
		queryKey: ["blog", "categories"],
		queryFn: () => withMappedError(() => BlogEndpoints.getCategories()),
		meta: { showNotificationOnRefetch: true },
	});
	// authors: only those the posts already have (FEATURES §7 #2 — no authors list in the contract)
	const authors = useQuery({
		queryKey: ["blog", "list", { status: "", q: "", category: "", page: 1, pageSize: 100 }],
		queryFn: () => withMappedError(() => BlogEndpoints.getPosts({}, 1, 100)),
		select: (list) => [...new Map(list.items.filter((p) => p.author).map((p) => [p.author!.id, { id: p.author!.id, name: p.author!.name }])).values()],
		meta: { showNotification: true },
	});

	const remove = useMutation({
		mutationFn: () => withMappedError(() => BlogEndpoints.remove(id as number)),
		meta: { showNotification: true },
		onSuccess: () => {
			toast("مقاله حذف شد", { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["blog"] });
			router.replace("/blog");
		},
	});

	const postError = toErrorView(ERROR_BEHAVIOUR, post.error, "دریافت مقاله با خطا مواجه شد.");
	const categoriesError = toErrorView(ERROR_BEHAVIOUR, categories.error, "دریافت دسته‌های بلاگ با خطا مواجه شد.");

	if (post.isLoading || categories.isLoading) return <Loading />;
	const blocking = postError ?? categoriesError;
	if (blocking)
		return (
			<>
				<PageHead title="مقاله" back={BACK} />
				<ErrorComponent
					retryable={blocking.retryable}
					ticketAble={blocking.ticketAble}
					errorText={blocking.errorText}
					executeFunction={() => (postError ? post.refetch() : categories.refetch())}
					loading={post.isFetching || categories.isFetching}
				/>
			</>
		);
	if ((id !== null && !post.data) || !categories.data) return null;

	return (
		<>
			<PageHead title={post.data?.title ?? "مقاله‌ی جدید"} back={BACK} subtitle={post.data ? `/blog/${post.data.slug}` : "بعد از ساخت، این صفحه برای ویرایش باز می‌ماند."} />
			<BlogPostForm
				key={post.data?.updatedAt ?? "new"}
				post={post.data ?? null}
				categories={categories.data}
				authors={authors.data ?? []}
				onCreated={(p) => router.replace(`/blog/${p.id}`)}
				onDelete={id !== null ? () => setConfirmDelete(true) : undefined}
			/>
			<ConfirmModal
				open={confirmDelete}
				onClose={() => setConfirmDelete(false)}
				tone="danger"
				icon="trash"
				title="حذف مقاله"
				text="این مقاله برای همیشه حذف می‌شود. برای برداشتن از سایت بدون حذف، وضعیت را «آرشیو» کن."
				confirmLabel="حذف"
				loading={remove.isPending}
				onConfirm={() => remove.mutate()}
			/>
		</>
	);
}
