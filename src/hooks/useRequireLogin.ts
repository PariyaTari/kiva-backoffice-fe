"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

/**
 * Sends a guest to login and back to the same page once the session is read. `active = false` pauses it,
 * e.g. while logging out (the next stop is the home page, not login).
 */
export function useRequireLogin(active = true) {
	const router = useRouter();
	const pathname = usePathname();
	const hydrated = useAuthStore((s) => s.hydrated);
	const signedIn = useAuthStore((s) => !!s.accessToken);

	useEffect(() => {
		// the query too (`/orders?tab=…`), read here so the panel's layout needs no `useSearchParams` Suspense boundary
		if (active && hydrated && !signedIn) router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
	}, [active, hydrated, signedIn, pathname, router]);
}
