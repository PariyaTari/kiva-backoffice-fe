/** Mirrors the backend auth / user contract (kiva-openapi.yml · Auth, Account). */
import { PhotoMessengerChannel } from "./common.type";

export type Gender = "FEMALE" | "MALE" | "UNSPECIFIED";

/** `CUSTOMER` for everyone; the rest are panel roles. */
export type UserRole = "CUSTOMER" | "ADMIN" | "CATALOG_MANAGER" | "OPERATOR" | "CONTENT_EDITOR" | "SUPPORT";

/** The roles that open the panel. */
export type PanelRole = Exclude<UserRole, "CUSTOMER">;

export interface User {
	id: number;
	phone: string;
	firstName?: string | null;
	lastName?: string | null;
	fullName?: string | null;
	displayName?: string;
	avatarInitial?: string;
	email?: string | null;
	birthDate?: string | null;
	gender?: Gender;
	defaultMessenger?: PhotoMessengerChannel | null;
	defaultMessengerPhone?: string | null;
	marketingSmsOptIn?: boolean;
	roles?: UserRole[];
	createdAt?: string;
}

/** The refresh token is not here — it is the HttpOnly `kiva_rt` cookie (contract 1.4.0). */
export interface AuthTokens {
	accessToken: string;
	tokenType: "Bearer";
	/** Lifetime of the access token, seconds (15 minutes). */
	expiresIn: number;
	/** Lifetime of the session cookie, seconds — 12 hours for panel users (sliding, 7 days at most). */
	refreshExpiresIn: number;
}

export interface AuthResponse extends AuthTokens {
	isNewUser: boolean;
	user: User;
	/** The storefront's merged guest cart — the panel ignores it. */
	cart: unknown;
}
