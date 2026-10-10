import classNames from "classnames";
import Link from "next/link";
import { ButtonProps } from "./button.type";

export default function Button({
	variant = "primary",
	size = "md",
	isLoading = false,
	fullWidth = false,
	iconStart,
	iconEnd,
	className,
	children,
	...rest
}: ButtonProps) {
	const classes = classNames(
		"btn",
		`btn-${variant}`,
		{ "btn-sm": size === "sm", "btn-lg": size === "lg", "btn-block": fullWidth, loading: isLoading },
		className,
	);

	const content = (
		<>
			{iconStart}
			{children}
			{iconEnd}
		</>
	);

	if (rest.href !== undefined) {
		const { href, ...linkRest } = rest;
		return (
			<Link href={href} className={classes} {...linkRest}>
				{content}
			</Link>
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip `href` so it never reaches <button>
	const { href: _href, disabled, type = "button", ...buttonRest } = rest;
	return (
		<button type={type} className={classes} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...buttonRest}>
			{content}
		</button>
	);
}
