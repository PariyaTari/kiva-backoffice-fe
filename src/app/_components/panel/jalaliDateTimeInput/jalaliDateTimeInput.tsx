"use client";

import { useState } from "react";
import { Icon } from "@/app/_components/icon/icons";
import JalaliDateInput from "../jalaliDateInput/jalaliDateInput";

/** Iran has had no daylight saving since 1401 — Tehran is always UTC+03:30. */
const TEHRAN_OFFSET = "+03:30";

/** ISO instant → Tehran wall clock: `{ date: "2026-10-10", time: "14:30" }`. */
function toTehran(value: string | null): { date: string; time: string } {
	if (!value) return { date: "", time: "" };
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return { date: "", time: "" };
	const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
		.formatToParts(d)
		.reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
	return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

const toIso = (date: string, time: string) => (date ? new Date(`${date}T${time || "00:00"}:00${TEHRAN_OFFSET}`).toISOString() : null);

type JalaliDateTimeInputProps = {
	/** ISO date-time (`startsAt`, `shippedAt`, …), `null` for none. */
	value: string | null;
	onChange: (iso: string | null) => void;
	/** Time used when only a date is typed (`"00:00"`, or `"23:59"` for an end). */
	defaultTime?: string;
	clearable?: boolean;
	disabled?: boolean;
	ariaLabel?: string;
};

/** `.jdt` — a Jalali date and a Tehran time; the value is the ISO instant the API takes. */
export default function JalaliDateTimeInput({ value, onChange, defaultTime = "00:00", clearable = true, disabled, ariaLabel = "تاریخ" }: JalaliDateTimeInputProps) {
	const [time, setTime] = useState(() => toTehran(value).time || defaultTime);
	const date = toTehran(value).date;

	return (
		<div className="jdt">
			<JalaliDateInput value={date} onChange={(d) => onChange(toIso(d, time))} aria-label={ariaLabel} disabled={disabled} />
			<input
				className="input t"
				type="time"
				aria-label={`ساعت ${ariaLabel}`}
				value={time}
				disabled={disabled}
				onChange={(e) => {
					setTime(e.target.value);
					if (date) onChange(toIso(date, e.target.value));
				}}
			/>
			{clearable && value && (
				<button type="button" className="icon-btn x" aria-label="پاک کردن تاریخ" onClick={() => onChange(null)} disabled={disabled}>
					<Icon name="close" />
				</button>
			)}
		</div>
	);
}
