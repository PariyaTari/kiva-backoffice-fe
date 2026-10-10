import { httpClient } from "@/httpClient/HttpClient";
import { AdminCustomer, CustomerList } from "@/types/support.type";
import { UserRole } from "@/types/user.type";

/** `/admin/customers*` — search (ADMIN, SUPPORT) and panel roles (ADMIN only). */
export const CustomersEndpoints = {
	/** `q` = mobile or name. */
	getCustomers: async (q: string, page: number, size: number) => {
		const res = await httpClient.call<CustomerList>({ method: "GET", url: "admin/customers", params: { q: q || undefined, page, size } });
		return res.data;
	},

	/**
	 * Replaces the person's panel roles (`CUSTOMER` always stays). Every session of theirs ends; nobody changes their
	 * own roles (`422 ROLE_CHANGE_NOT_ALLOWED`).
	 */
	setRoles: async (id: number, roles: UserRole[]) => {
		const res = await httpClient.call<AdminCustomer>({ method: "PUT", url: `admin/customers/${id}/roles`, data: { roles } });
		return res.data;
	},
};
