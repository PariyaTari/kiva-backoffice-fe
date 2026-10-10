import classNames from "classnames";
import { HTMLAttributes } from "react";

type CardTone = "default" | "soft" | "cream";

type CardProps = HTMLAttributes<HTMLDivElement> & {
	as?: "div" | "section" | "article";
	/** `default` = `.card`, `soft` = `.card-soft` (lilac well), `cream` = `.box-cream`. */
	tone?: CardTone;
};

const TONES: Record<CardTone, string> = {
	default: "card",
	soft: "card-soft",
	cream: "box-cream",
};

export default function Card({ as: Tag = "div", tone = "default", className, children, ...rest }: CardProps) {
	return (
		<Tag className={classNames(TONES[tone], className)} {...rest}>
			{children}
		</Tag>
	);
}
