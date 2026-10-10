/** `POST /admin/media` — uploads kept in memory and served back at `/media/upload/:id` (for previews). */
import { fail, route } from "./lib.mjs";
import { staff } from "./auth.mjs";

const files = new Map(); // id → { type, bytes }
const PURPOSES = ["PRODUCT", "PRE_SHIPMENT", "BLOG", "BANNER", "CATEGORY", "TESTIMONIAL"];
let SEQ = 500;

export const mediaFile = (id) => files.get(id);

/** Every uploaded asset by id — forms send `mediaId`s, views need the asset back. */
export const assets = new Map();

export function saveUpload(origin, file, purpose, alt) {
	const id = `med${++SEQ}`;
	files.set(id, { type: file.type, bytes: file.bytes });
	const video = /^video\//.test(file.type);
	const url = `${origin}/media/upload/${id}`;
	const asset = {
		id, type: video ? "VIDEO" : "IMAGE", url, thumbnailUrl: video ? null : url, srcSet: [], posterUrl: null,
		width: 1200, height: 1200, durationSec: video ? 24 : null, mimeType: file.type, alt: alt || null, blurhash: null, purpose,
	};
	assets.set(id, asset);
	return asset;
}

route("POST", "/admin/media", (ctx) => {
	staff(ctx, "CATALOG_MANAGER", "CONTENT_EDITOR", "OPERATOR");
	const { file, fields } = ctx.multipart || {};
	const errors = [];
	if (!file || !file.bytes?.length) errors.push({ field: "file", code: "REQUIRED", message: "فایلی انتخاب نشده." });
	if (!PURPOSES.includes(fields?.purpose)) errors.push({ field: "purpose", code: "INVALID", message: "کاربرد فایل معتبر نیست." });
	if (file && !/^(image|video)\//.test(file.type)) errors.push({ field: "file", code: "UPLOAD_TYPE_NOT_ALLOWED", message: "فقط عکس یا ویدیو می‌شه آپلود کرد." });
	if (file && file.bytes.length > 50 * 1024 * 1024) errors.push({ field: "file", code: "UPLOAD_TOO_LARGE", message: "حجم فایل بیشتر از ۵۰ مگابایته." });
	const special = errors.find((e) => e.code.startsWith("UPLOAD_"));
	if (special) fail(special.code === "UPLOAD_TOO_LARGE" ? 413 : 415, special.code, special.message);
	if (errors.length) fail(400, "VALIDATION_ERROR", errors[0].message, { errors });
	ctx.status = 201;
	return saveUpload(ctx.origin, file, fields.purpose, fields.alt);
});
