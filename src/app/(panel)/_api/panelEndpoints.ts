import { httpClient } from "@/httpClient/HttpClient";
import { User } from "@/types/user.type";
import { MediaAsset, MediaPurpose } from "@/types/common.type";

/** Requests the whole panel shares — pure functions, no React Query concepts (data-fetching standard). */
export const PanelEndpoints = {
	/** The signed-in person with their `roles` — the menu and buttons are drawn from them (display only). */
	getMe: async () => {
		const res = await httpClient.call<User>({ method: "GET", url: "me" });
		return res.data;
	},

	/** Ends this device's session and clears the cookie — always `204`, even when already signed out. */
	logout: async () => {
		await httpClient.call<void>({ method: "POST", url: "auth/logout", withCredentials: true });
	},

	/**
	 * Step one of every image/video field: the file goes up alone (multipart, with progress) and the server answers a
	 * `MediaAsset` (webp/avif, poster and blurhash made there); its `id` then goes into the entity's form.
	 */
	uploadMedia: async (file: File, purpose: MediaPurpose, alt: string | null, onProgress: (percent: number) => void, signal?: AbortSignal) => {
		const data = new FormData();
		data.append("file", file);
		data.append("purpose", purpose);
		if (alt) data.append("alt", alt);
		const res = await httpClient.call<MediaAsset>({
			method: "POST",
			url: "admin/media",
			data,
			signal,
			// a phone video on a slow connection — the tile shows progress and can be cancelled
			timeout: 10 * 60_000,
			onUploadProgress: onProgress,
		});
		return res.data;
	},
};
