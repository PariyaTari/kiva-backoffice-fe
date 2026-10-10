import { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

/** Design-system buttons: `.btn-primary`, `.btn-dark`, `.btn-outline`, `.btn-soft`, `.btn-white`, `.btn-ghost-light`, `.btn-link` (+ the panel's `.btn-danger`). */
export type ButtonVariant = "primary" | "dark" | "outline" | "soft" | "white" | "ghost-light" | "link" | "danger";

/** `md` is the base `.btn` (48px). */
export type ButtonSize = "sm" | "md" | "lg";

type ButtonBaseProps = {
	variant?: ButtonVariant;
	size?: ButtonSize;
	/** `.btn.loading` — spinner instead of the label, clicks blocked. */
	isLoading?: boolean;
	fullWidth?: boolean;
	iconStart?: ReactNode;
	iconEnd?: ReactNode;
	children?: ReactNode;
	className?: string;
};

type ButtonAsButton = ButtonBaseProps &
	Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
		href?: undefined;
	};

type ButtonAsLink = ButtonBaseProps &
	Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
		href: string;
	};

export type ButtonProps = ButtonAsButton | ButtonAsLink;
