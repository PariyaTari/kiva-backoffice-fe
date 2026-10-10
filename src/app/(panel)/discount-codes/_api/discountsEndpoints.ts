import { httpClient } from "@/httpClient/HttpClient";
import { DiscountCode, DiscountCodeList, DiscountCodeUpsertRequest } from "@/types/marketing.type";

/** `/admin/discount-codes*` (ADMIN only) — pure request functions. */
export const DiscountsEndpoints = {
	getCodes: async (active: boolean | null, page: number, size: number) => {
		const res = await httpClient.call<DiscountCodeList>({ method: "GET", url: "admin/discount-codes", params: { active: active ?? undefined, page, size } });
		return res.data;
	},

	create: async (payload: DiscountCodeUpsertRequest) => {
		const res = await httpClient.call<DiscountCode>({ method: "POST", url: "admin/discount-codes", data: payload });
		return res.data;
	},

	update: async (id: number, payload: DiscountCodeUpsertRequest) => {
		const res = await httpClient.call<DiscountCode>({ method: "PUT", url: `admin/discount-codes/${id}`, data: payload });
		return res.data;
	},

	/** «حذف» = deactivate; the code and its numbers stay. */
	deactivate: async (id: number) => {
		await httpClient.call<void>({ method: "DELETE", url: `admin/discount-codes/${id}` });
	},
};
