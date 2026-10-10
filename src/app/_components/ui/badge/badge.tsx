import classNames from "classnames";
import { Tone } from "@/types/common.type";
import { BadgeProps } from "./badge.type";

const TONES: Record<Tone, string> = {
	DEFAULT: "",
	SALE: "tag-sale",
	WARN: "tag-warn",
	SUCCESS: "tag-success",
	CREAM: "tag-cream",
	DARK: "tag-dark",
	GLASS: "tag-glass",
	DANGER: "tag-danger",
};

/** Design-system `.tag`. */
export default function Badge({ tone = "DEFAULT", size = "md", iconStart, className, children, ...rest }: BadgeProps) {
	return (
		<span className={classNames("tag", TONES[tone], { "tag-lg": size === "lg" }, className)} {...rest}>
			{iconStart}
			{children}
		</span>
	);
}

/** CSS class of an API tone — for places that render the `.tag` markup themselves. */
export const toneClass = (tone?: Tone | null) => (tone ? TONES[tone] : "");
