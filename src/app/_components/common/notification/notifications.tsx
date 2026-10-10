"use client";

import Link from "next/link";
import classNames from "classnames";
import { useNotificationStore } from "@/store/notification.store";
import { NotificationType } from "@/types/notification.type";
import { Icon } from "@/app/_components/icon/icons";

const DEFAULT_ICON: Record<NotificationType, string> = {
	success: "check",
	error: "info",
	warning: "info",
	info: "info",
};

/** Design `.toasts` — dark pills stacked at the bottom centre, with an optional action. */
export default function Notifications() {
	const notifications = useNotificationStore((state) => state.notifications);
	const dismiss = useNotificationStore((state) => state.dismissNotification);

	if (!notifications.length) return null;

	return (
		<div className="toasts">
			{notifications.map((n) => (
				<div key={n.id} className={classNames("toast", { out: n.leaving })} role={n.type === "error" ? "alert" : "status"}>
					<span className="ti">
						<Icon name={n.icon ?? DEFAULT_ICON[n.type]} />
					</span>
					<span>{n.message}</span>
					{n.action &&
						(n.action.href ? (
							<Link href={n.action.href} onClick={() => dismiss(n.id)}>
								{n.action.label}
							</Link>
						) : (
							<button
								type="button"
								className="ta"
								onClick={() => {
									n.action?.onClick?.();
									dismiss(n.id);
								}}
							>
								{n.action.label}
							</button>
						))}
				</div>
			))}
		</div>
	);
}
