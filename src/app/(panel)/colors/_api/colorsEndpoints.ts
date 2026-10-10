import { httpClient } from "@/httpClient/HttpClient";
import { ColorUpsertRequest, Material, MaterialUpsertRequest } from "@/types/catalog.type";
import { Color } from "@/types/order.type";

/**
 * The palette and materials writes (ADMIN, CATALOG_MANAGER). Their lists come from the public `/colors` and
 * `/materials`; a colour can't be deleted and a material can't be edited or listed for the panel (FEATURES §7 #6).
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

	createMaterial: async (payload: MaterialUpsertRequest) => {
		const res = await httpClient.call<Material>({ method: "POST", url: "admin/materials", data: payload });
		return res.data;
	},
};
