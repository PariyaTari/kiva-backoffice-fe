import { ReactNode } from "react";
import classNames from "classnames";
import { BaseIcon } from "./base-icon";
import { IconName, IconProps } from "./icon.types";

/** Path data of the design's icon set (kiva.js `IC`), 24×24 grid, 1.7 stroke. */
const PATHS: Record<IconName, ReactNode> = {
	search: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>),
	heart: <path d="M12 20s-7-4.4-9.2-9C1.4 8 3 4.5 6.5 4.5c2 0 3.5 1.2 5.5 3.3 2-2.1 3.5-3.3 5.5-3.3C21 4.5 22.6 8 21.2 11c-2.2 4.6-9.2 9-9.2 9z" />,
	user: (<><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></>),
	bag: (<><path d="M5.5 8h13l-.9 11.1a1.5 1.5 0 01-1.5 1.4H7.9a1.5 1.5 0 01-1.5-1.4L5.5 8z" /><path d="M9 10V6.5a3 3 0 016 0V10" /></>),
	menu: <path d="M4 7h16M4 12h16M10 17h10" />,
	close: <path d="M6 6l12 12M18 6L6 18" />,
	arrow: <path d="M19 12H5M11 6l-6 6 6 6" />,
	arrowR: <path d="M5 12h14M13 6l6 6-6 6" />,
	down: <path d="M6 9l6 6 6-6" />,
	left: <path d="M15 6l-6 6 6 6" />,
	right: <path d="M9 6l6 6-6 6" />,
	plus: <path d="M12 5v14M5 12h14" />,
	minus: <path d="M5 12h14" />,
	trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />,
	check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
	play: <path d="M8 5.5v13a1 1 0 001.5.9l10.5-6.5a1 1 0 000-1.8L9.5 4.6A1 1 0 008 5.5z" fill="currentColor" stroke="none" />,
	camera: (<><path d="M4 8.5A2.5 2.5 0 016.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0120 8.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17.5v-9z" /><circle cx="12" cy="13" r="3.5" /></>),
	truck: (<><path d="M3 6.5A1.5 1.5 0 014.5 5H14v11H3V6.5zM14 9h4l3 3.5V16h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>),
	box: (<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></>),
	home: <path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-8z" />,
	phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" />,
	mail: (<><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 6 8-6" /></>),
	pin: (<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>),
	clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
	star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />,
	filter: <path d="M4 6h16M7 12h10M10 18h4" />,
	sort: <path d="M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3" />,
	copy: (<><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></>),
	image: (<><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>),
	video: (<><rect x="3" y="6" width="13" height="12" rx="2.5" /><path d="M16 10.5l5-3v9l-5-3" /></>),
	shield: (<><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>),
	refresh: <path d="M4 12a8 8 0 0114-5.3L20 9M20 4v5h-5M20 12a8 8 0 01-14 5.3L4 15M4 20v-5h5" />,
	logout: <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 8l-4 4 4 4M6 12h10" />,
	edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
	chat: <path d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v9a1.5 1.5 0 01-1.5 1.5H9l-5 4V5.5z" />,
	info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
	eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
	cal: (<><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
	sparkle: <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" />,
	lock: (<><rect x="5" y="10" width="14" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 018 0v3" /></>),
	send: <path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z" />,
	card: (<><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 10h18M7 15h4" /></>),
	tag: (<><path d="M3 12V4.5A1.5 1.5 0 014.5 3H12l9 9-9 9-9-9z" /><circle cx="7.5" cy="7.5" r="1.5" /></>),
	timer: (<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></>),
	quote: <path d="M10 7H6a2 2 0 00-2 2v4h6V7zM20 7h-4a2 2 0 00-2 2v4h6V7zM4 13c0 3 1 4 3 5M14 13c0 3 1 4 3 5" />,
	share: (<><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></>),
	ruler: <path d="M3 17L17 3l4 4L7 21l-4-4zM7 13l2 2M10 10l2 2M13 7l2 2" />,
	headset: (<><path d="M4 15v-3a8 8 0 0116 0v3" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></>),
	grid: (<><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>),
	smile: (<><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1.8 2 5.2 2 7 0M9 9.5h.01M15 9.5h.01" /></>),
	pkg: (<><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M8 5.3l8.5 4.5V13" /></>),
	feather: <path d="M20 4c-8 0-14 6-14 14M6 18l-2 2M20 4c0 7-4 12-11 12" />,
	fire: <path d="M12 21c4 0 7-2.7 7-6.5 0-4-3.5-6-4.5-10-2 1.5-3.5 3.5-3.5 6-1-1-2-2-2.5-3.5C6 9 5 11.5 5 14.5 5 18.3 8 21 12 21z" />,
	bell: <path d="M6 10a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6M10 19a2 2 0 004 0" />,
	leaf: <path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7" />,
	award: (<><circle cx="12" cy="9" r="5.5" /><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5" /></>),
	// order actions (kiva-order-actions `XI`)
	download: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />,
	upload: <path d="M12 16V5M7 9.5l5-5 5 5M5 20h14" />,
	receipt: (<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6M9 16h3" /></>),
	ban: (<><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>),
	swap: <path d="M7 7h12M15 3l4 4-4 4M17 17H5M9 13l-4 4 4 4" />,
	alert: (<><path d="M12 4l9 16H3L12 4z" /><path d="M12 10v4M12 17h.01" /></>),
	palette: (<><path d="M12 3a9 9 0 100 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 004-4c0-4.4-4-8-9-8z" /><circle cx="7.5" cy="11" r="1.2" /><circle cx="10" cy="7" r="1.2" /><circle cx="15" cy="7.5" r="1.2" /></>),
	wallet: (<><path d="M4 7.5A2.5 2.5 0 016.5 5H17v3" /><rect x="4" y="8" width="16" height="11" rx="2.5" /><path d="M16 13.5h.01" /></>),
	bank: <path d="M3 9l9-5 9 5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18" />,
	print: (<><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 14h10v6H7z" /></>),
	// panel (same grid and stroke as the design set)
	gear: (<><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2" /><circle cx="12" cy="12" r="6.8" /></>),
	chart: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />,
	users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 19c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5" /><path d="M15.5 4.8a3.5 3.5 0 010 6.4M18 14.8c1.6.6 2.8 2 3.5 4.2" /></>),
	file: (<><path d="M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>),
	layers: (<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>),
	drag: <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="2.6" />,
	up: <path d="M6 15l6-6 6 6" />,
	external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />,
};

/** `<Icon name="arrow" />` — renders like the design's `icon('arrow')`, incl. the `i-arrow` hook class. */
export function Icon({ name, className, ...rest }: IconProps) {
	return (
		<BaseIcon className={classNames(`i-${name}`, className)} {...rest}>
			{PATHS[name as IconName] ?? null}
		</BaseIcon>
	);
}
