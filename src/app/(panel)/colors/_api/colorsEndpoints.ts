import { httpClient } from "@/httpClient/HttpClient";
import { ColorUpsertRequest, Material, MaterialUpsertRequest } from "@/types/catalog.type";
import { Color } from "@/types/order.type";

/**
 * The palette and materials writes (ADMIN, CATALOG_MANAGER); lists are in `TaxonomyEndpoints`. A colour or material
 * still on a product (even a draft or archived one) can't be deleted: `409 IN_USE` with `meta.productCount`.
 */
export const ColorsEndpoints = {
	createColor: async (payload: ColorUpsertRequest) => {
		const res = await httpClient.call<Color>({ method: "POST", url: "admin/colors", data: payload });
		return res.data;
	},

	updateColor: async (key: string, payload: ColorUpsertRequest) => {
		const res = await httpClient.call<Color>({ method: "PUT", url: `admin/colors/${encodeURIComponent(key)}`, data: payload });
		return res.data;
	},

	/** Only a colour no variant and no testimonial uses — otherwise deactivate its variants. */
	deleteColor: async (key: string) => {
		await httpClient.call<void>({ method: "DELETE", url: `admin/colors/${encodeURIComponent(key)}` });
	},

	createMaterial: async (payload: MaterialUpsertRequest) => {
		const res = await httpClient.call<Material>({ method: "POST", url: "admin/materials", data: payload });
		return res.data;
	},

	/** A new name / description also reaches the product search text of its products. */
	updateMaterial: async (id: number, payload: MaterialUpsertRequest) => {
		const res = await httpClient.call<Material>({ method: "PUT", url: `admin/materials/${id}`, data: payload });
		return res.data;
	},

	deleteMaterial: async (id: number) => {
		await httpClient.call<void>({ method: "DELETE", url: `admin/materials/${id}` });
	},
};
