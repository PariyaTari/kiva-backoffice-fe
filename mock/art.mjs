/**
 * Illustrated bag & blog-cover SVGs — a 1:1 port of `bagSVG` / `postCover` from kiva/assets/kiva.js.
 * The mock backend serves these as the product images (MediaAsset.url) until real photos exist.
 */

export const COLOR_HEX = {
	black: "#2B2930", cream: "#EADFCB", brown: "#8A5A3C", lilac: "#C8B6E2", gray: "#A6A3AD", olive: "#7D8150",
	red: "#A8344A", pink: "#EDB9C6", blue: "#5677AE", white: "#F8F6F2", caramel: "#C68B59", navy: "#2F3B5C",
	purple: "#5B3E8C",
};

const INK = "#2A1F3D";
const GOLD = "#CDAA6E";

function shade(hex, p) {
	const n = parseInt(hex.slice(1), 16);
	let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
	const t = p < 0 ? 0 : 255, f = Math.abs(p) / 100;
	r = Math.round((t - r) * f + r); g = Math.round((t - g) * f + g); b = Math.round((t - b) * f + b);
	return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const strap = (d, col, w = 5) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w - 1}" stroke-linecap="round"/>`;

let GID = 0;

/** `type` = design bag key (hobo, cross, backpack, satchel, clutch, tote, bucket, wallet); `v` = view variant 0–3. */
export function bagSVG(type, colorKey, opt = {}) {
	const base = COLOR_HEX[colorKey] || colorKey || "#C8B6E2";
	const dark = lum(base) < 0.3;
	const dk = dark ? shade(base, 22) : shade(base, -20), md = dark ? shade(base, 10) : shade(base, -9), lt = shade(base, 35);
	const edge = dark ? shade(base, 30) : shade(base, -32);
	const o = `stroke="${edge}" stroke-opacity=".3" stroke-width="1" stroke-linejoin="round"`;
	let g = "";
	switch (type) {
		case "tote": g = strap("M66 88 C64 38 96 38 94 88", dk) + strap("M106 88 C104 38 136 38 134 88", dk) +
			`<path d="M46 84 H154 L164 166 Q165 176 155 176 H45 Q35 176 36 166 Z" fill="${base}" ${o}/><path d="M46 84 H154 L155.7 98 H44.3 Z" fill="${dk}" ${o}/>` +
			`<rect x="84" y="120" width="32" height="20" rx="6" fill="${lt}" ${o} stroke-width="1.6"/>`; break;
		case "cross": g = strap("M60 104 C26 -8 174 -8 140 104", dk, 4) +
			`<rect x="48" y="96" width="104" height="80" rx="20" fill="${base}" ${o}/><path d="M48 116 Q48 96 68 96 H132 Q152 96 152 116 V130 Q100 156 48 130 Z" fill="${md}" ${o}/>` +
			`<circle cx="100" cy="141" r="6.5" fill="${GOLD}" ${o} stroke-width="1.6"/><circle cx="58" cy="101" r="4" fill="${GOLD}" ${o} stroke-width="1.5"/><circle cx="142" cy="101" r="4" fill="${GOLD}" ${o} stroke-width="1.5"/>`; break;
		case "backpack": g = strap("M84 56 Q100 32 116 56", dk, 5) + strap("M54 92 C36 112 38 146 54 166", dk, 6) +
			`<path d="M54 74 Q54 50 80 50 H120 Q146 50 146 74 L150 162 Q150 176 136 176 H64 Q50 176 50 162 Z" fill="${base}" ${o}/>` +
			`<path d="M58 84 Q100 70 142 84" fill="none" stroke="${edge}" stroke-width="1.6" stroke-linecap="round"/><rect x="68" y="114" width="64" height="50" rx="14" fill="${md}" ${o}/>` +
			`<path d="M78 128 H122" stroke="${edge}" stroke-width="1.6" stroke-linecap="round"/><circle cx="118" cy="128" r="3.5" fill="${GOLD}" stroke="${edge}" stroke-width="1.5"/>`; break;
		case "clutch": g = `<path d="M50 92 C50 32 150 32 150 92" fill="none" stroke="${GOLD}" stroke-width="4" stroke-dasharray="0.1 7" stroke-linecap="round"/>` +
			`<rect x="32" y="88" width="136" height="78" rx="16" fill="${base}" ${o}/><path d="M32 104 Q32 88 48 88 H152 Q168 88 168 104 L108 138 Q100 143 92 138 Z" fill="${md}" ${o}/>` +
			`<rect x="91" y="131" width="18" height="12" rx="4" fill="${GOLD}" ${o} stroke-width="1.6"/>`; break;
		case "hobo": g = strap("M62 98 C58 26 142 26 138 98", dk, 6) +
			`<path d="M38 96 Q100 80 162 96 Q172 172 100 176 Q28 172 38 96 Z" fill="${base}" ${o}/><path d="M50 106 Q100 94 150 106" fill="none" stroke="${edge}" stroke-width="1.5" stroke-dasharray="3 5" opacity=".18"/>` +
			`<circle cx="62" cy="96" r="5.5" fill="${GOLD}" ${o} stroke-width="1.6"/><circle cx="138" cy="96" r="5.5" fill="${GOLD}" ${o} stroke-width="1.6"/>`; break;
		case "satchel": g = strap("M76 88 C74 48 126 48 124 88", dk, 6) +
			`<path d="M42 94 Q42 84 52 84 H148 Q158 84 158 94 L164 166 Q165 176 155 176 H45 Q35 176 36 166 Z" fill="${base}" ${o}/>` +
			`<path d="M42 94 Q42 84 52 84 H148 Q158 84 158 94 L159.5 112 Q100 128 40.5 112 Z" fill="${md}" ${o}/><rect x="90" y="108" width="20" height="17" rx="4" fill="${GOLD}" ${o} stroke-width="1.6"/>`; break;
		case "bucket": g = strap("M66 86 C56 20 144 20 134 86", dk, 5) +
			`<path d="M52 84 L148 84 L140 166 Q139 176 129 176 H71 Q61 176 60 166 Z" fill="${base}" ${o}/><ellipse cx="100" cy="84" rx="48" ry="11" fill="${dk}" ${o}/>` +
			`<path d="M54 93 Q100 107 146 93" fill="none" stroke="${edge}" stroke-width="1.6"/><path d="M100 101 L93 124 M100 101 L109 122" stroke="${edge}" stroke-width="1.6" stroke-linecap="round"/>` +
			`<circle cx="93" cy="126" r="4.5" fill="${GOLD}" stroke="${edge}" stroke-width="1.5"/><circle cx="109" cy="124" r="4.5" fill="${GOLD}" stroke="${edge}" stroke-width="1.5"/>`; break;
		case "wallet": default: g = `<rect x="60" y="64" width="58" height="32" rx="5" fill="#fff" ${o} stroke-width="1.6" transform="rotate(-9 90 80)"/>` +
			`<rect x="42" y="78" width="116" height="84" rx="16" fill="${base}" ${o}/><path d="M42 94 Q42 78 58 78 H142 Q158 78 158 94 V116 H42 Z" fill="${md}" ${o}/>` +
			`<circle cx="100" cy="116" r="7" fill="${GOLD}" ${o} stroke-width="1.6"/>`;
	}
	const id = "kb" + (++GID);
	const defs = `<defs><linearGradient id="${id}a" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${shade(base, dark ? 20 : 16)}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${shade(base, dark ? -8 : -14)}"/></linearGradient>` +
		`<linearGradient id="${id}b" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${shade(md, dark ? 18 : 12)}"/><stop offset="1" stop-color="${shade(md, dark ? -6 : -12)}"/></linearGradient>` +
		`<linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EBD39E"/><stop offset="1" stop-color="#B08A4C"/></linearGradient></defs>`;
	g = g.split(`fill="${base}"`).join(`fill="url(#${id}a)"`).split(`fill="${md}"`).join(`fill="url(#${id}b)"`).split(`fill="${GOLD}"`).join(`fill="url(#${id}c)"`);
	let pre = "", tr = "";
	if (opt.v === 1) tr = 'transform="translate(100 112) scale(1.55) translate(-100 -118)"';
	if (opt.v === 2) pre = `<circle cx="100" cy="112" r="80" fill="#fff" opacity=".8"/>`;
	if (opt.v === 3) tr = 'transform="translate(200 0) scale(-1 1) rotate(-7 100 120)"';
	const shadow = opt.v === 1 ? "" : `<ellipse cx="100" cy="182" rx="62" ry="7" fill="${INK}" opacity=".06"/>`;
	return dedupeAttributes(`<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="bag-svg" aria-hidden="true">${defs}${pre}${shadow}<g ${tr}>${g}</g></svg>`);
}

/**
 * The design's markup repeats `stroke-width` on some shapes. Inline in HTML the first one wins; as a
 * standalone .svg (strict XML) a duplicate attribute breaks the whole image — so keep the first.
 */
function dedupeAttributes(svg) {
	return svg.replace(/<([a-zA-Z]+)((?:\s+[a-zA-Z:-]+="[^"]*")*)\s*(\/?)>/g, (_, tag, attrs, selfClose) => {
		const seen = new Set();
		const kept = attrs.replace(/\s+([a-zA-Z:-]+)="[^"]*"/g, (a, name) => (seen.has(name) ? "" : (seen.add(name), a)));
		return `<${tag}${kept}${selfClose}>`;
	});
}

const strip = (s) => s.replace(/<\/?svg[^>]*>/g, "");

/** Blog cover: `kind` = "card" (default), "big" (featured) or "wide" (article header). */
export function postCover(p, kind = "card") {
	if (kind === "wide") return `<svg viewBox="0 0 640 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="640" height="280" fill="${p.bg}"/>
      <circle cx="430" cy="140" r="125" fill="#fff" opacity=".55"/><circle cx="90" cy="250" r="80" fill="#fff" opacity=".35"/><circle cx="600" cy="30" r="50" fill="#fff" opacity=".3"/>
      <g transform="translate(325 22) scale(1.08)">${strip(bagSVG(p.bag, p.c))}</g></svg>`;
	const big = kind === "big";
	return `<svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="400" height="260" fill="${p.bg}"/>
      <circle cx="${big ? 300 : 280}" cy="130" r="110" fill="#fff" opacity=".55"/><circle cx="70" cy="230" r="60" fill="#fff" opacity=".35"/>
      <g transform="translate(${big ? 190 : 170} 25) scale(1.05)">${strip(bagSVG(p.bag, p.c))}</g></svg>`;
}
