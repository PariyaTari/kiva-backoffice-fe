import { create } from "zustand";
import { User } from "@/types/user.type";

type AuthState = {
	/** Memory only (FRONTEND_AUTH §2) — a page load gets a fresh one from the `kiva_rt` session cookie. */
	accessToken: string | null;
	user: User | null;
	/** `false` until the session was restored on the client — gate auth-dependent UI/queries on it. */
	hydrated: boolean;
	/** Signed in (OTP verify) — also tells the other tabs. */
	setSession: (accessToken: string, user: User) => void;
	/** A rotated access token of the same session. */
	setAccessToken: (accessToken: string) => void;
	setUser: (user: User) => void;
	/** Signed out or the session ended — also tells the other tabs. */
	clear: () => void;
	/** Drops this tab's copy only — another tab already ended the session. */
	forget: () => void;
	markHydrated: () => void;
};

/**
 * Non-secret marker that this browser holds a panel session: a page load without it skips the refresh, and a
 * change of it (`storage` event) tells the other tabs to sign in or out. A new value on every sign-in. The
 * tokens themselves never touch storage. Its own key — the storefront (another origin) keeps `kiva-session`.
 */
export const SESSION_HINT_KEY = "kiva-bo-session";

const storage = {
	read: (key: string) => {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	write: (key: string, value: string | null) => {
		try {
			if (value === null) localStorage.removeItem(key);
			else localStorage.setItem(key, value);
		} catch {
			// private mode / storage blocked — the session still works in this tab
		}
	},
};

export const hasSessionHint = () => !!storage.read(SESSION_HINT_KEY);

/** OTP + JWT session (kiva-openapi.yml 1.4.0 · Auth). Lives in memory; the refresh token is an HttpOnly cookie. */
export const useAuthStore = create<AuthState>()((set) => ({
	accessToken: null,
	user: null,
	hydrated: false,
	setSession: (accessToken, user) => {
		storage.write(SESSION_HINT_KEY, `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`);
		set({ accessToken, user });
	},
	setAccessToken: (accessToken) => set({ accessToken }),
	setUser: (user) => set({ user }),
	clear: () => {
		storage.write(SESSION_HINT_KEY, null);
		set({ accessToken: null, user: null });
	},
	forget: () => set({ accessToken: null, user: null }),
	markHydrated: () => set({ hydrated: true }),
}));

/** «سارا احمدی» / «۰۹۱۲…» — how the panel names the signed-in person. */
export function displayNameOf(user: User | null): string {
	if (!user) return "";
	return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.displayName || user.phone;
}
