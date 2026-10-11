/**
 * KIVA admin mock backend — the `/admin/*` part of kiva-openapi.yml (v1.4.0) plus sign-in, `/me` and the public
 * reads the panel uses, in memory, seeded from the storefront's sample data. Every restart starts over.
 *
 *   npm run mock        → http://localhost:8090/api/v1
 *
 * Env: MOCK_PORT (8090) · MOCK_DELAY (ms, 180) · MOCK_COOKIE (session cookie name, `kiva_bo_rt`)
 * Sign-in: staff numbers 09120000001 (ADMIN) … 09120000005 (SUPPORT) — docs/PLAN.md; any other number is a shopper.
 * OTP: any 5 digits; 00000 wrong, 11111 expired; one send per number every 120 s; 09999999999 always RATE_LIMITED.
 * Test aids: POST /api/v1/__mock/expire-access-tokens · POST /api/v1/__mock/new-order (a just-paid order on top).
 */
import http from "node:http";
import { randomUUID } from "node:crypto";
import { bagSVG } from "./art.mjs";
import { API, ApiError, ORIGIN, PORT, routes } from "./lib.mjs";
import { userOf } from "./auth.mjs";
import { mediaFile } from "./media.mjs";
import "./admin/index.mjs";

const DELAY = Number(process.env.MOCK_DELAY ?? 180);

/** Images: the design's bag illustrations (`/media/bag/hobo/lilac.svg`) and files uploaded through `POST /admin/media`. */
function sendMedia(res, path, query) {
	let m = path.match(/^\/media\/bag\/(\w+)\/([\w-]+)\.svg$/);
	if (m) {
		res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" });
		res.end(bagSVG(m[1], m[2], { v: Number(query.v) || 0 }));
		return true;
	}
	m = path.match(/^\/media\/upload\/(\w+)$/);
	const file = m && mediaFile(m[1]);
	if (file) {
		res.writeHead(200, { "Content-Type": file.type || "application/octet-stream", "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" });
		res.end(file.bytes);
		return true;
	}
	return false;
}

/** Just enough multipart parsing for `POST /admin/media`: the text fields and the file (bytes kept for previews). */
function parseMultipart(buf, contentType) {
	const m = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType);
	const out = { fields: {}, file: null };
	if (!m) return out;
	const text = buf.toString("latin1");
	text.split(`--${m[1] || m[2]}`).forEach((part) => {
		const cut = part.indexOf("\r\n\r\n");
		if (cut < 0) return;
		const head = part.slice(0, cut);
		const body = part.slice(cut + 4).replace(/\r\n$/, "");
		const name = /name="([^"]*)"/.exec(head)?.[1];
		const filename = /filename="([^"]*)"/.exec(head)?.[1];
		if (filename != null)
			out.file = { name: Buffer.from(filename, "latin1").toString("utf8"), type: (/Content-Type:\s*([^\r\n]+)/i.exec(head)?.[1] || "").trim(), bytes: Buffer.from(body, "latin1") };
		else if (name) out.fields[name] = Buffer.from(body, "latin1").toString("utf8");
	});
	return out;
}

const server = http.createServer(async (req, res) => {
	const url = new URL(req.url, ORIGIN);
	const cors = {
		"Access-Control-Allow-Origin": req.headers.origin || "*",
		"Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type,Authorization,Idempotency-Key,If-Match",
		"Access-Control-Expose-Headers": "Retry-After,ETag",
		// the session cookie travels with `credentials: 'include'` — needs an exact origin (above) and this
		"Access-Control-Allow-Credentials": "true",
		Vary: "Origin",
	};
	if (req.method === "OPTIONS") {
		res.writeHead(204, cors);
		res.end();
		return;
	}
	if (url.pathname.startsWith("/media/") && sendMedia(res, url.pathname, Object.fromEntries(url.searchParams))) return;

	const send = (status, body, headers = {}, type = "application/json; charset=utf-8") => {
		res.writeHead(status, { ...cors, ...headers, ...(body === undefined ? {} : { "Content-Type": type }) });
		res.end(body === undefined ? undefined : JSON.stringify(body));
	};
	const path = url.pathname.startsWith(API) ? url.pathname.slice(API.length) || "/" : null;
	const r = path && routes.find((x) => x.method === req.method && x.re.test(path));
	if (!r) {
		send(404, undefined); // bare 404 (no problem body) → the FE's NOT_FOUND
		return;
	}

	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	const raw = Buffer.concat(chunks);
	const multipart = /multipart\/form-data/.test(req.headers["content-type"] || "");
	const auth = String(req.headers.authorization || "");
	const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
	const ctx = {
		req,
		headers: {},
		status: 200,
		token,
		origin: ORIGIN,
		query: Object.fromEntries(url.searchParams),
		params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(path.match(r.re)[i + 1])])),
		user: null,
	};
	await new Promise((ok) => setTimeout(ok, DELAY));
	try {
		ctx.user = userOf(token);
		ctx.body = raw.length && !multipart ? JSON.parse(raw.toString("utf8")) : null;
		ctx.multipart = multipart ? parseMultipart(raw, req.headers["content-type"]) : null;
		const out = await r.handler(ctx);
		send(ctx.status, ctx.status === 204 ? undefined : out, ctx.headers);
		console.log(`${req.method} ${url.pathname}${url.search} → ${ctx.status}`);
	} catch (e) {
		if (!(e instanceof ApiError)) {
			console.error(e);
			e = new ApiError(500, "INTERNAL_ERROR", "یه مشکلی سمت سرور پیش اومد. دوباره امتحان کن.");
		}
		send(
			e.status,
			{ type: `https://kiva.ir/problems/${e.code.toLowerCase().replace(/_/g, "-")}`, title: e.code, status: e.status, code: e.code, message: e.message, instance: url.pathname, traceId: randomUUID().slice(0, 16), errors: null, meta: null, ...e.extra },
			ctx.headers,
			"application/problem+json; charset=utf-8",
		);
		console.log(`${req.method} ${url.pathname}${url.search} → ${e.status} ${e.code}`);
	}
});
server.listen(PORT, () => console.log(`KIVA admin mock API ready → ${ORIGIN}${API}  (staff 09120000001…05, OTP: any 5 digits)`));
