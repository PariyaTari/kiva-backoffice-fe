import { svgIcon } from "./icon.types";

export type MessengerChannel = "RUBIKA" | "TELEGRAM" | "BALE" | "INSTAGRAM";

type MessengerIconProps = svgIcon & {
	channel: MessengerChannel | string;
	/** Single-colour version (`currentColor`) used on dark surfaces such as the footer. */
	mono?: boolean;
};

/** Brand marks of the messengers (design `K.msgrIcon`) — coloured or mono. */
export function MessengerIcon({ channel, mono = false, ...rest }: MessengerIconProps) {
	const c = "currentColor";
	switch (String(channel).toUpperCase()) {
		case "TELEGRAM":
			return mono ? (
				<svg viewBox="0 0 32 32" aria-hidden="true" {...rest}>
					<path fill={c} d="M5.6 15.2l18.6-7.2c.9-.3 1.6.2 1.3 1.5l-3.2 15c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.2-8.3c.4-.4-.1-.6-.6-.2l-11.4 7.2-4.9-1.5c-1.1-.3-1.1-1 .2-1.4z" />
				</svg>
			) : (
				<svg viewBox="0 0 32 32" aria-hidden="true" {...rest}>
					<circle cx="16" cy="16" r="16" fill="#2AABEE" />
					<path fill="#fff" d="M8.2 15.7l13.6-5.3c.6-.2 1.2.2 1 1.1l-2.3 11c-.2.8-.7 1-1.3.6l-3.7-2.7-1.8 1.7c-.2.2-.4.4-.8.4l.3-3.8 6.8-6.1c.3-.3-.1-.4-.4-.2l-8.4 5.3-3.6-1.1c-.8-.3-.8-.8.6-1z" />
				</svg>
			);
		case "INSTAGRAM":
			return mono ? (
				<svg viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2.2" aria-hidden="true" {...rest}>
					<rect x="6" y="6" width="20" height="20" rx="6" />
					<circle cx="16" cy="16" r="4.6" />
					<circle cx="21.6" cy="10.4" r="1" fill={c} stroke="none" />
				</svg>
			) : (
				<svg viewBox="0 0 32 32" aria-hidden="true" {...rest}>
					<rect width="32" height="32" rx="16" fill="#E1306C" />
					<g fill="none" stroke="#fff" strokeWidth="2">
						<rect x="8.5" y="8.5" width="15" height="15" rx="4.5" />
						<circle cx="16" cy="16" r="3.6" />
					</g>
					<circle cx="20.4" cy="11.6" r="1" fill="#fff" />
				</svg>
			);
		case "BALE":
			return mono ? (
				<svg viewBox="0 0 32 32" aria-hidden="true" {...rest}>
					<path fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round" d="M16 6.5a9.5 9.5 0 018.3 14.1l1.4 5-5.1-1.3A9.5 9.5 0 1116 6.5z" />
					<path fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M11.5 16.2l3 3 6-6.2" />
				</svg>
			) : (
				<svg viewBox="0 0 32 32" aria-hidden="true" {...rest}>
					<circle cx="16" cy="16" r="16" fill="#1EB980" />
					<path fill="#fff" d="M16 8a8 8 0 016.9 12l1.1 4.1-4.2-1.1A8 8 0 1116 8z" />
					<path fill="none" stroke="#1EB980" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M12.4 16.2l2.6 2.6 4.8-5" />
				</svg>
			);
		case "RUBIKA":
			return mono ? (
				<svg viewBox="0 0 32 32" aria-hidden="true" {...rest}>
					<path fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round" d="M16 5l9.5 5.5v11L16 27l-9.5-5.5v-11z" />
					<path fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round" d="M16 11l4.8 2.7v5.6L16 22l-4.8-2.7v-5.6z" />
				</svg>
			) : (
				<svg viewBox="0 0 32 32" aria-hidden="true" {...rest}>
					<circle cx="16" cy="16" r="16" fill="#6F4CF6" />
					<path fill="#FF5C8A" d="M16 7l7.8 4.5L16 16z" />
					<path fill="#FFC542" d="M23.8 11.5v9L16 16z" />
					<path fill="#3DDC97" d="M23.8 20.5L16 25v-9z" />
					<path fill="#29B6F6" d="M16 25l-7.8-4.5L16 16z" />
					<path fill="#fff" d="M8.2 20.5v-9L16 16z" />
					<path fill="#E0D5FF" d="M8.2 11.5L16 7v9z" />
				</svg>
			);
		default:
			return null;
	}
}
