import { httpClient } from "@/httpClient/HttpClient";
import { AdminBlogAuthor, AdminBlogFilters, AdminBlogPost, AdminBlogPostList, BlogCategory, BlogPostUpsertRequest } from "@/types/content.type";

/**
 * Blog — `/admin/blog/posts*` and `/admin/blog/authors` (ADMIN, CONTENT_EDITOR): every post (drafts, scheduled,
 * archived) as `AdminBlogPost`. Categories come from the public `GET /blog/categories` (every one, empty ones too).
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

	/** 1.22.0 — every author, published posts or not: the default one (`isDefault`) first, then by creation. Read-only. */
	getAuthors: async () => {
		const res = await httpClient.call<AdminBlogAuthor[]>({ method: "GET", url: "admin/blog/authors" });
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
