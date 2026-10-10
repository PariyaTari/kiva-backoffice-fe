const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Normalize Persian/Arabic digits in a string to ASCII digits (for parsing what the user typed). */
export function convertPersianToEnglishString(value: string): string {
	let result = value;
	for (let i = 0; i < 10; i++) {
		result = result.replace(new RegExp(PERSIAN_DIGITS[i], "g"), String(i)).replace(new RegExp(ARABIC_DIGITS[i], "g"), String(i));
	}
	return result;
}

/** ASCII → Persian digits, applied to any stringifiable value (data fields arrive with Latin digits). */
export function toPersianDigits(value: string | number): string {
	return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Keep only digits of a typed value (Persian/Arabic accepted) and echo them back in Persian — the design's numeric inputs. */
export function digitsOnly(value: string, maxLength?: number): { en: string; fa: string } {
	const en = convertPersianToEnglishString(value).replace(/\D/g, "").slice(0, maxLength);
	return { en, fa: toPersianDigits(en) };
}
