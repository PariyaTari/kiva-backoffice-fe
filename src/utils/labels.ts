import { Tone } from "@/types/common.type";

/*
 * Persian labels of the contract's enums (FEATURES §5). The server sends `statusLabel` / `statusTone` for orders;
 * everything else is named here. `Option` lists keep the enum order for selects and filters.
 */

type Labels<K extends string> = Record<K, string>;

export const optionsOf = <K extends string>(labels: Labels<K>) => (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));

/** Unknown value (a newer enum member) → the raw value instead of nothing. */
export const labelOf = <K extends string>(labels: Labels<K>, value: string | null | undefined) => (value ? (labels[value as K] ?? value) : "—");

// ── catalogue ──
export const PRODUCT_STATUS = { DRAFT: "پیش‌نویس", ACTIVE: "منتشرشده", ARCHIVED: "آرشیو" } as const;
export const PRODUCT_STATUS_TONE: Record<keyof typeof PRODUCT_STATUS, Tone> = { DRAFT: "WARN", ACTIVE: "SUCCESS", ARCHIVED: "DEFAULT" };
export const STOCK_STATUS = { IN_STOCK: "موجود", LOW_STOCK: "موجودی کم", OUT_OF_STOCK: "ناموجود" } as const;
export const STOCK_STATUS_TONE: Record<keyof typeof STOCK_STATUS, Tone> = { IN_STOCK: "SUCCESS", LOW_STOCK: "WARN", OUT_OF_STOCK: "DANGER" };
export const BAG_TYPE = {
	HOBO: "دوشی هوبو",
	CROSSBODY: "کراس‌بادی",
	BACKPACK: "کوله",
	SATCHEL: "دستی",
	CLUTCH: "کلاچ / مجلسی",
	TOTE: "شاپر / توت",
	BUCKET: "سطلی",
	WALLET: "کیف پول",
} as const;
export const MEDIA_VIEW = {
	FRONT: "نمای جلو",
	SIDE: "نمای کنار",
	BACK: "پشت",
	DETAIL: "جزئیات",
	INTERIOR: "داخل کیف",
	STYLE: "استایل",
	ON_MODEL: "روی مدل",
	SCALE: "مقایسه‌ی اندازه",
} as const;
export const MATERIAL_FAMILY = {
	GENUINE_LEATHER: "چرم طبیعی",
	FAUX_LEATHER: "چرم مصنوعی",
	CANVAS: "برزنت / کتان",
	SUEDE: "جیر",
	FAUX_SUEDE: "جیر مصنوعی",
	SATIN: "ساتن",
	VELVET: "مخمل",
	COTTON: "نخی",
	OTHER: "سایر",
} as const;
export const INVENTORY_REASON = {
	RESTOCK: "ورود کالا",
	STOCKTAKE: "شمارش انبار",
	DAMAGED: "آسیب‌دیده",
	RETURNED: "مرجوعی",
	MANUAL_CORRECTION: "اصلاح دستی",
} as const;
export const MEDIA_PURPOSE = {
	PRODUCT: "محصول",
	PRE_SHIPMENT: "عکس قبل از ارسال",
	BLOG: "بلاگ",
	BANNER: "بنر",
	CATEGORY: "دسته",
	TESTIMONIAL: "پیام رضایت",
} as const;

// ── orders ──
export const ORDER_STATUS = {
	PENDING_PAYMENT: "در انتظار پرداخت",
	PAYMENT_FAILED: "پرداخت ناموفق",
	EXPIRED: "منقضی",
	RESERVED: "رزرو شده",
	PROCESSING: "در حال آماده‌سازی",
	PHOTO_SENT: "عکس کیف ارسال شد",
	CHANGE_REQUESTED: "درخواست تغییر",
	SHIPPED: "در مسیر",
	DELIVERED: "تحویل شده",
	CANCELLED: "لغو شده",
	RETURN_REQUESTED: "درخواست مرجوعی",
	RETURNED: "مرجوع شد",
	REFUNDED: "وجه برگشت داده شد",
} as const;
export const ORDER_STATUS_TONE: Record<keyof typeof ORDER_STATUS, Tone> = {
	PENDING_PAYMENT: "WARN",
	PAYMENT_FAILED: "DANGER",
	EXPIRED: "DANGER",
	RESERVED: "CREAM",
	PROCESSING: "WARN",
	PHOTO_SENT: "DEFAULT",
	CHANGE_REQUESTED: "WARN",
	SHIPPED: "DEFAULT",
	DELIVERED: "SUCCESS",
	CANCELLED: "DANGER",
	RETURN_REQUESTED: "WARN",
	RETURNED: "DEFAULT",
	REFUNDED: "DEFAULT",
};
export const SHIPPING_METHOD = { TIPAX: "تیپاکس", POST: "پست", COURIER: "پیک" } as const;
export const MESSENGER = { RUBIKA: "روبیکا", TELEGRAM: "تلگرام", BALE: "بله" } as const;
export const SOCIAL_CHANNEL = { ...MESSENGER, INSTAGRAM: "اینستاگرام" } as const;
export const GATEWAY = { ZARINPAL: "زرین‌پال", SAMAN: "بانک سامان", MELLAT: "بانک ملت" } as const;
export const PAYMENT_STATUS = {
	PENDING: "در انتظار",
	SUCCEEDED: "موفق",
	FAILED: "ناموفق",
	CANCELLED: "انصراف",
	EXPIRED: "منقضی",
	REFUNDED: "برگشت داده شد",
} as const;
export const PAYMENT_STATUS_TONE: Record<keyof typeof PAYMENT_STATUS, Tone> = {
	PENDING: "WARN",
	SUCCEEDED: "SUCCESS",
	FAILED: "DANGER",
	CANCELLED: "DEFAULT",
	EXPIRED: "DANGER",
	REFUNDED: "DEFAULT",
};
export const CANCEL_REASON = {
	CHANGED_MIND: "منصرف شدم",
	NOT_AS_PICTURED: "شبیه عکس نبود",
	ORDERED_BY_MISTAKE: "اشتباهی سفارش دادم",
	FOUND_CHEAPER: "ارزان‌تر پیدا کردم",
	DELIVERY_TOO_LONG: "ارسال طول می‌کشد",
	OTHER: "دلیل دیگر",
} as const;
export const REFUND_METHOD = { ORIGINAL_PAYMENT: "به همان کارت", BANK_TRANSFER: "انتقال بانکی (شبا)", STORE_CREDIT: "اعتبار کیوا" } as const;
export const REFUND_STATUS = { PENDING: "در انتظار", PROCESSING: "در حال انجام", COMPLETED: "انجام شد", FAILED: "ناموفق" } as const;
export const REFUND_STATUS_TONE: Record<keyof typeof REFUND_STATUS, Tone> = { PENDING: "WARN", PROCESSING: "WARN", COMPLETED: "SUCCESS", FAILED: "DANGER" };
export const MEDIA_STATUS = { WAITING: "منتظر عکس", SENT: "ارسال شد", APPROVED: "تأیید مشتری", CHANGE_REQUESTED: "درخواست تغییر" } as const;
export const MEDIA_STATUS_TONE: Record<keyof typeof MEDIA_STATUS, Tone> = { WAITING: "DEFAULT", SENT: "CREAM", APPROVED: "SUCCESS", CHANGE_REQUESTED: "WARN" };
export const CHANGE_TYPE = { COLOR: "تغییر رنگ", MODEL: "مدل دیگر", CANCEL_ITEM: "حذف این کیف", OTHER: "چیز دیگر" } as const;

// ── returns ──
export const RETURN_REASON = {
	NOT_AS_PICTURED: "شبیه عکس نبود",
	MANUFACTURING_DEFECT: "ایراد ساخت",
	WRONG_ITEM: "کالای اشتباه",
	DAMAGED_IN_TRANSIT: "آسیب در ارسال",
	CHANGED_MIND: "منصرف شده",
	OTHER: "دلیل دیگر",
} as const;
/** Kiva's fault — the return shipping is on Kiva (FEATURES §3.6). */
export const KIVA_FAULT_REASONS = ["NOT_AS_PICTURED", "MANUFACTURING_DEFECT", "WRONG_ITEM", "DAMAGED_IN_TRANSIT"];
export const RETURN_STATUS = {
	REQUESTED: "درخواست شده",
	APPROVED: "تأیید شد",
	REJECTED: "رد شد",
	PICKUP_SCHEDULED: "در حال جمع‌آوری",
	RECEIVED: "رسیده به انبار",
	REFUNDED: "وجه برگشت داده شد",
	CLOSED: "بسته شد",
} as const;
export const RETURN_STATUS_TONE: Record<keyof typeof RETURN_STATUS, Tone> = {
	REQUESTED: "WARN",
	APPROVED: "SUCCESS",
	REJECTED: "DANGER",
	PICKUP_SCHEDULED: "CREAM",
	RECEIVED: "DEFAULT",
	REFUNDED: "SUCCESS",
	CLOSED: "DEFAULT",
};

// ── marketing / content ──
export const BANNER_PLACEMENT = {
	HOME_HERO: "هیروی صفحه‌ی اصلی",
	HOME_PROMO: "بنر تبلیغاتی خانه",
	SHOP_TOP: "بالای فروشگاه",
	PRODUCT_SIDEBAR: "کنار محصول",
	BLOG_TOP: "بالای بلاگ",
} as const;
export const BANNER_THEME = { CREAM: "کرم", PURPLE: "بنفش", LILAC: "یاسی", DARK: "تیره", WHITE: "سفید" } as const;
export const DISCOUNT_TYPE = { PERCENT: "درصدی", FIXED: "مبلغ ثابت" } as const;
export const BLOG_STATUS = { DRAFT: "پیش‌نویس", PUBLISHED: "منتشرشده", ARCHIVED: "آرشیو" } as const;
export const BLOG_STATUS_TONE: Record<keyof typeof BLOG_STATUS, Tone> = { DRAFT: "WARN", PUBLISHED: "SUCCESS", ARCHIVED: "DEFAULT" };
export const BLOG_BLOCK = {
	HEADING: "تیتر",
	PARAGRAPH: "پاراگراف",
	QUOTE: "نقل‌قول",
	TIP: "نکته",
	PRODUCT: "کارت محصول",
	IMAGE: "عکس",
	LIST: "لیست",
} as const;

// ── support ──
export const REVIEW_STATUS = { PENDING: "در انتظار تأیید", APPROVED: "تأیید شد", REJECTED: "رد شد" } as const;
export const REVIEW_STATUS_TONE: Record<keyof typeof REVIEW_STATUS, Tone> = { PENDING: "WARN", APPROVED: "SUCCESS", REJECTED: "DANGER" };
export const CONTACT_TOPIC = {
	ORDER_FOLLOWUP: "پیگیری سفارش",
	PRODUCT_QUESTION: "سؤال درباره‌ی محصول",
	RETURN: "بازگشت کالا",
	COLLABORATION: "همکاری",
	OTHER: "سایر",
} as const;
export const TICKET_STATUS = { OPEN: "باز", IN_PROGRESS: "در حال پیگیری", CLOSED: "بسته" } as const;
export const TICKET_STATUS_TONE: Record<keyof typeof TICKET_STATUS, Tone> = { OPEN: "WARN", IN_PROGRESS: "CREAM", CLOSED: "DEFAULT" };
export const REPLY_CHANNEL = { SMS: "پیامک", EMAIL: "ایمیل" } as const;

// ── settings ──
export const WEEKDAY = {
	SATURDAY: "شنبه",
	SUNDAY: "یکشنبه",
	MONDAY: "دوشنبه",
	TUESDAY: "سه‌شنبه",
	WEDNESDAY: "چهارشنبه",
	THURSDAY: "پنجشنبه",
	FRIDAY: "جمعه",
} as const;

// ── product specs ──
export const CLOSURE_TYPE = {
	ZIPPER: "زیپ فلزی",
	DOUBLE_ZIPPER: "زیپ دوطرفه",
	ZIPPER_WITH_DECORATIVE_LOCK: "زیپ + قفل تزئینی",
	MAGNETIC_FLAP: "درب مگنتی",
	MAGNETIC_SNAP: "دکمه مگنتی",
	DRAWSTRING: "بند کشی",
	METAL_BUTTON: "دکمه فلزی",
	OPEN_TOP: "بدون درب",
} as const;
export const STRAP_TYPE = {
	SHOULDER: "دوشی",
	CROSSBODY: "کراس (بلند)",
	TOP_HANDLE: "دسته‌ی دستی",
	CHAIN: "زنجیر",
	BACKPACK_STRAPS: "بند کوله",
	WRISTLET: "مچی",
	NONE: "بدون بند",
} as const;
export const OCCASION = {
	DAILY: "روزمره",
	UNIVERSITY: "دانشگاه",
	WORK: "محل کار",
	FORMAL: "رسمی",
	PARTY: "مهمانی",
	TRAVEL: "سفر",
	SHOPPING: "خرید",
	GATHERING: "دورهمی",
} as const;
export const PRODUCT_SORT = {
	updated: "آخرین ویرایش",
	newest: "جدیدترین",
	name: "نام",
	price_asc: "ارزان‌ترین",
	price_desc: "گران‌ترین",
	bestselling: "پرفروش‌ترین",
	stock_asc: "کمترین موجودی",
} as const;
