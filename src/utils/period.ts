import { Tone } from "@/types/common.type";
import { formatDateTime } from "./format";

export type PeriodState = "upcoming" | "running" | "ended" | "always";

/** Where now falls in an optional `startsAt`–`endsAt` window (discount codes, campaigns, banners, announcements). */
export function periodState(startsAt: string | null | undefined, endsAt: string | null | undefined, now = Date.now()): PeriodState {
	if (startsAt && Date.parse(startsAt) > now) return "upcoming";
	if (endsAt && Date.parse(endsAt) <= now) return "ended";
	return startsAt || endsAt ? "running" : "always";
}

export const PERIOD_LABEL: Record<PeriodState, string> = { upcoming: "شروع نشده", running: "در جریان", ended: "تمام شده", always: "بدون محدودیت زمانی" };
export const PERIOD_TONE: Record<PeriodState, Tone> = { upcoming: "CREAM", running: "SUCCESS", ended: "DEFAULT", always: "DEFAULT" };

/** «از … تا …», «از …», «تا …» or «همیشه». */
export function periodText(startsAt: string | null | undefined, endsAt: string | null | undefined): string {
	if (startsAt && endsAt) return `${formatDateTime(startsAt)} تا ${formatDateTime(endsAt)}`;
	if (startsAt) return `از ${formatDateTime(startsAt)}`;
	if (endsAt) return `تا ${formatDateTime(endsAt)}`;
	return "همیشه";
}
