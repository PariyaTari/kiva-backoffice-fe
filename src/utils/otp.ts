import { ResultError } from "@/types/result";
import { toPersianDigits } from "./digits";

/*
 * SMS-code answers shared by login (`/auth/otp/*`) and phone change (`/me/phone-change/*`) — FRONTEND_AUTH §8.
 * They are answers for the form (shake, a line of text, a timer), not failure toasts.
 */

type MaybeError = ResultError | null | undefined;

const numberOf = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** Seconds until another try is allowed (`429`; `mapError` fills it from `Retry-After` when the body lacks it). */
export const retryAfterOf = (e: MaybeError) => numberOf(e?.meta?.retryAfterSeconds);

/** Tries left on this code (`OTP_INVALID`). */
export const attemptsLeftOf = (e: MaybeError) => numberOf(e?.meta?.attemptsLeft);

/** Which of the two phone-change codes a `422` is about: `currentPhoneCode` / `newPhoneCode`. */
export const otpFieldOf = (e: MaybeError) => (typeof e?.meta?.field === "string" ? e.meta.field : null);

/** The code is spent (expired, used, or tried 5 times) — only a new one helps. */
export const isDeadOtpError = (e: MaybeError) => e?.code === "OTP_EXPIRED" || e?.code === "OTP_TOO_MANY_ATTEMPTS";

/** A code went to this number less than 120 s ago — the previous one still works; the timer continues. */
export const isResendTooSoonError = (e: MaybeError) => e?.code === "OTP_RESEND_TOO_SOON";

/** «۴۵ ثانیه» / «۳ دقیقه» / «۲ ساعت». */
export function formatWait(seconds: number): string {
	if (seconds < 60) return `${toPersianDigits(Math.max(1, Math.ceil(seconds)))} ثانیه`;
	if (seconds < 3600) return `${toPersianDigits(Math.ceil(seconds / 60))} دقیقه`;
	return `${toPersianDigits(Math.ceil(seconds / 3600))} ساعت`;
}

const sentence = (first: string, second: string) => (/[.!؟?]$/.test(first.trim()) ? `${first.trim()} ${second}` : `${first.trim()}؛ ${second}`);

/** The server's sentence plus what to do next: the tries left on this code, or how long to wait. */
export function otpErrorText(e: ResultError): string {
	const attempts = attemptsLeftOf(e);
	if (e.code === "OTP_INVALID" && attempts) return sentence(e.description, `${toPersianDigits(attempts)} بار دیگه می‌تونی امتحانش کنی.`);
	const wait = retryAfterOf(e);
	if ((e.code === "RATE_LIMITED" || e.code === "OTP_RESEND_TOO_SOON") && wait) return sentence(e.description, `${formatWait(wait)} دیگه دوباره امتحان کن.`);
	return e.description;
}
