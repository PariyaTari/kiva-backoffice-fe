import Badge from "@/app/_components/ui/badge/badge";
import { Tone } from "@/types/common.type";
import { labelOf } from "@/utils/labels";

type StatusTagProps<K extends string> = {
	value: K | string | null | undefined;
	labels: Record<K, string>;
	tones?: Partial<Record<K, Tone>>;
	/** The server's own label / tone (orders send `statusLabel` / `statusTone`) win over the panel's maps. */
	label?: string | null;
	tone?: Tone | null;
};

/** A status as the design's `.tag` — Persian label and tone from the enum maps of `utils/labels`. */
export default function StatusTag<K extends string>({ value, labels, tones, label, tone }: StatusTagProps<K>) {
	if (!value) return <span className="muted">—</span>;
	return <Badge tone={tone ?? tones?.[value as K] ?? "DEFAULT"}>{label ?? labelOf(labels, value)}</Badge>;
}
