import { httpClient } from "@/httpClient/HttpClient";
import { AdminBlogFilters, AdminBlogPost, AdminBlogPostList, BlogCategory, BlogPostUpsertRequest } from "@/types/content.type";

/**
 * Blog — `/admin/blog/posts*` (ADMIN, CONTENT_EDITOR): every post (drafts, scheduled, archived) as `AdminBlogPost`.
 * The contract still has no admin categories or authors (FEATURES §7 #2): categories come from the public blog.
 */
export const BlogEndpoints = {
	getPosts: async (filters: AdminBlogFilters, page: number, size: number) => {
		const res = await httpClient.call<AdminBlogPostList>({
			method: "GET",
			url: "admin/blog/posts",
			params: { status: filters.status || undefined, q: filters.q || undefined, category: filters.category || undefined, page, size },
		});
		return res.data;
	},

	getPost: async (id: number) => {
		const res = await httpClient.call<AdminBlogPost>({ method: "GET", url: `admin/blog/posts/${id}` });
		return res.data;
	},

	getCategories: async () => {
		const res = await httpClient.call<BlogCategory[]>({ method: "GET", url: "blog/categories" });
		return res.data;
	},

	create: async (payload: BlogPostUpsertRequest) => {
		const res = await httpClient.call<AdminBlogPost>({ method: "POST", url: "admin/blog/posts", data: payload });
		return res.data;
	},

	update: async (id: number, payload: BlogPostUpsertRequest) => {
		const res = await httpClient.call<AdminBlogPost>({ method: "PUT", url: `admin/blog/posts/${id}`, data: payload });
		return res.data;
	},

	remove: async (id: number) => {
		await httpClient.call<void>({ method: "DELETE", url: `admin/blog/posts/${id}` });
	},
};
