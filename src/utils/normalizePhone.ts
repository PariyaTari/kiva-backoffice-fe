/** Normalize a user-typed mobile into the backend's `09XXXXXXXXX` shape. */
export function normalizePhone(value: string): string {
	let digits = value
		.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
		.replace(/\D/g, "");

	if (digits.startsWith("0098")) digits = digits.slice(4);
	else if (digits.startsWith("98")) digits = digits.slice(2);

	if (!digits.startsWith("0")) digits = "0" + digits;

	return digits;
}
