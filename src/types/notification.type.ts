export type NotificationType = "success" | "error" | "info" | "warning";

/** Optional action at the end of a toast — a link («مشاهده سبد») or a callback («برگردون»). */
export type NotificationAction = {
	label: string;
	href?: string;
	onClick?: () => void;
};

export interface Notification {
	id: string;
	message: string;
	type: NotificationType;
	/** Icon name of the design icon set; defaults per type. */
	icon?: string;
	action?: NotificationAction;
	duration?: number;
	/** Set while the exit animation (`.toast.out`) plays. */
	leaving?: boolean;
}
