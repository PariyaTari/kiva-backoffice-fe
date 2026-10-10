"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import classNames from "classnames";
import { Icon } from "@/app/_components/icon/icons";
import Logo from "@/app/_components/common/logo/logo";
import { displayNameOf } from "@/store/auth.store";
import { User } from "@/types/user.type";
import { toPersianDigits } from "@/utils/digits";
import { canAccess, panelRolesOf, ROLE_LABEL } from "@/utils/roles";
import { NAV, navItemOf, QueueKey } from "./nav";

type SidebarProps = {
	user: User;
	/** Work-queue counters; missing = not loaded (or not allowed) — no badge. */
	counts: Partial<Record<QueueKey, number>>;
	onNavigate: () => void;
	onLogout: () => void;
	loggingOut: boolean;
};

/** `.bo-side` — brand, the role-filtered menu with queue counters, and the signed-in person with «خروج». */
export default function Sidebar({ user, counts, onNavigate, onLogout, loggingOut }: SidebarProps) {
	const pathname = usePathname();
	const roles = user.roles ?? [];
	const active = navItemOf(pathname);
	const panelRoles = panelRolesOf(user);
	const name = displayNameOf(user);

	return (
		<aside className="bo-side" id="side">
			<div className="bo-brand">
				<Logo />
				<small>پنل مدیریت</small>
			</div>
			<nav className="bo-nav" aria-label="منوی پنل">
				{NAV.map((group) => {
					const items = group.items.filter((i) => !i.section || canAccess(roles, i.section));
					if (!items.length) return null;
					return (
						<div key={group.title ?? "main"}>
							{group.title && <h6>{group.title}</h6>}
							<div className="snav">
								{items.map((item) => {
									const count = item.count ? counts[item.count] : undefined;
									return (
										<Link key={item.href} href={item.href} className={classNames({ on: active?.href === item.href })} onClick={onNavigate}>
											<Icon name={item.icon} />
											{item.label}
											{!!count && <span className="c hot">{toPersianDigits(count)}</span>}
										</Link>
									);
								})}
							</div>
						</div>
					);
				})}
			</nav>
			<div className="ucard">
				<span className="av">{user.avatarInitial || name[0]}</span>
				<span style={{ minWidth: 0 }}>
					<b>{name}</b>
					<small>{panelRoles.map((r) => ROLE_LABEL[r]).join("، ")}</small>
				</span>
				<button type="button" className="icon-btn out-btn" onClick={onLogout} disabled={loggingOut} aria-label="خروج از پنل" title="خروج از پنل">
					<Icon name="logout" />
				</button>
			</div>
		</aside>
	);
}
