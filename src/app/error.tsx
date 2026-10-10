"use client";

import { useEffect } from "react";
import Button from "@/app/_components/ui/button/button";
import { Icon } from "@/app/_components/icon/icons";

/** Render-error fallback — the panel's gate block (`.bo-gate`), with the digest for the tech team. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		// surface the error for debugging; a real setup would report it to a service here
		console.error(error);
	}, [error]);

	return (
		<main className="bo-gate">
			<div className="in">
				<span className="gi">
					<Icon name="alert" />
				</span>
				<h2>این صفحه درست بارگذاری نشد</h2>
				<p>
					دوباره امتحان کن؛ اگر مشکل ادامه داشت به تیم فنی خبر بده.
					{error.digest && (
						<>
							<br />
							<small className="ltr">کد خطا: {error.digest}</small>
						</>
					)}
				</p>
				<div style={{ display: "flex", gap: 8 }}>
					<Button onClick={reset} iconStart={<Icon name="refresh" />}>
						تلاش مجدد
					</Button>
					<Button href="/" variant="white" iconStart={<Icon name="grid" />}>
						داشبورد
					</Button>
				</div>
			</div>
		</main>
	);
}
