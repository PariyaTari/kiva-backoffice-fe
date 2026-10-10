import { PanelRole, User, UserRole } from "@/types/user.type";

/** What a part of the panel is about — each maps to the roles the contract allows (`x-roles`, FEATURES §1.1). */
export type PanelSection =
	| "reports"
	| "orders"
	| "returns"
	| "refunds"
	| "catalog"
	| "media"
	| "discounts"
	| "marketing"
	| "content"
	| "settings"
	| "support"
	| "assignRoles";

/** `ADMIN` is allowed everywhere and is not listed. */
const ACCESS: Record<PanelSection, PanelRole[]> = {
	reports: [],
	orders: ["OPERATOR"],
	returns: ["OPERATOR"],
	refunds: [],
	catalog: ["CATALOG_MANAGER"],
	media: ["CATALOG_MANAGER", "CONTENT_EDITOR", "OPERATOR"],
	discounts: [],
	marketing: ["CONTENT_EDITOR"],
	content: ["CONTENT_EDITOR"],
	settings: [],
	support: ["SUPPORT"],
	assignRoles: [],
};

export const PANEL_ROLES: PanelRole[] = ["ADMIN", "CATALOG_MANAGER", "OPERATOR", "CONTENT_EDITOR", "SUPPORT"];

export const ROLE_LABEL: Record<UserRole, string> = {
	CUSTOMER: "مشتری",
	ADMIN: "مدیر کل",
	CATALOG_MANAGER: "مدیر کاتالوگ",
	OPERATOR: "اپراتور سفارش",
	CONTENT_EDITOR: "ویراستار محتوا",
	SUPPORT: "پشتیبانی",
};

/** The panel roles of a person — empty for a shopper. */
export const panelRolesOf = (user: User | null | undefined): PanelRole[] =>
	(user?.roles ?? []).filter((r): r is PanelRole => r !== "CUSTOMER");

/**
 * Whether the menu shows a section / a button — **display only**: the server reads the roles on every request
 * and answers `403 FORBIDDEN` regardless of what the panel drew.
 */
export const canAccess = (roles: readonly UserRole[], section: PanelSection) =>
	roles.includes("ADMIN") || ACCESS[section].some((r) => roles.includes(r));
