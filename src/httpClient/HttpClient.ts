import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { API_URL } from "@/config/global";
import { useAuthStore } from "@/store/auth.store";
import { refreshSession } from "./session";
import { Response } from "./utils/Response";

/**
 * A request that hangs longer than this is reported as `TIMEOUT`. Uploads (media) pass their own, longer value.
 * The panel renders on the client only — no server prefetch, so one value is enough.
 */
const DEFAULT_TIMEOUT_MS = 20_000;

const axiosClient = axios.create({
	baseURL: API_URL,
	timeout: DEFAULT_TIMEOUT_MS,
});

// ── request: Bearer from this tab's memory ──
axiosClient.interceptors.request.use((config) => {
	const { accessToken } = useAuthStore.getState();
	if (accessToken) config.headers.set("Authorization", `Bearer ${accessToken}`);
	return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// ── response: renew a refused access token once (FRONTEND_AUTH §3) ──
axiosClient.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const original = error.config as RetriableConfig | undefined;
		// the token this request was sent with — not the current one, which a parallel refresh may have replaced
		const sentToken = String(original?.headers.get("Authorization") ?? "").replace(/^Bearer /, "");

		// TOKEN_EXPIRED is the usual case; UNAUTHORIZED with a token (the server's key changed) is fixed by a refresh too.
		if (error.response?.status === 401 && original && sentToken && !original._retried) {
			original._retried = true;
			const current = useAuthStore.getState().accessToken;
			// signed out meanwhile
			if (!current) throw error;
			let token: string;
			try {
				// a refresh in this tab already replaced the token this request went with
				token = current !== sentToken ? current : await refreshSession();
			} catch {
				// the session ended (`refreshSession` signed this browser out — the panel shell sends to /login)
				// or the refresh didn't get through: the original 401 surfaces
				throw error;
			}
			original.headers.set("Authorization", `Bearer ${token}`);
			return axiosClient.request(original);
		}
		throw error;
	},
);

export type RequestHeaders = Record<string, string | number | boolean>;

export type Method = "GET" | "DELETE" | "HEAD" | "OPTIONS" | "POST" | "PUT" | "PATCH";

export type ResponseType = "arraybuffer" | "blob" | "document" | "json" | "text" | "stream";

export interface RequestConfig<D = unknown> {
	signal?: AbortSignal;
	url?: string;
	method?: Method;
	baseURL?: string;
	headers?: RequestHeaders;
	params?: unknown;
	data?: D;
	timeout?: number;
	timeoutErrorMessage?: string;
	responseType?: ResponseType;
	/** Upload progress of a multipart body, 0–100. */
	onUploadProgress?: (percent: number) => void;
	/**
	 * Send and accept cookies (`credentials: 'include'`) — only the requests that set or read the `kiva_rt` session
	 * cookie: OTP verify and logout. Without it the browser drops the response's `Set-Cookie`.
	 */
	withCredentials?: boolean;
}

/** The response with its headers — for the `ETag` of an edited product (`If-Match`). */
export type ResponseWithHeaders<T> = Response<T> & { headers: Record<string, string> };

const request = <T>(client: AxiosInstance, config: RequestConfig) =>
	new Promise<ResponseWithHeaders<T>>((resolve, reject) => {
		client
			.request({
				signal: config.signal,
				url: config.url,
				method: config.method,
				baseURL: config.baseURL,
				headers: config.headers,
				params: config.params,
				data: config.data,
				timeout: config.timeout,
				timeoutErrorMessage: config.timeoutErrorMessage,
				responseType: config.responseType,
				withCredentials: config.withCredentials,
				onUploadProgress: config.onUploadProgress
					? (e) => config.onUploadProgress?.(e.total ? Math.min(100, Math.round((e.loaded / e.total) * 100)) : 0)
					: undefined,
				// arrays go as `status=A,B` — the API's `style: form, explode: false`
				paramsSerializer: { indexes: null, serialize: serializeParams },
			})
			.then((value) =>
				resolve(Object.assign(new Response<T>(value.data, value.status), { headers: { ...(value.headers as Record<string, string>) } })),
			)
			.catch((reason) => readBlobProblem(reason).then(reject));
	});

/** The backend API (`NEXT_PUBLIC_API_URL`). */
export const httpClient = {
	call: <T>(config: RequestConfig) => request<T>(axiosClient, config),
};

/**
 * With `responseType: "blob"` (file downloads) a failure's problem+json body arrives as a Blob too —
 * parse it back so `mapError` sees the usual `{ code, message }`.
 */
async function readBlobProblem(reason: AxiosError) {
	const response = reason?.response;
	const data: unknown = response?.data;
	if (!response || typeof Blob === "undefined" || !(data instanceof Blob) || !/json/.test(data.type)) return reason;
	try {
		response.data = JSON.parse(await data.text());
	} catch {
		// not JSON after all — mapError falls back to the status
	}
	return reason;
}

/** `{ status: ["PROCESSING","RESERVED"], reserved: true, q: undefined }` → `status=PROCESSING,RESERVED&reserved=true`. */
function serializeParams(params: Record<string, unknown>): string {
	const search = new URLSearchParams();
	Object.entries(params ?? {}).forEach(([key, value]) => {
		if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return;
		search.set(key, Array.isArray(value) ? value.join(",") : String(value));
	});
	return search.toString();
}
