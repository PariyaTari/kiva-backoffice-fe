import { httpClient } from "@/httpClient/HttpClient";
import { AdminCustomer, AdminCustomerDetail, CustomerFilters, CustomerList } from "@/types/support.type";
import { UserRole } from "@/types/user.type";

/** `/admin/customers*` — search and the customer page (ADMIN, SUPPORT), panel roles (ADMIN only). */
export const CustomersEndpoints = {
	/** `q` = mobile or name; `role` = only people with that role (the staff list). Deleted accounts never come back. */
	getCustomers: async (filters: CustomerFilters, page: number, size: number, signal?: AbortSignal) => {
		const res = await httpClient.call<CustomerList>({
			method: "GET",
			url: "admin/customers",
			params: { q: filters.q || undefined, role: filters.role || undefined, page, size },
			signal,
		});
		return res.data;
	},

	/** Profile, every saved address and the last 5 orders in any state; a deleted account is `404 NOT_FOUND`. */
	getCustomer: async (id: number) => {
		const res = await httpClient.call<AdminCustomerDetail>({ method: "GET", url: `admin/customers/${id}` });
		return res.data;
	},

	/**
	 * Replaces the person's panel roles (`CUSTOMER` always stays). Every session of theirs ends; nobody changes their
	 * own roles, and the last ADMIN keeps theirs (`422 ROLE_CHANGE_NOT_ALLOWED`, `meta.reason = LAST_ADMIN`).
	 */
	setRoles: async (id: number, roles: UserRole[]) => {
		const res = await httpClient.call<AdminCustomer>({ method: "PUT", url: `admin/customers/${id}/roles`, data: { roles } });
		return res.data;
	},
};
