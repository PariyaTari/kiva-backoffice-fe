/** One CSV field: quoted when it holds a comma, quote or line break (RFC 4180). */
const field = (value: string | number | null | undefined) => {
	const text = value == null ? "" : String(value);
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Builds a CSV file and hands it to the browser as a download. A UTF-8 BOM leads the file so Excel reads the
 * Persian text right; rows end with CRLF.
 */
export function downloadCsv(fileName: string, header: string[], rows: (string | number | null | undefined)[][]) {
	const text = [header, ...rows].map((r) => r.map(field).join(",")).join("\r\n");
	const url = URL.createObjectURL(new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }));
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
