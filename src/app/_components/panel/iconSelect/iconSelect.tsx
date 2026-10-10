"use client";

import classNames from "classnames";
import { Icon } from "@/app/_components/icon/icons";

/** Icons that make sense on the storefront's tags, bars and campaign heads. */
const ICONS = ["fire", "sparkle", "tag", "star", "heart", "timer", "truck", "camera", "box", "bell", "award", "leaf", "smile", "shield", "refresh", "info", "send", "chat"];

type IconSelectProps = {
	label?: string;
	value: string | null;
	onChange: (icon: string | null) => void;
	/** Show a «بدون آیکن» choice. */
	clearable?: boolean;
};

/** A row of the design's icons to pick one (the API stores the icon name). */
export default function IconSelect({ label = "آیکن", value, onChange, clearable = false }: IconSelectProps) {
	return (
		<div className="field">
			<label>{label}</label>
			<div className="chip-row" role="radiogroup" aria-label={label}>
				{clearable && (
					<button type="button" className={classNames("btn btn-sm", value ? "btn-white" : "btn-dark")} onClick={() => onChange(null)} aria-pressed={!value}>
						بدون آیکن
					</button>
				)}
				{ICONS.map((name) => (
					<button
						key={name}
						type="button"
						className={classNames("icon-btn", { on: value === name })}
						style={{ width: 38, height: 38, background: value === name ? "var(--ink)" : "var(--lilac-50)", color: value === name ? "#fff" : undefined }}
						aria-label={name}
						aria-pressed={value === name}
						title={name}
						onClick={() => onChange(name)}
					>
						<Icon name={name} style={{ width: 18, height: 18 }} />
					</button>
				))}
			</div>
		</div>
	);
}
