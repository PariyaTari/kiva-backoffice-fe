import { LogoProps } from "./logo.type";

const SRC = {
	primary: "/images/logo/kiva-logo-primary.svg",
	white: "/images/logo/kiva-logo-white.svg",
};

/** The «kiva» wordmark as the design uses it (`<img>`); its height comes from the surrounding CSS. */
export default function Logo({ tone = "primary", className, style }: LogoProps) {
	// eslint-disable-next-line @next/next/no-img-element -- static brand SVG, sized by the design CSS
	return <img src={SRC[tone]} alt="کیوا" className={className} style={style} />;
}
