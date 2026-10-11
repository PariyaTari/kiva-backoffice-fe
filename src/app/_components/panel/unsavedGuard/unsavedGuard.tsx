"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "../confirmModal/confirmModal";

/**
 * «تغییرات ذخیره‌نشده» for the long forms (product, blog post, static page, settings, FAQ, announcements): while
 * `dirty`, closing or reloading the tab gets the browser's own prompt, and a click on a panel link (sidebar, back,
 * breadcrumbs, row links) is held for a «بدون ذخیره برو؟» modal. Programmatic navigation (after a save) and new-tab
 * links pass through. The browser's back/forward buttons can't be held in the App Router — they still leave.
 */
export default function UnsavedGuard({ dirty }: { dirty: boolean }) {
	const router = useRouter();
	const [pendingHref, setPendingHref] = useState<string | null>(null);

	useEffect(() => {
		if (!dirty) return;
		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = "";
		};
		// capture on `document` runs before React's root listener — stopping it here keeps `<Link>` from navigating
		const onClick = (e: MouseEvent) => {
			if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			const a = (e.target as Element | null)?.closest?.("a[href]");
			if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
			const url = new URL(a.href, window.location.href);
			if (url.origin !== window.location.origin) return;
			if (url.pathname === window.location.pathname && url.search === window.location.search) return;
			e.preventDefault();
			e.stopPropagation();
			setPendingHref(url.pathname + url.search + url.hash);
		};
		window.addEventListener("beforeunload", onBeforeUnload);
		document.addEventListener("click", onClick, true);
		return () => {
			window.removeEventListener("beforeunload", onBeforeUnload);
			document.removeEventListener("click", onClick, true);
		};
	}, [dirty]);

	const leave = () => {
		if (pendingHref) router.push(pendingHref);
		setPendingHref(null);
	};

	return (
		<ConfirmModal
			open={!!pendingHref}
			onClose={() => setPendingHref(null)}
			icon="info"
			tone="danger"
			title="تغییرات ذخیره نشده"
			text="اگر از این صفحه بروی، تغییراتی که ذخیره نکرده‌ای از بین می‌رود."
			confirmLabel="بدون ذخیره برو"
			onConfirm={leave}
		/>
	);
}
