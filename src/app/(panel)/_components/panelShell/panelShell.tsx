"use client";

import { ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import classNames from "classnames";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContactEndpoints } from "@/app/(panel)/contact-messages/_api/contactEndpoints";
import { OrdersEndpoints } from "@/app/(panel)/orders/_api/ordersEndpoints";
import { ReturnsEndpoints } from "@/app/(panel)/returns/_api/returnsEndpoints";
import { ReviewsEndpoints } from "@/app/(panel)/reviews/_api/reviewsEndpoints";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import { STORE_URL } from "@/config/global";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import { useAuthStore } from "@/store/auth.store";
import { canAccess, panelRolesOf } from "@/utils/roles";
import { withMappedError } from "@/utils/withMappedError";
import { PanelEndpoints } from "../../_api/panelEndpoints";
import NoAccess from "../noAccess/noAccess";
import { navItemOf } from "../sidebar/nav";
import Sidebar from "../sidebar/sidebar";

/**
 * Frame of every panel page: waits for the session, sends a guest to `/login?next=…`, stops a shopper without a
 * panel role at «دسترسی نداری», and draws the sidebar + top bar around the page.
 */
export default function PanelShell({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const queryClient = useQueryClient();
	const hydrated = useAuthStore((s) => s.hydrated);
	const signedIn = useAuthStore((s) => !!s.accessToken);
	const user = useAuthStore((s) => s.user);
	const [navOpen, setNavOpen] = useState(false);
	const [leaving, setLeaving] = useState(false);

	useRequireLogin(!leaving);

	// work-queue counters of the side menu (FEATURES §1.3) — one tiny page of each queue the role can see. A failed
	// counter just shows no badge (no toast: the page itself reports errors). Keys sit under each section's prefix, so
	// a section's own `invalidateQueries` refreshes its counter too.
	const roles = user?.roles ?? [];
	const ready = hydrated && signedIn && panelRolesOf(user).length > 0;
	const awaitingPhotos = useQuery({
		queryKey: ["orders", "queueCount", "awaitingPhotos"],
		queryFn: () => withMappedError(() => OrdersEndpoints.getOrders({ status: [], awaitingPhotos: true }, 1, 1)),
		enabled: ready && canAccess(roles, "orders"),
		select: (d) => d.meta.totalItems,
	});
	const returnRequests = useQuery({
		queryKey: ["returns", "queueCount"],
		queryFn: () => withMappedError(() => ReturnsEndpoints.getReturns("REQUESTED", 1, 1)),
		enabled: ready && canAccess(roles, "returns"),
		select: (d) => d.meta.totalItems,
	});
	const pendingReviews = useQuery({
		queryKey: ["reviews", "queueCount"],
		queryFn: () => withMappedError(() => ReviewsEndpoints.getReviews({ status: "PENDING" }, 1, 1)),
		enabled: ready && canAccess(roles, "support"),
		select: (d) => d.pendingCount,
	});
	const openTickets = useQuery({
		queryKey: ["contact", "queueCount"],
		queryFn: () => withMappedError(() => ContactEndpoints.getMessages("OPEN", "", 1, 1)),
		enabled: ready && canAccess(roles, "support"),
		select: (d) => d.meta.totalItems,
	});

	const logout = useMutation({
		mutationFn: () => withMappedError(() => PanelEndpoints.logout()),
		// the session ends on this device whatever the server answered; the access token (valid ≤ 15 min) leaves memory
		onSettled: () => {
			queryClient.clear();
			useAuthStore.getState().clear();
			router.replace("/login");
		},
	});

	const signOut = () => {
		setLeaving(true);
		logout.mutate();
	};

	if (!hydrated || !signedIn || !user) return <Loading className="bo-boot" text="در حال بارگذاری پنل…" />;
	if (!panelRolesOf(user).length) return <NoAccess user={user} onLogout={signOut} loggingOut={logout.isPending} />;

	const current = navItemOf(pathname);

	return (
		<div className={classNames("bo", { "nav-open": navOpen })}>
			<Sidebar
				user={user}
				counts={{ awaitingPhotos: awaitingPhotos.data, returnRequests: returnRequests.data, pendingReviews: pendingReviews.data, openTickets: openTickets.data }}
				onNavigate={() => setNavOpen(false)}
				onLogout={signOut}
				loggingOut={logout.isPending}
			/>
			<div className="bo-scrim" onClick={() => setNavOpen(false)} />
			<div className="bo-main">
				<header className="bo-top">
					<button type="button" className="icon-btn burger" aria-label="منو" onClick={() => setNavOpen(true)}>
						<Icon name="menu" />
					</button>
					<div className="crumbs">
						<span>پنل کیوا</span>
						<Icon name="left" />
						<span>{current?.label ?? "…"}</span>
					</div>
					<div className="end">
						<a className="store-link" href={STORE_URL} target="_blank" rel="noreferrer">
							<Icon name="external" />
							<span>مشاهده‌ی فروشگاه</span>
						</a>
					</div>
				</header>
				<main className="bo-page" key={pathname}>
					{children}
				</main>
			</div>
		</div>
	);
}
