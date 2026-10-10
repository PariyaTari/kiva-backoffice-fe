import { httpClient } from "@/httpClient/HttpClient";
import { Category, CategoryUpsertRequest } from "@/types/catalog.type";

/** `/admin/categories*` writes (ADMIN, CATALOG_MANAGER); the list is `TaxonomyEndpoints.getAdminCategories`. */
export const CategoriesEndpoints = {
	create: async (payload: CategoryUpsertRequest) => {
		const res = await httpClient.call<Category>({ method: "POST", url: "admin/categories", data: payload });
		return res.data;
	},

	update: async (id: number, payload: CategoryUpsertRequest) => {
		const res = await httpClient.call<Category>({ method: "PUT", url: `admin/categories/${id}`, data: payload });
		return res.data;
	},

	/** Only an empty category — one with products answers `409`. */
	remove: async (id: number) => {
		await httpClient.call<void>({ method: "DELETE", url: `admin/categories/${id}` });
	},
};
