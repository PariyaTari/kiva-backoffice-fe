import { CSSProperties } from "react";

export type LogoTone = "primary" | "white";

export type LogoProps = {
	/** `white` is for dark surfaces (footer). */
	tone?: LogoTone;
	className?: string;
	style?: CSSProperties;
};
