import { convertPersianToEnglishString } from "@/utils/digits";

/*
 * Jalali ⇄ Gregorian (the jalaali-js algorithm, Borkowski's leap rules). Display dates go through `Intl`
 * (`formatDate`); this is only for what the shopper *types* — the birth date the API stores as Gregorian.
 */

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

const div = (a: number, b: number) => ~~(a / b);
const mod = (a: number, b: number) => a - ~~(a / b) * b;

function jalCal(jy: number) {
	const gy = jy + 621;
	let leapJ = -14;
	let jp = BREAKS[0];
	let jump = 0;
	for (let i = 1; i < BREAKS.length; i += 1) {
		const jm = BREAKS[i];
		jump = jm - jp;
		if (jy < jm) break;
		leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
		jp = jm;
	}
	let n = jy - jp;
	leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
	if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
	const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
	const march = 20 + leapJ - leapG;
	if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
	let leap = mod(mod(n + 1, 33) - 1, 4);
	if (leap === -1) leap = 4;
	return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
	const d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
	return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}

function d2g(jdn: number) {
	let j = 4 * jdn + 139361631;
	j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
	const i = div(mod(j, 1461), 4) * 5 + 308;
	const gd = div(mod(i, 153), 5) + 1;
	const gm = mod(div(i, 153), 12) + 1;
	const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
	return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number) {
	const r = jalCal(jy);
	return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number) {
	const gy = d2g(jdn).gy;
	let jy = gy - 621;
	const r = jalCal(jy);
	let k = jdn - g2d(gy, 3, r.march);
	if (k >= 0) {
		if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
		k -= 186;
	} else {
		jy -= 1;
		k += 179;
		if (r.leap === 1) k += 1;
	}
	return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

const monthLength = (jy: number, jm: number) => (jm <= 6 ? 31 : jm <= 11 ? 30 : jalCal(jy).leap === 0 ? 30 : 29);

const pad = (n: number) => String(n).padStart(2, "0");

/** `1996-09-10` → `1375/06/20` (Latin digits); `""` for an empty or malformed value. */
export function gregorianToJalali(iso?: string | null): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
	if (!m) return "";
	const { jy, jm, jd } = d2j(g2d(+m[1], +m[2], +m[3]));
	return `${jy}/${pad(jm)}/${pad(jd)}`;
}

/** `۱۳۷۵/۰۶/۲۰` (Persian or Latin digits, `/` or `-`) → `1996-09-10`; `null` when it is not a real Jalali date. */
export function jalaliToGregorian(value: string): string | null {
	const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(convertPersianToEnglishString(value).trim());
	if (!m) return null;
	const [jy, jm, jd] = [+m[1], +m[2], +m[3]];
	if (jy < 1300 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > monthLength(jy, jm)) return null;
	const { gy, gm, gd } = d2g(j2d(jy, jm, jd));
	return `${gy}-${pad(gm)}-${pad(gd)}`;
}
