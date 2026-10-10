import axios, { AxiosError } from "axios";
import { API_URL } from "@/config/global";
import { useAuthStore } from "@/store/auth.store";
import { AuthTokens } from "@/types/user.type";

const REFRESH_URL = "auth/refresh";
const REFRESH_TIMEOUT_MS = 20_000;
/**
 * Web Locks name — one panel tab at a time spends the (single-use, rotating) session cookie. Locks are per origin:
 * the storefront refreshes under its own, and the server's 30-second grace covers the two at once.
 */
const REFRESH_LOCK = "kiva-bo-refresh";

/** The session cookie was refused — missing, expired, revoked or reused (`401`), or this origin isn't allowed (`403`). */
export class SessionEndedError extends Error {}

/** Runs `task` while holding the cross-tab lock; without Web Locks (old browsers) it simply runs. */
async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
	return typeof navigator !== "undefined" && navigator.locks ? await navigator.locks.request(REFRESH_LOCK, task) : task();
}

// One refresh in flight per tab — parallel 401s wait for the same one.
let refreshing: Promise<string> | null = null;

/**
 * A fresh access token from the `kiva_rt` session cookie (`POST /auth/refresh`, FRONTEND_AUTH §3). The cookie
 * rotates on every use and a rotated one is valid for 30 more seconds only — after that, using it reads as
 * theft and ends the session everywhere. So tabs take turns under a lock; a tab that waited sends the cookie
 * the previous one just received (the cookie jar is shared).
 *
 * A refused cookie signs this browser out (every tab, through the session hint) and throws `SessionEndedError`;
 * a network failure keeps the session and rethrows.
 */
export function refreshSession(): Promise<string> {
	refreshing ??= withRefreshLock(async () => {
		try {
			const res = await axios.post<AuthTokens>(REFRESH_URL, undefined, { baseURL: API_URL, timeout: REFRESH_TIMEOUT_MS, withCredentials: true });
			useAuthStore.getState().setAccessToken(res.data.accessToken);
			return res.data.accessToken;
		} catch (err) {
			const status = (err as AxiosError).response?.status;
			if (status === 401 || status === 403) {
				useAuthStore.getState().clear();
				throw new SessionEndedError();
			}
			throw err;
		}
	}).finally(() => {
		refreshing = null;
	});
	return refreshing;
}
