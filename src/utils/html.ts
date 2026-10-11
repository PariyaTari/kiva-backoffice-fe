/** `HtmlString` (kiva-openapi.yml): the server keeps only these tags — everything else is stripped before it is stored. */
export const HTML_TAGS = ["p", "b", "strong", "em", "a", "ul", "ol", "li", "br", "mark", "h2", "h3", "blockquote"] as const;

/** Tags whose content must not show up in a preview either (code, embeds, form controls). */
const DROP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "noscript", "template", "link", "meta", "form", "input", "button", "textarea", "select", "svg", "math"]);
const UNSAFE_URL = /^\s*(javascript|vbscript|data):/i;

/**
 * The editor's preview of an `HtmlString` — a rough copy of the server's sanitizer, for display only (the server is
 * the one that decides): tags outside {@link HTML_TAGS} are unwrapped (their text stays), code/embeds are dropped with
 * their content, and only `href` survives (on links, and not `javascript:`). `DOMParser` documents are inert — nothing
 * in them runs or loads while they are cleaned. Returns the clean HTML and the tags that were taken out.
 */
export function cleanHtml(html: string): { html: string; dropped: string[] } {
	const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, "text/html");
	const dropped = new Set<string>();
	const allowed = new Set<string>(HTML_TAGS);

	const walk = (parent: Element) => {
		for (const el of Array.from(parent.children)) {
			const tag = el.tagName.toLowerCase();
			if (DROP_WITH_CONTENT.has(tag)) {
				dropped.add(tag);
				el.remove();
				continue;
			}
			walk(el);
			if (!allowed.has(tag)) {
				dropped.add(tag);
				el.replaceWith(...Array.from(el.childNodes));
				continue;
			}
			for (const attr of Array.from(el.attributes)) {
				if (!(tag === "a" && attr.name === "href") || UNSAFE_URL.test(attr.value)) el.removeAttribute(attr.name);
			}
			if (tag === "a") {
				el.setAttribute("target", "_blank");
				el.setAttribute("rel", "noreferrer noopener");
			}
		}
	};

	walk(doc.body);
	return { html: doc.body.innerHTML, dropped: Array.from(dropped) };
}
