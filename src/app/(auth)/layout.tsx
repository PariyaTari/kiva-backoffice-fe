import "./_styles/login.css";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "ورود به پنل",
};

/** The storefront's OTP login (design `login.html`), standing alone — the panel has no site shell. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="pg-login">
			{/* the login page reads `?next=` */}
			<Suspense>{children}</Suspense>
		</div>
	);
}
