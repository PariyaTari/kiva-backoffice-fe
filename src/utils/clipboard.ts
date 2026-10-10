import { toast } from "@/store/notification.store";
import { convertPersianToEnglishString } from "@/utils/digits";

/** The design's `K.copy(text, label)` — copies (Latin digits) and confirms with a toast either way. */
export function copyText(text: string, label = "کپی شد") {
	const done = () => toast(`${label} ✓`, { icon: "copy" });
	if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(convertPersianToEnglishString(text)).then(done, done);
	else done();
}
