import { httpClient } from "@/httpClient/HttpClient";
import { PageMeta } from "@/types/pageinate";
import {
	AdminProduct,
	AdminProductFilters,
	AdminProductListResponse,
	AdminVariant,
	InventoryAdjustment,
	InventoryReason,
	ProductStatus,
	ProductUpsertRequest,
	VariantUpsertRequest,
} from "@/types/catalog.type";

const productUrl = (id: number, rest = "") => `admin/products/${id}${rest}`;

/** `/admin/products*` and `/admin/inventory/adjustments` (ADMIN, CATALOG_MANAGER) — pure request functions. */
export const ProductsEndpoints = {
	/** Every status, exact stock. */
	getProducts: async (filters: AdminProductFilters, page: number, size: number, signal?: AbortSignal) => {
		const res = await httpClient.call<AdminProductListResponse>({ method: "GET", url: "admin/products", params: { ...filters, page, size }, signal });
		return res.data;
	},

	getProduct: async (id: number) => {
		const res = await httpClient.call<AdminProduct>({ method: "GET", url: productUrl(id) });
		return res.data;
	},

	/** Variants can be sent along (create only). `409 DUPLICATE_SLUG / DUPLICATE_SKU`. */
	createProduct: async (payload: ProductUpsertRequest) => {
		const res = await httpClient.call<AdminProduct>({ method: "POST", url: "admin/products", data: payload });
		return res.data;
	},

	/**
	 * Full replace, guarded by the version the form was opened with (`If-Match: etag`): a newer one on the server →
	 * `412` / `409 CHANGED_BY_SOMEONE_ELSE`, nothing saved.
	 */
	updateProduct: async (id: number, payload: ProductUpsertRequest, etag: string) => {
		const res = await httpClient.call<AdminProduct>({ method: "PUT", url: productUrl(id), data: payload, headers: { "If-Match": etag } });
		return res.data;
	},

	/** Soft delete — past orders keep it. */
	archiveProduct: async (id: number) => {
		await httpClient.call<void>({ method: "DELETE", url: productUrl(id) });
	},

	/** Publish / draft / archive; `publishAt` in the future schedules the publication. */
	setStatus: async (id: number, status: ProductStatus, publishAt: string | null = null) => {
		const res = await httpClient.call<AdminProduct>({ method: "PATCH", url: productUrl(id, "/status"), data: { status, publishAt } });
		return res.data;
	},

	createVariant: async (id: number, payload: VariantUpsertRequest) => {
		const res = await httpClient.call<AdminVariant>({ method: "POST", url: productUrl(id, "/variants"), data: payload });
		return res.data;
	},

	updateVariant: async (id: number, variantId: number, payload: VariantUpsertRequest) => {
		const res = await httpClient.call<AdminVariant>({ method: "PUT", url: productUrl(id, `/variants/${variantId}`), data: payload });
		return res.data;
	},

	/** Deactivates the colour (it stays in past orders). */
	deactivateVariant: async (id: number, variantId: number) => {
		await httpClient.call<void>({ method: "DELETE", url: productUrl(id, `/variants/${variantId}`) });
	},

	/** The only way stock changes after creation — with a reason, logged. A variant back from zero queues «موجود شد» SMS. */
	adjustStock: async (variantId: number, delta: number, reason: InventoryReason, note: string | null) => {
		const res = await httpClient.call<InventoryAdjustment>({ method: "POST", url: "admin/inventory/adjustments", data: { variantId, delta, reason, note } });
		return res.data;
	},

	getAdjustments: async (variantId: number | null, page: number, size: number) => {
		const res = await httpClient.call<{ items: InventoryAdjustment[]; meta: PageMeta }>({
			method: "GET",
			url: "admin/inventory/adjustments",
			params: { variantId: variantId ?? undefined, page, size },
		});
		return res.data;
	},
};
