/**
 * Sign-in, session cookie and roles — the storefront mock's 1.4.0 session model, for panel users:
 * the access token in the body, the refresh token in the HttpOnly cookie (Path=/api/v1/auth), rotated on every
 * refresh; a rotated cookie is honoured for 30 s, after that it ends the whole chain. Panel sessions: 12 hours.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { API, fail, rid, route, toEn, validation, validPhone } from "./lib.mjs";
import { createUser, userByPhone, userView } from "./db.mjs";

/**
 * The cookie name. Cookies ignore the port, so the storefront mock (8080) and this one (8090) would overwrite each
 * other's `kiva_rt` on localhost — this mock uses its own name by default (`MOCK_COOKIE=kiva_rt` for the real one).
 */
const COOKIE = process.env.MOCK_COOKIE || "kiva_bo_rt";

const access = new Map(); // accessToken → { phone, exp }
const ACCESS_TTL = 900; // seconds — `expiresIn`
const sessions = new Map(); // refreshToken → { phone, family, rotatedAt }
const REFRESH_TTL = 12 * 3600; // panel users: 12 hours after the last use
const ROTATION_GRACE_MS = 30e3;
const otps = new Map(); // `LOGIN:${phone}` → { sentAt, wrong }
const OTP_TTL_MS = 300e3, OTP_COOLDOWN_S = 120, OTP_MAX_TRIES = 5;
const RATE_LIMITED_PHONE = "09999999999";

/**
 * Sessions survive the mock's own restarts (`node --watch` reloads on every edit) — kept in a temp file, so the
 * panel stays signed in while the mock is being worked on. Data (orders, products…) still starts over.
 */
const SESSION_FILE = path.join(os.tmpdir(), "kiva-bo-mock-sessions.json");
try {
	const saved = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
	saved.access?.forEach(([k, v]) => access.set(k, v));
	saved.sessions?.forEach(([k, v]) => sessions.set(k, v));
} catch {
	// first start
}
let saveTimer = null;
const persist = () => {
	clearTimeout(saveTimer);
	saveTimer = setTimeout(() => fs.writeFile(SESSION_FILE, JSON.stringify({ access: [...access], sessions: [...sessions] }), () => {}), 50);
};

/** Who sent the request (`Authorization`) — `null` for none; throws 401 for an expired/unknown token. */
export function userOf(token) {
	if (!token) return null;
	const a = access.get(token);
	if (!a) fail(401, "UNAUTHORIZED", "اول وارد حساب کاربریت شو.");
	if (a.exp <= Date.now()) fail(401, "TOKEN_EXPIRED", "نشستت منقضی شده؛ دوباره تلاش کن.");
	return userByPhone(a.phone) || fail(401, "UNAUTHORIZED", "اول وارد حساب کاربریت شو.");
}

/** The `x-roles` check of every `/admin/*` endpoint — ADMIN is allowed everywhere. */
export function staff(ctx, ...roles) {
	const u = ctx.user || fail(401, "UNAUTHORIZED", "اول وارد حساب کاربریت شو.");
	if (!u.roles.includes("ADMIN") && !roles.some((r) => u.roles.includes(r))) fail(403, "FORBIDDEN", "به این بخش دسترسی نداری.");
	return u;
}

/** Ends every session of a person (role change, phone change) — their next request answers 401. */
export function endSessionsOf(phone) {
	for (const [rt, s] of sessions) if (s.phone === phone) sessions.delete(rt);
	for (const [at, a] of access) if (a.phone === phone) access.delete(at);
	persist();
}

function issueAccess(u) {
	const at = rid("at");
	access.set(at, { phone: u.phone, exp: Date.now() + ACCESS_TTL * 1000 });
	persist();
	return { accessToken: at, tokenType: "Bearer", expiresIn: ACCESS_TTL, refreshExpiresIn: REFRESH_TTL };
}
function startSession(ctx, u, family = rid("fam")) {
	const rt = rid("rt");
	sessions.set(rt, { phone: u.phone, family, rotatedAt: null });
	persist();
	ctx.headers["Set-Cookie"] = `${COOKIE}=${rt}; Max-Age=${REFRESH_TTL}; Path=${API}/auth; Secure; HttpOnly; SameSite=Strict`;
	return issueAccess(u);
}
const sessionCookie = (ctx) => new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`).exec(String(ctx.req.headers.cookie || ""))?.[1] || null;
const checkOrigin = (ctx) => {
	const origin = ctx.req.headers.origin;
	if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) fail(403, "FORBIDDEN", "دسترسی نداری.");
};
const tooMany = (ctx, code, message, seconds) => {
	ctx.headers["Retry-After"] = String(seconds);
	fail(429, code, message, { meta: { retryAfterSeconds: seconds } });
};

route("POST", "/auth/otp/send", (ctx) => {
	const phone = toEn(ctx.body?.phone).replace(/\D/g, "");
	if (!validPhone(phone)) validation([{ field: "phone", code: "PHONE_INVALID", message: "شماره موبایل باید ۱۱ رقم باشه و با ۰۹ شروع بشه" }]);
	if (phone === RATE_LIMITED_PHONE) tooMany(ctx, "RATE_LIMITED", "زیاد امتحان کردی.", 3 * 3600);
	const prev = otps.get(`LOGIN:${phone}`);
	const wait = prev ? Math.ceil((prev.sentAt + OTP_COOLDOWN_S * 1000 - Date.now()) / 1000) : 0;
	if (wait > 0) tooMany(ctx, "OTP_RESEND_TOO_SOON", "کد قبلی همین الان فرستاده شد؛ یه کم صبر کن.", wait);
	otps.set(`LOGIN:${phone}`, { sentAt: Date.now(), wrong: 0 });
	return { phone, codeLength: 5, expiresInSeconds: OTP_TTL_MS / 1000, resendAvailableInSeconds: OTP_COOLDOWN_S };
});

route("POST", "/auth/otp/verify", (ctx) => {
	const phone = toEn(ctx.body?.phone).replace(/\D/g, ""), code = toEn(ctx.body?.code);
	if (!validPhone(phone)) validation([{ field: "phone", code: "PHONE_INVALID", message: "شماره موبایل معتبر نیست" }]);
	if (!/^\d{5}$/.test(code)) validation([{ field: "code", code: "OTP_CODE_FORMAT_INVALID", message: "کد ۵ رقمی رو کامل وارد کن" }]);
	const key = `LOGIN:${phone}`, otp = otps.get(key);
	if (!otp || code === "11111" || Date.now() - otp.sentAt > OTP_TTL_MS) fail(422, "OTP_EXPIRED", "این کد منقضی شده یا قبلاً استفاده شده.");
	if (otp.wrong >= OTP_MAX_TRIES) fail(422, "OTP_TOO_MANY_ATTEMPTS", "این کد رو زیادی اشتباه زدی و دیگه کار نمی‌کنه.");
	if (code === "00000") {
		otp.wrong++;
		if (otp.wrong >= OTP_MAX_TRIES) fail(422, "OTP_TOO_MANY_ATTEMPTS", "این کد رو زیادی اشتباه زدی و دیگه کار نمی‌کنه.");
		fail(422, "OTP_INVALID", "کد اشتباهه.", { meta: { attemptsLeft: OTP_MAX_TRIES - otp.wrong } });
	}
	otps.delete(key);
	const existing = userByPhone(phone);
	const u = existing || createUser(phone);
	return { ...startSession(ctx, u), isNewUser: !existing, user: userView(u), cart: null };
});

route("POST", "/auth/refresh", (ctx) => {
	checkOrigin(ctx);
	const s = sessions.get(sessionCookie(ctx));
	const u = s && userByPhone(s.phone);
	if (!u) fail(401, "REFRESH_TOKEN_INVALID", "نشستت تموم شده؛ دوباره وارد شو.");
	if (s.rotatedAt) {
		if (Date.now() - s.rotatedAt > ROTATION_GRACE_MS) {
			for (const [rt, x] of sessions) if (x.family === s.family) sessions.delete(rt);
			fail(401, "REFRESH_TOKEN_INVALID", "نشستت تموم شده؛ دوباره وارد شو.");
		}
		return issueAccess(u);
	}
	s.rotatedAt = Date.now();
	persist();
	return startSession(ctx, u, s.family);
});

route("POST", "/auth/logout", (ctx) => {
	checkOrigin(ctx);
	const s = sessions.get(sessionCookie(ctx));
	if (s) for (const [rt, x] of sessions) if (x.family === s.family) sessions.delete(rt);
	persist();
	ctx.headers["Set-Cookie"] = `${COOKIE}=; Max-Age=0; Path=${API}/auth; Secure; HttpOnly; SameSite=Strict`;
	ctx.status = 204;
});

route("GET", "/me", (ctx) => userView(ctx.user || fail(401, "UNAUTHORIZED", "اول وارد حساب کاربریت شو.")));

// test aid (not in the spec): expire every access token now, to watch the panel renew them
route("POST", "/__mock/expire-access-tokens", (ctx) => {
	for (const a of access.values()) a.exp = 0;
	ctx.status = 204;
});
