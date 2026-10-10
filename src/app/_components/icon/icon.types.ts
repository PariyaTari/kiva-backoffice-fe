import { SVGAttributes } from "react";

export type svgIcon = SVGAttributes<SVGElement>;

/** The icon set of the design (`icon(name)` in kiva.js). The API sends these names too (`IconName`). */
export type IconName =
	| "search" | "heart" | "user" | "bag" | "menu" | "close" | "arrow" | "arrowR" | "down" | "left" | "right"
	| "plus" | "minus" | "trash" | "check" | "play" | "camera" | "truck" | "box" | "home" | "phone" | "mail"
	| "pin" | "clock" | "star" | "filter" | "sort" | "copy" | "image" | "video" | "shield" | "refresh" | "logout"
	| "edit" | "chat" | "info" | "eye" | "cal" | "sparkle" | "lock" | "send" | "card" | "tag" | "timer" | "quote"
	| "share" | "ruler" | "headset" | "grid" | "smile" | "pkg" | "feather" | "fire" | "bell" | "leaf" | "award"
	| "download" | "upload" | "receipt" | "ban" | "swap" | "alert" | "palette" | "wallet" | "bank" | "print"
	| "gear" | "chart" | "users" | "file" | "layers" | "drag" | "up" | "external";

export type IconProps = svgIcon & {
	/** Unknown names (e.g. a new one from the API) render an empty icon instead of breaking. */
	name: IconName | (string & {});
};
