import { toPersianDigits } from "@/utils/digits";

/** Display time zone of the store — «روز کاری» and «جمعه» are Tehran-based (see the API conventions). */
const TIME_ZONE = "Asia/Tehran";

/** `1890000` → `۱٬۸۹۰٬۰۰۰` (Toman, no unit — the design always prints «تومان» separately). */
export function formatPrice(value: number): string {
	return toPersianDigits(Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬"));
}

/** Jalali date via `Intl` (`fa-IR-u-ca-persian`); defaults to `۱۴۰۵/۰۷/۱۳`. */
export function formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
		timeZone: TIME_ZONE,
		...(options ?? { year: "numeric", month: "2-digit", day: "2-digit" }),
	}).format(date);
}

/** Two-digit Persian number for countdowns (`۰۷`). */
export const pad2 = (n: number) => toPersianDigits(String(n).padStart(2, "0"));

/** `09121234567` → `۰۹۱۲ ۱۲۳ ۴۵۶۷`; no phone (an anonymised order, a deleted account) → «—». */
export function formatPhone(phone: string | null | undefined): string {
	if (!phone) return "—";
	return toPersianDigits(phone.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3"));
}

/** What the panel calls a shopper whose account was deleted (1.21.0: name and phone are `null`). */
export const DELETED_ACCOUNT = "حساب حذف‌شده";

/** `۱۴۰۵/۰۷/۱۸ — ۱۴:۳۰` (Tehran time). */
export function formatDateTime(value: string | number | Date | null | undefined): string {
	if (value == null) return "—";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	const time = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
	return `${formatDate(date)} — ${time}`;
}

/** `۱٬۸۹۰٬۰۰۰ تومان`. */
/** «تا ۵ دقیقه‌ی دیگر در سایت» — the save toast's note for content the storefront caches (`STORE_REFRESH_MINUTES`). */
export const onSiteWithin = (minutes: number) => `تا ${toPersianDigits(minutes)} دقیقه‌ی دیگر در سایت`;

export const formatToman = (value: number | null | undefined) => (value == null ? "—" : `${formatPrice(value)} تومان`);

/** «۳ ساعت پیش» / «۲ روز دیگر» — for deadlines and queue ages. */
export function relativeTime(value: string | number | Date | null | undefined): string {
	if (value == null) return "—";
	const ms = new Date(value).getTime() - Date.now();
	const abs = Math.abs(ms);
	const [unit, size]: [Intl.RelativeTimeFormatUnit, number] = abs < 3_600_000 ? ["minute", 60_000] : abs < 86_400_000 ? ["hour", 3_600_000] : ["day", 86_400_000];
	return new Intl.RelativeTimeFormat("fa", { numeric: "auto" }).format(Math.round(ms / size), unit);
}
