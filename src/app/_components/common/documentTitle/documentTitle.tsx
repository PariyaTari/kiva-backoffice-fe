"use client";

import { useEffect } from "react";

/**
 * Sets the tab title from the client — for screens Next's `metadata` can't reach, e.g. the 404 shown when a
 * client page calls `notFound()` after its data request answered 404 (the page's own title would stay).
 */
export default function DocumentTitle({ title }: { title: string }) {
	useEffect(() => {
		document.title = title;
	}, [title]);

	return null;
}
