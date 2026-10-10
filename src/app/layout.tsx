import "./globals.css";
import type { Metadata, Viewport } from "next";
import { QueryProvider } from "./queryProvider";
import { SessionProvider } from "./sessionProvider";
import Notifications from "@/app/_components/common/notification/notifications";

export const metadata: Metadata = {
	title: {
		default: "پنل مدیریت کیوا",
		template: "%s | پنل کیوا",
	},
	description: "پنل مدیریت فروشگاه کیوا",
	// an internal tool — never in search results
	robots: { index: false, follow: false },
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="fa" dir="rtl">
			<body>
				<QueryProvider>
					<SessionProvider />
					{children}
					<Notifications />
				</QueryProvider>
			</body>
		</html>
	);
}
