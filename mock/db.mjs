/**
 * The admin mock's in-memory database — seeded from the storefront's sample data (`data.mjs`) on every start.
 * Each panel phase adds its tables here (see docs/PLAN.md).
 */
import * as D from "./data.mjs";
import { DAY } from "./lib.mjs";

const NOW = Date.now();
const pick = (arr, i) => arr[i % arr.length];

// ───────────── people ─────────────
/** Test staff — phone → roles (docs/PLAN.md «کاربرهای آزمایشی»). */
export const STAFF = [
	{ phone: "09120000001", firstName: "مهسا", lastName: "کریمی", roles: ["ADMIN"] },
	{ phone: "09120000002", firstName: "نیما", lastName: "رضایی", roles: ["CATALOG_MANAGER"] },
	{ phone: "09120000003", firstName: "سحر", lastName: "احمدی", roles: ["OPERATOR"] },
	{ phone: "09120000004", firstName: "پرهام", lastName: "نوری", roles: ["CONTENT_EDITOR"] },
	{ phone: "09120000005", firstName: "لیلا", lastName: "موسوی", roles: ["SUPPORT"] },
];

const LAST_NAMES = ["محمدی", "رضایی", "حسینی", "کاظمی", "جعفری", "صادقی", "نوروزی", "اکبری", "رحیمی", "قاسمی", "مرادی", "عباسی"];

let USER_SEQ = 1000;
export const nextUserId = () => ++USER_SEQ;

/** Every account — staff and shoppers. Shoppers are what `/admin/customers` lists. */
export const users = [
	...STAFF.map((s, i) => ({ ...s, roles: ["CUSTOMER", ...s.roles], email: null, createdAt: NOW - (400 - i) * DAY })),
	...Array.from({ length: 46 }, (_, i) => ({
		phone: `0912${String(3000000 + i * 7919).padStart(7, "0")}`,
		firstName: pick(D.DAILY.names, i),
		lastName: pick(LAST_NAMES, i * 5),
		email: i % 3 ? null : `user${i + 1}@example.com`,
		roles: ["CUSTOMER"],
		createdAt: NOW - (i * 9 + 2) * DAY,
		defaultMessenger: pick(["TELEGRAM", "BALE", "RUBIKA"], i),
		marketingSmsOptIn: i % 4 !== 0,
	})),
	// a shopper who deleted the account (1.21.0): anonymised — no phone or name; `GET /admin/customers/{id}` → 404 CUSTOMER_DELETED
	{ phone: null, firstName: null, lastName: null, email: null, roles: ["CUSTOMER"], createdAt: NOW - 210 * DAY, deletedAt: NOW - 3 * DAY, marketingSmsOptIn: false },
].map((u) => ({ id: nextUserId(), defaultMessenger: null, marketingSmsOptIn: true, ...u }));

export const userByPhone = (phone) => users.find((u) => u.phone === phone);
export const userById = (id) => users.find((u) => u.id === Number(id));

export function createUser(phone) {
	const u = { id: nextUserId(), phone, firstName: null, lastName: null, email: null, roles: ["CUSTOMER"], createdAt: Date.now(), defaultMessenger: null, marketingSmsOptIn: true };
	users.push(u);
	return u;
}

export const fullNameOf = (u) => [u.firstName, u.lastName].filter(Boolean).join(" ") || null;
/** `0912***6789`. */
export const maskPhone = (phone) => (phone ? `${phone.slice(0, 4)}***${phone.slice(-4)}` : null);
/** How the contract names a panel user who did something (`repliedBy`, `createdBy`, …): full name, else the masked mobile. */
export const actorNameOf = (u) => (u ? fullNameOf(u) || maskPhone(u.phone) : "سیستم");

export const userView = (u) => {
	const full = fullNameOf(u);
	return {
		id: u.id, phone: u.phone, firstName: u.firstName, lastName: u.lastName, fullName: full,
		displayName: u.firstName || "دوست عزیز", avatarInitial: (u.firstName || "ک")[0], email: u.email, birthDate: null,
		gender: "UNSPECIFIED", defaultMessenger: u.defaultMessenger, defaultMessengerPhone: null,
		marketingSmsOptIn: u.marketingSmsOptIn, roles: u.roles, createdAt: new Date(u.createdAt).toISOString(),
	};
};
