/** Mirrors the backend OTP auth contract (kiva-openapi.yml · Auth). */

export interface SendOtpResponse {
	/** Normalized number for «ارسال شده به …». */
	phone: string;
	codeLength: number;
	expiresInSeconds: number;
	/** Countdown of the circular resend timer. */
	resendAvailableInSeconds: number;
}

/** What the code step needs of a send — also built from an `OTP_RESEND_TOO_SOON` (the previous code still works). */
export type SentCode = Pick<SendOtpResponse, "codeLength" | "resendAvailableInSeconds">;

export interface VerifyOtpPayload {
	phone: string;
	code: string;
}
