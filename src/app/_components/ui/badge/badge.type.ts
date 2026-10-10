import { HTMLAttributes, ReactNode } from "react";
import { Tone } from "@/types/common.type";

export type BadgeSize = "md" | "lg";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
	/** The API `Tone` (`SALE`, `WARN`, …) — maps to `.tag-sale`, `.tag-warn`, …; `DEFAULT` is the plain `.tag`. */
	tone?: Tone;
	size?: BadgeSize;
	iconStart?: ReactNode;
	children?: ReactNode;
};
