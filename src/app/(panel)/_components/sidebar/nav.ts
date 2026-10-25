import { IconName } from "@/app/_components/icon/icon.types";
import { PanelSection } from "@/utils/roles";

export type NavItem = {
	href: string;
	icon: IconName;
	label: string;
	/** Who sees it; no section = every panel role. */
	section?: PanelSection;
	/** Key of a work-queue counter drawn next to the label. */
	count?: QueueKey;
};

export type NavGroup = { title: string | null; items: NavItem[] };

/** The work queues the side menu counts (FEATURES §1.3). */
export type QueueKey = "awaitingPhotos" | "returnRequests" | "pendingReviews" | "openTickets";

/** The panel's sections (FEATURES §1.1), grouped like the work flows them. */
export const NAV: NavGroup[] = [
	{ title: null, items: [{ href: "/", icon: "grid", label: "داشبورد" }] },
	{
		title: "فروش",
		items: [
			{ href: "/orders", icon: "box", label: "سفارش‌ها", section: "orders", count: "awaitingPhotos" },
			{ href: "/returns", icon: "swap", label: "مرجوعی‌ها", section: "returns", count: "returnRequests" },
		],
	},
	{
		title: "کاتالوگ",
		items: [
			{ href: "/products", icon: "bag", label: "محصولات", section: "catalog" },
			{ href: "/inventory", icon: "pkg", label: "موجودی انبار", section: "catalog" },
			{ href: "/stock-alerts", icon: "bell", label: "موجود شد خبرم کن", section: "catalog" },
			{ href: "/categories", icon: "layers", label: "دسته‌بندی‌ها", section: "catalog" },
			{ href: "/colors", icon: "palette", label: "رنگ‌ها", section: "catalog" },
			{ href: "/materials", icon: "leaf", label: "متریال‌ها", section: "catalog" },
		],
	},
	{
		title: "بازاریابی",
		items: [
			{ href: "/discount-codes", icon: "tag", label: "کدهای تخفیف", section: "discounts" },
			{ href: "/campaigns", icon: "fire", label: "کمپین‌ها", section: "marketing" },
			{ href: "/banners", icon: "image", label: "بنرها", section: "marketing" },
			{ href: "/announcements", icon: "bell", label: "نوار اطلاعیه", section: "marketing" },
			{ href: "/testimonials", icon: "smile", label: "پیام‌های رضایت", section: "marketing" },
			{ href: "/newsletter", icon: "mail", label: "مشترکین خبرنامه", section: "newsletter" },
		],
	},
	{
		title: "محتوا",
		items: [
			{ href: "/blog", icon: "feather", label: "بلاگ", section: "content" },
			{ href: "/faq", icon: "quote", label: "سوالات متداول", section: "content" },
			{ href: "/pages", icon: "file", label: "صفحات ثابت", section: "content" },
		],
	},
	{
		title: "پشتیبانی",
		items: [
			{ href: "/reviews", icon: "star", label: "نظرات", section: "support", count: "pendingReviews" },
			{ href: "/contact-messages", icon: "chat", label: "پیام‌های تماس", section: "support", count: "openTickets" },
			{ href: "/customers", icon: "users", label: "مشتریان", section: "support" },
		],
	},
	{
		title: "سیستم",
		items: [
			{ href: "/settings", icon: "gear", label: "تنظیمات", section: "settings" },
			{ href: "/audit-log", icon: "receipt", label: "لاگ تغییرات", section: "auditLog" },
		],
	},
];

/** The menu entry a path belongs to — for the active state and the top bar's crumb. */
export function navItemOf(pathname: string): NavItem | null {
	const items = NAV.flatMap((g) => g.items);
	if (pathname === "/") return items[0];
	return items.filter((i) => i.href !== "/" && (pathname === i.href || pathname.startsWith(`${i.href}/`))).sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}
