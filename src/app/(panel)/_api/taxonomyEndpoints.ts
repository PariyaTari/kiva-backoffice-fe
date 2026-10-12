import { httpClient } from "@/httpClient/HttpClient";
import { AdminCategory, Category, Material } from "@/types/catalog.type";
import { StoreProduct } from "@/types/marketing.type";
import { Color } from "@/types/order.type";

/**
 * The catalogue's lookups that many panel forms need (product, category, discount code, campaign, testimonial).
 * Colours come from the public `GET /colors` (it has `productCount`); materials from `GET /admin/materials` (1.5.0).
 */
export const TaxonomyEndpoints = {
	/** Every category, including those hidden from the menu (`GET /admin/categories`, ADMIN · CATALOG_MANAGER). */
	getAdminCategories: async () => {
		const res = await httpClient.call<AdminCategory[]>({ method: "GET", url: "admin/categories" });
		return res.data;
	},

	/** Public menu categories — for roles without catalogue access (content editor's discount/campaign pickers). */
	getCategories: async () => {
		const res = await httpClient.call<Category[]>({ method: "GET", url: "categories" });
		return res.data;
	},

	getColors: async () => {
		const res = await httpClient.call<Color[]>({ method: "GET", url: "colors" });
		return res.data;
	},

	/** Every material with its product count (`GET /admin/materials`, ADMIN · CATALOG_MANAGER). */
	getMaterials: async () => {
		const res = await httpClient.call<Material[]>({ method: "GET", url: "admin/materials" });
		return res.data;
	},

	/**
	 * Product pickers (campaign, discount code, testimonial, blog block) — the storefront list (`GET /products`),
	 * readable by every role; published products only.
	 */
	searchProducts: async (q: string, signal?: AbortSignal) => {
		const res = await httpClient.call<{ items: StoreProduct[] }>({ method: "GET", url: "products", params: { q, size: 10 }, signal });
		return res.data.items;
	},

	/** The chosen products back by id (`ids`, order kept). */
	getProductsByIds: async (ids: number[]) => {
		const res = await httpClient.call<{ items: StoreProduct[] }>({ method: "GET", url: "products", params: { ids, size: Math.max(ids.length, 1) } });
		return res.data.items;
	},
};
