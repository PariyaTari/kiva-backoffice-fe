/** Shared helpers of the admin mock: errors, the router, paging, digits, dates. */
import { randomUUID } from "node:crypto";

export const API = "/api/v1";
export const PORT = Number(process.env.MOCK_PORT || 8090);
export const ORIGIN = `http://localhost:${PORT}`;
export const DAY = 864e5;
export const HOUR = 36e5;
export const MIN = 60e3;

const FA = "۰۱۲۳۴۵۶۷۸۹";
export const fa = (v) => String(v).replace(/\d/g, (d) => FA[d]);
export const toEn = (v) => String(v ?? "").replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
export const normQ = (s) => toEn(s).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌+/g, "‌").trim();
export const iso = (t) => (t == null ? null : new Date(t).toISOString());
export const rid = (p) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
export const validPhone = (v) => /^09\d{9}$/.test(toEn(v).replace(/\D/g, ""));
export const SLUG = /^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*$/;
export const bool = (v) => v === true || v === "true" || v === "1";

export class ApiError extends Error {
	constructor(status, code, message, extra = {}) {
		super(message);
		Object.assign(this, { status, code, extra });
	}
}
export const fail = (status, code, message, extra) => {
	throw new ApiError(status, code, message, extra);
};
export const validation = (errors) => fail(400, "VALIDATION_ERROR", "چند تا از فیلدها رو باید درست کنی", { errors });
export const notFound = (code, message) => fail(404, code, message);

/** Collects field errors, then throws them all at once (`400 VALIDATION_ERROR`). */
export function checker() {
	const errors = [];
	const api = {
		need: (cond, field, message, code = "INVALID") => {
			if (!cond) errors.push({ field, code, message });
			return api;
		},
		done: () => {
			if (errors.length) validation(errors);
		},
	};
	return api;
}

export const pageMeta = (page, size, total) => ({ page, size, totalItems: total, totalPages: Math.max(1, Math.ceil(total / size)), hasNext: page * size < total });
export function paginate(list, q, defSize = 20) {
	const size = Math.min(100, Math.max(1, Number(q.size) || defSize));
	const page = Math.max(1, Number(q.page) || 1);
	return { items: list.slice((page - 1) * size, page * size), meta: pageMeta(page, size, list.length) };
}
/** `status=A,B` (form, explode: false) or repeated `status=A&status=B`. */
export const listParam = (v) => (v == null || v === "" ? [] : String(v).split(",").filter(Boolean));

// ───────────── router ─────────────
export const routes = [];
export const route = (method, path, handler) => {
	const keys = [];
	const re = new RegExp("^" + path.replace(/:([a-zA-Z]+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "$");
	routes.push({ method, re, keys, handler });
};
