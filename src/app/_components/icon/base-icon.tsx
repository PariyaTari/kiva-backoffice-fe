import { svgIcon } from "./icon.types";

/**
 * The SVG shell every line icon shares — same attributes as the design's `icon()` helper.
 * No width/height on purpose: the design CSS sizes icons by context (`.btn svg{width:18px}` …).
 */
export const BaseIcon: React.FC<svgIcon> = ({ children, ...rest }) => {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...rest}
		>
			{children}
		</svg>
	);
};
