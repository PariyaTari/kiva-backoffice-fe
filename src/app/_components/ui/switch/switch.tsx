"use client";

import { CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import classNames from "classnames";

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
	/** Text before the track (`.lbl`) — the design's filter switches. */
	label?: ReactNode;
	/** Text after the track — the design's profile switch («دریافت پیامک…»). */
	labelAfter?: ReactNode;
	labelClassName?: string;
	labelStyle?: CSSProperties;
};

/** Design-system `.switch` toggle. */
export default function Switch({ label, labelAfter, labelClassName, labelStyle, ...rest }: SwitchProps) {
	return (
		<label className={classNames("switch", labelClassName)} style={labelStyle}>
			{label && <span className="lbl">{label}</span>}
			<input type="checkbox" {...rest} />
			<span className="track" />
			{labelAfter && <span>{labelAfter}</span>}
		</label>
	);
}
