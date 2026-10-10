import { create } from "zustand";
import { Notification } from "@/types/notification.type";
import { generateID } from "@/utils/generateId";

/** Exit animation length of `.toast.out` in the design. */
const LEAVE_MS = 400;

type NotificationState = {
	notifications: Notification[];
	showNotification: (notification: Omit<Notification, "id" | "leaving">) => void;
	dismissNotification: (id: string) => void;
};

export const useNotificationStore = create<NotificationState>()((set, get) => ({
	notifications: [],
	showNotification: (notification) => {
		// Cancelled/aborted requests surface as "canceled" — never toast those.
		if (notification?.message === "canceled") return;

		const id = generateID();
		set((state) => ({ notifications: [...state.notifications, { id, ...notification }] }));

		setTimeout(() => get().dismissNotification(id), notification.duration ?? 3200);
	},
	dismissNotification: (id) => {
		if (!get().notifications.some((n) => n.id === id && !n.leaving)) return;
		set((state) => ({ notifications: state.notifications.map((n) => (n.id === id ? { ...n, leaving: true } : n)) }));
		setTimeout(() => set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })), LEAVE_MS);
	},
}));

/** Shorthand for the design's `K.toast(msg, { icon, action })` — success-style info toast. */
export const toast = (message: string, options: Omit<Notification, "id" | "leaving" | "message" | "type"> & { type?: Notification["type"] } = {}) =>
	useNotificationStore.getState().showNotification({ type: options.type ?? "success", message, ...options });
