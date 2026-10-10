import { mobileRegex } from "@/regex/mobileRegex";

export type ValidatorFn = (value: unknown, values?: unknown) => string | undefined;

const isEmpty = (value: unknown) =>
	value === null || value === undefined || (typeof value === "string" && value.trim() === "");

export const required =
	(message = "پر کردن این فیلد الزامی است"): ValidatorFn =>
	(value) =>
		isEmpty(value) ? message : undefined;

export const mobile =
	(message = "شماره موبایل معتبر نیست"): ValidatorFn =>
	(value) =>
		!isEmpty(value) && !mobileRegex.test(String(value).trim()) ? message : undefined;

export const minLength =
	(min: number, message?: string): ValidatorFn =>
	(value) =>
		!isEmpty(value) && String(value).trim().length < min
			? message ?? `حداقل ${min} کاراکتر وارد کنید`
			: undefined;

export const compose =
	(...validators: ValidatorFn[]): ValidatorFn =>
	(value, values) => {
		for (const validate of validators) {
			const message = validate(value, values);
			if (message) return message;
		}
		return undefined;
	};
