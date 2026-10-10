import { httpClient } from "@/httpClient/HttpClient";
import { AuthResponse } from "@/types/user.type";
import { SendOtpResponse, VerifyOtpPayload } from "../_types/auth.type";

/**
 * Pure request functions — no React Query concepts live here (data-fetching standard). Panel users sign in exactly
 * like shoppers (FRONTEND_AUTH §7): an SMS code, the session as the HttpOnly `kiva_rt` cookie — the verify goes
 * `withCredentials`, otherwise the browser drops the response's `Set-Cookie`.
 */
export const AuthEndpoints = {
	/** The answer is the same whether the number has an account or not. */
	sendOtp: async (phone: string) => {
		const res = await httpClient.call<SendOtpResponse>({ method: "POST", url: "auth/otp/send", data: { phone, purpose: "LOGIN" } });
		return res.data;
	},

	/** Sets the session cookie; the access token and the user (with `roles`) come in the body. */
	verifyOtp: async (payload: VerifyOtpPayload) => {
		const res = await httpClient.call<AuthResponse>({ method: "POST", url: "auth/otp/verify", data: payload, withCredentials: true });
		return res.data;
	},
};
