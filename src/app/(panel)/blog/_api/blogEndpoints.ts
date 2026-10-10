import { httpClient } from "@/httpClient/HttpClient";
import { BlogCategory, BlogPostDetail, BlogPostList, BlogPostUpsertRequest } from "@/types/content.type";

/**
 * Blog. Writes are `/admin/blog/posts*` (ADMIN, CONTENT_EDITOR). The contract has no admin list, categories or
 * authors (FEATURES §7 #1–2): the list and categories come from the public blog, a post is read by id
 * (`GET /blog/posts/{id}` — drafts need the backend to answer staff, see docs/PLAN.md).
 */
export const BlogEndpoints = {
	getPosts: async (q: string, category: string, page: number, size: number) => {
		const res = await httpClient.call<BlogPostList>({ method: "GET", url: "blog/posts", params: { q: q || undefined, category: category || undefined, page, size } });
		return res.data;
	},

	getPost: async (id: number) => {
		const res = await httpClient.call<BlogPostDetail>({ method: "GET", url: `blog/posts/${id}` });
		return res.data;
	},

	getCategories: async () => {
		const res = await httpClient.call<BlogCategory[]>({ method: "GET", url: "blog/categories" });
		return res.data;
	},

	create: async (payload: BlogPostUpsertRequest) => {
		const res = await httpClient.call<BlogPostDetail>({ method: "POST", url: "admin/blog/posts", data: payload });
		return res.data;
	},

	update: async (id: number, payload: BlogPostUpsertRequest) => {
		const res = await httpClient.call<BlogPostDetail>({ method: "PUT", url: `admin/blog/posts/${id}`, data: payload });
		return res.data;
	},

	remove: async (id: number) => {
		await httpClient.call<void>({ method: "DELETE", url: `admin/blog/posts/${id}` });
	},
};
