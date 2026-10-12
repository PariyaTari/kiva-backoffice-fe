# پنل ادمین کیوا (`kiva-backoffice-fe`) — نقشه‌ی کار و گزارش پیشرفت

> شروع: ۱۸ مهر ۱۴۰۵ (2026-10-10)
> مسیر: `D:\pariya\kiva-backoffice-fe`
> مراجع: **`D:\pariya\kiva-backoffice-fe\kiva-openapi.yml` (1.5.0)** از جلسه‌ی ۳ (کپی یکسان در `kiva-fe`؛ نسخه‌ی 1.4.0 در git فروشگاه)، بخش `/admin/*` · `D:\pariya\kiva-fe\docs\FEATURES.md` (بخش‌های پنل، نقش‌ها، چرخه‌ها، شکاف‌ها) · `D:\pariya\kiva-fe\README.md`
> ساختار کد: عین `kiva-fe` (Next.js 16 App Router، TS، Tailwind 3، TanStack Query v5، Zustand، axios). فچ: اسکیل `data-fetching` (+ `error-ui`). ظاهر: دیزاین‌سیستم کیوا (`src/tailwind/kiva/*` = `kiva/assets/kiva.css`) و الگوی پنل حساب کاربری فروشگاه (`account.html`: منوی کناری `.snav`، کارت‌ها، `.seg`، `.tag`، مودال، توست).

> **وضعیت (جلسه‌ی ۳، در حال انجام):** فازهای ۰ تا ۱۱ انجام و تست شده (جلسه‌ی ۱ و ۲؛ کاربر تا `c609eab` کامیت کرده). کانترکت به **1.5.0** رسید و بیشتر شکاف‌های §۷ را پر کرد ← **فاز ۱۲**. کار بعدی = اولین ردیف ⬜/🔶 جدول فاز ۱۲.

## ⏯ ادامه در چت جدید — اول این را بخوان

1. همین فایل را بخوان؛ جدول «وضعیت» پایین می‌گوید کار بعدی چیست. بخش «گزارش جلسه‌ها» جزئیات کارهای انجام‌شده است.
2. قراردادها و تصمیم‌های ثابت در بخش «تصمیم‌ها» است — دوباره بحثشان نکن.
3. هر قدم که تمام شد: تیک جدول + یک خط در «گزارش جلسه‌ها». کامیت را کاربر خودش می‌زند.
4. قبل از اعلام پایان هر قدم: `npx tsc --noEmit` و `npx eslint src mock`؛ در پایان هر فاز `npx next build`.

---

## تصمیم‌ها (ثابت)

| موضوع | تصمیم |
|---|---|
| پورت‌ها | پنل `3200` (`bo-dev`)، mock ادمین `8090` (`bo-mock`) — فروشگاه 3100/8080 را دست نمی‌زنیم |
| ورود | همان OTP فروشگاه (`/auth/otp/send` ← `/auth/otp/verify`)، بدون مرحله‌ی نام. access token فقط در حافظه، کوکی `kiva_rt`، نشانه‌ی **`kiva-bo-session`** در localStorage (جدا از فروشگاه)، قفل `navigator.locks` با نام `kiva-bo-refresh` |
| نقش‌ها | منو و دکمه‌ها از `user.roles` (فقط نمایش). کسی که هیچ نقش پنل ندارد بعد از ورود صفحه‌ی «دسترسی نداری» + خروج می‌بیند. `403 FORBIDDEN` در هر کوئری ← بلوک «به این بخش دسترسی نداری» بدون بیرون کردن |
| داده | `useQuery`/`useMutation` مستقیم در کامپوننت، `withMappedError` روی هر fn، کلید `[حوزه, منبع, پارامترها]`، بدون کش و retry، `keepPreviousData` برای صفحه‌بندی/جستجو، `invalidateQueries` بعد از هر میوتیشن، خطای کوئری با `toErrorView(ERROR_BEHAVIOUR, …)` + `ErrorComponent2`، خطای میوتیشن با toast (`meta.showNotification`) یا inline برای «جواب»ها |
| جدول | `useTableState` (`src/hooks/useTableState.ts`، طبق اسکیل) + کامپوننت `DataTable` ساده (فقط مارک‌آپ، بدون کوئری) + `Pager` |
| فیلترها | در URL (`useSearchParams`) تا لینک‌پذیر و قابل برگشت باشند |
| ظاهر | پوسته: سایدبار راست (لوگو، کارت کاربر `.ucard`، منوی گروه‌بندی‌شده `.snav` با شمارنده‌ی صف‌ها)، نوار بالا (عنوان، breadcrumb، دکمه‌های صفحه). کلاس‌های دیزاین‌سیستم عیناً؛ چیزهای جدید پنل (جدول، فیلتربار، آپلودر، …) در `src/tailwind/admin/*.css` با همان توکن‌ها |
| تاریخ | ورودی/نمایش شمسی (`Intl` با `fa-IR-u-ca-persian`)، ارسال ISO. ورودی تاریخ شمسی ساده (روز/ماه/سال + ساعت) — بدون کتابخانه |
| پول | عدد صحیح تومان؛ ورودی با جداکننده‌ی هزارگان و رقم فارسی |
| شکاف‌های کانترکت | (FEATURES §۷) جایی که لیست ادمین نیست از endpoint عمومی می‌خوانیم و در UI یادداشت می‌گذاریم: بلاگ (`GET /blog/posts`، فقط منتشرشده‌ها)، پیام رضایت (`GET /testimonials`)، FAQ (`GET /faq`)، صفحات (`GET /pages/{slug}` با لیست slugهای شناخته‌شده)، نوار اطلاعیه (`GET /config` اگر بود، وگرنه فرم خالی)، رنگ/متریال (`GET /colors`، `GET /materials`)، دسته‌ی بلاگ (`GET /blog/categories`). endpointهای ناموجود را **نمی‌سازیم** و دکمه‌اش را نمی‌گذاریم |
| Mock | `mock/` (Node خالص، بدون وابستگی) — `server.mjs` (راه‌انداز)، `lib.mjs` (خطا، router، صفحه‌بندی)، `db.mjs` (داده‌ی حافظه‌ای، از `data.mjs` فروشگاه)، `auth.mjs` (ورود، کوکی، `staff(ctx, ...roles)` برای `x-roles`)، `media.mjs` (آپلود)، `admin/<area>.mjs` (هر فاز یک فایل، ثبت در `admin/index.mjs`). نام کوکی mock پیش‌فرض **`kiva_bo_rt`** است (`MOCK_COOKIE`) چون کوکی به پورت حساس نیست و با mock فروشگاه (8080) قاطی می‌شد؛ فرانت اسم کوکی را نمی‌داند |

**کاربرهای آزمایشی mock** (کد OTP: هر ۵ رقم؛ `00000` اشتباه، `11111` منقضی):

| شماره | نقش |
|---|---|
| `09120000001` | `ADMIN` |
| `09120000002` | `CATALOG_MANAGER` |
| `09120000003` | `OPERATOR` |
| `09120000004` | `CONTENT_EDITOR` |
| `09120000005` | `SUPPORT` |
| هر شماره‌ی دیگر | `CUSTOMER` ← «دسترسی نداری» |

---

## ساختار پروژه

```
kiva-backoffice-fe/
├── docs/PLAN.md                 — همین فایل
├── mock/server.mjs، data.mjs    — بک‌اند آزمایشی
├── public/fonts                 — Yekan Bakh (کپی از kiva-fe)
└── src/
    ├── app/
    │   ├── layout.tsx           — QueryProvider، SessionProvider، Notifications
    │   ├── queryProvider.tsx، sessionProvider.tsx
    │   ├── (auth)/login         — ورود OTP
    │   ├── (panel)/layout.tsx   — پوسته‌ی پنل (سایدبار + گارد ورود و نقش)
    │   ├── (panel)/<section>/   — هر بخش: page.tsx، _api/<x>Endpoints.ts، _components/<name>/<name>.tsx، _types، _utils/apiError.ts
    │   └── _components/         — ui (کپی + جدید)، common، icon، panel (shell، sidebar، pageHead، dataTable، pager، filterBar، mediaUploader، …)
    ├── config/  httpClient/  hooks/  store/  types/  utils/
    └── tailwind/kiva/*.css (کپی)، tailwind/components.css (کپی)، tailwind/admin/*.css (جدید)
```

**مسیرها:**

| مسیر | بخش | نقش‌ها |
|---|---|---|
| `/login` | ورود | — |
| `/` | داشبورد (گزارش) — برای غیر ADMIN: میان‌بر صف‌ها | ADMIN (گزارش) |
| `/orders`، `/orders/[code]` | سفارش‌ها | ADMIN، OPERATOR |
| `/returns` | مرجوعی‌ها | ADMIN، OPERATOR |
| `/products`، `/products/new`، `/products/[id]` | محصولات و ورینت‌ها | ADMIN، CATALOG_MANAGER |
| `/inventory` | تاریخچه‌ی موجودی | ADMIN، CATALOG_MANAGER |
| `/categories`، `/colors`، `/materials` | طبقه‌بندی | ADMIN، CATALOG_MANAGER |
| `/discount-codes` | کدهای تخفیف | ADMIN |
| `/campaigns`، `/banners`، `/announcements`، `/testimonials` | بازاریابی | ADMIN، CONTENT_EDITOR |
| `/blog`، `/blog/new`، `/blog/[id]`، `/faq`، `/pages` | محتوا | ADMIN، CONTENT_EDITOR |
| `/reviews`، `/contact-messages`، `/customers` | پشتیبانی | ADMIN، SUPPORT (نقش‌دادن فقط ADMIN) |
| `/settings` | تنظیمات | ADMIN |

---

## وضعیت (جدول کارها)

علامت‌ها: ⬜ مانده · 🔶 در حال انجام · ✅ انجام و تست شد

### فاز ۰ — پایه‌ی پروژه
| # | کار | وضعیت |
|---|---|---|
| 0.1 | ساخت پروژه: `package.json`، tsconfig، eslint، postcss، tailwind، next.config، `.gitignore`، `.env`، `.claude/launch.json`، `npm install` | ✅ |
| 0.2 | دیزاین‌سیستم: `tailwind/kiva/*`، `components.css`، `globals.css` + فونت‌ها، آیکن، لوگو | ✅ |
| 0.3 | زیرساخت: `httpClient` (بدون سبد)، `session.ts`، `mapError`، utils (apiError، withMappedError، digits، format، jalali، normalizePhone، otp، validators، generateId، clipboard)، types، stores (auth با نشانه‌ی `kiva-bo-session`، notification)، `queryProvider` | ✅ |
| 0.4 | کامپوننت‌های ui/common کپی‌شده (button، input، select، textarea، checkbox، switch، modal، multiSelect، otpInput، badge، card، errorComponent2، loading، notifications، documentTitle) | ✅ |
| 0.5 | کامپوننت‌های پایه‌ی پنل: `useTableState`، `useUrlFilters`، `DataTable` + `TableEmpty`، `TableFooter` (pager)، `SearchInput` (debounce)، `PageHead`، `StatusTag`، `ConfirmModal`، `ModalHead`، CSS پنل (`tailwind/admin/*`) ✅ — فرم‌ها (`MoneyInput`، `JalaliDateTimeInput`، `ChipsInput`، `SeoFields`، `MediaUploader`) در اولین فازی که لازم‌اند ساخته می‌شوند (۲ و ۳) | ✅ |

### فاز ۱ — ورود و پوسته
| # | کار | وضعیت |
|---|---|---|
| 1.1 | mock: سرور، کاربرهای نقش‌دار، OTP، کوکی چرخشی، `/me`، `/auth/*`، CORS با credentials، `POST /admin/media` | ✅ |
| 1.2 | `SessionProvider` + صفحه‌ی `/login` (شماره ← کد، خطاهای OTP، تایمر) | ✅ |
| 1.3 | پوسته‌ی پنل: گارد ورود، سایدبار نقش‌محور، نوار بالا، خروج، صفحه‌ی «دسترسی نداری» (بدون نقش پنل)، `not-found`، `error` — شمارنده‌ی صف‌ها در سایدبار (منتظر عکس، مرجوعی تازه، نظر منتظر، پیام باز) در جلسه‌ی ۱ بعد از فاز ۶ وصل شد | ✅ |
| 1.4 | `utils/roles.ts` + `hooks/useCan.ts`: نگاشت بخش ← نقش‌ها (FEATURES §۱.۱)؛ برچسب فارسی enumها `utils/labels.ts` (FEATURES §۵) | ✅ |

### فاز ۲ — سفارش‌ها و مرجوعی (OPERATOR)
| # | کار | وضعیت |
|---|---|---|
| 2.1 | mock: سفارش‌ها در همه‌ی وضعیت‌ها، `GET /admin/orders` با فیلترها و `statusCounts`، جزئیات، همه‌ی کارها (`mock/catalog.mjs` + `mock/admin/orders.mjs`) | ✅ |
| 2.2 | `/orders`: تب وضعیت با شمارنده، جستجو، فیلترها (روش ارسال، رزرو، منتظر عکس، بازه‌ی تاریخ)، جدول، صفحه‌بندی | ✅ |
| 2.3 | `/orders/[code]`: خلاصه، کالاها، مشتری، آدرس، پرداخت‌ها، استردادها، گروه ارسال رزرو، یادداشت‌ها، عکس قبل از ارسال و پاسخ مشتری | ✅ |
| 2.4 | کارهای سفارش: تغییر وضعیت (`allowedTransitions`)، عکس قبل از ارسال (آپلود ← اتصال به قلم ← ارسال)، ثبت ارسال، یادداشت، استرداد (فقط ADMIN) | ✅ |
| 2.5 | `/returns`: لیست با فیلتر وضعیت + مودال تصمیم (تأیید/رد، هزینه‌ی برگشت، راهنما، دلیل رد) | ✅ |

### فاز ۳ — کاتالوگ (CATALOG_MANAGER)
| # | کار | وضعیت |
|---|---|---|
| 3.1 | mock: محصولات/ورینت‌ها/موجودی/مدیا/دسته/رنگ/متریال | ✅ |
| 3.2 | `/products`: جستجو، وضعیت، دسته، موجودی، مرتب‌سازی، جدول با موجودی دقیق | ✅ |
| 3.3 | فرم محصول (ساخت/ویرایش): همه‌ی فیلدهای `ProductUpsertRequest`، `specs`، highlights، تگ‌ها، SEO؛ `If-Match`/etag و `412`/`409`؛ تغییر وضعیت و انتشار زمان‌بندی‌شده؛ آرشیو | ✅ |
| 3.4 | ورینت‌ها: افزودن/ویرایش/غیرفعال، مدیا با `view`، ترتیب، اصلی، alt؛ آمار (بازدید، نرخ تبدیل، مشترکین «موجود شد») | ✅ |
| 3.5 | موجودی: مودال تغییر موجودی (delta، دلیل، یادداشت) + `/inventory` تاریخچه | ✅ |
| 3.6 | `/categories` (لیست، ساخت، ویرایش، حذف با `409`)، `/colors` (لیست از `GET /colors`، ساخت، ویرایش)، `/materials` (لیست از `GET /materials`، ساخت) | ✅ |

### فاز ۴ — بازاریابی
| # | کار | وضعیت |
|---|---|---|
| 4.1 | mock: کد تخفیف، کمپین، بنر، اطلاعیه، پیام رضایت | ✅ |
| 4.2 | `/discount-codes`: لیست (فیلتر فعال)، فرم کامل با شرط‌ها، آمار استفاده، غیرفعال‌سازی | ✅ |
| 4.3 | `/campaigns`: لیست، فرم (بازه، محصولات، فعال) | ✅ |
| 4.4 | `/banners`: لیست بر اساس جایگاه، فرم با پیش‌نمایش تم و عکس | ✅ |
| 4.5 | `/announcements`: ویرایش کل لیست مرتب (افزودن، حذف، جابه‌جایی) | ✅ |
| 4.6 | `/testimonials`: لیست، فرم (منبع، پیام، اسکرین‌شات، محصول و رنگ) | ✅ |

### فاز ۵ — محتوا
| # | کار | وضعیت |
|---|---|---|
| 5.1 | mock: بلاگ، FAQ، صفحات ثابت | ✅ |
| 5.2 | `/blog`: لیست + فرم مقاله با ویرایشگر بلوکی (تیتر، پاراگراف، نقل‌قول، نکته، محصول، عکس، لیست) + SEO | ✅ |
| 5.3 | `/faq`: ویرایش گروه‌ها و سؤال‌ها با ترتیب و ذخیره‌ی کل | ✅ |
| 5.4 | `/pages`: لیست slugهای شناخته‌شده + ویرایش (عنوان، HTML، SEO) | ✅ |

### فاز ۶ — پشتیبانی
| # | کار | وضعیت |
|---|---|---|
| 6.1 | mock: نظرات، پیام‌های تماس، مشتریان و نقش‌ها | ✅ |
| 6.2 | `/reviews`: صف با فیلتر (وضعیت، محصول، پاسخ دارد)، تأیید/رد با پاسخ، ویرایش/حذف «پاسخ کیوا» | ✅ |
| 6.3 | `/contact-messages`: لیست با فیلتر وضعیت/موضوع، پاسخ (SMS/EMAIL)، یادداشت داخلی، تغییر وضعیت | ✅ |
| 6.4 | `/customers`: جستجو، لیست، لینک به سفارش‌های مشتری، تعیین نقش‌ها (فقط ADMIN؛ `ROLE_CHANGE_NOT_ALLOWED` برای خود) | ✅ |

### فاز ۷ — تنظیمات و داشبورد
| # | کار | وضعیت |
|---|---|---|
| 7.1 | mock: تنظیمات و گزارش | ✅ |
| 7.2 | `/settings`: ارسال، ارسال رایگان، رزرو، بازگشت، موجودی کم، مهلت‌ها، جمعه‌ها، پشتیبانی، شبکه‌ها، درگاه‌ها، آمار سایت | ✅ |
| 7.3 | داشبورد `/`: بازه‌ی تاریخ، کارت‌های شاخص، نمودار روزانه (SVG)، ترکیب ارسال و پیام‌رسان، پرفروش‌ها؛ برای نقش‌های دیگر: کارت‌های صف کاری | ✅ |

### فاز ۸ — جمع‌بندی
| # | کار | وضعیت |
|---|---|---|
| 8.1 | واکنش‌گرایی (۱۳۶۶ و ۳۷۵)، دسترسی‌پذیری، حالت‌های خالی | ✅ |
| 8.2 | `README.md` پروژه، `tsc` + `eslint` + `next build`، تست نهایی با mock برای هر نقش | ✅ |

### فاز ۹ — بهبودها (جلسه‌ی ۲؛ از «کارهای باز»)
| # | کار | وضعیت |
|---|---|---|
| 9.1 | ممیزی پوشش: هر ۶۰ متد `/admin/*` کانترکت 1.4.0 در `_api/*Endpoints.ts` صدا زده می‌شود + بخش‌های FEATURES §۱.۱ همه صفحه دارند؛ `tsc`/`eslint` روی کامیت `d5e82e2` پاس | ✅ |
| 9.2 | ورینت جایگزین درخواست تغییر در صفحه‌ی سفارش با نام/رنگ/موجودی به‌جای `#id`: رنگ ← `GET /products/{productId}` (عمومی، همه‌ی نقش‌ها)، مدل ← `GET /products/{productId}/related` (همان منبعی که فروشگاه از آن انتخاب می‌کند)؛ پیدا نشد ← همان `#id`. mock: `GET /products/{idOrSlug}` و `/related` | ✅ |
| 9.3 | پیش‌نمایش HTML کنار ویرایشگر (توضیح محصول، پاراگراف بلاگ، صفحه‌ی ثابت) — کامپوننت مشترک `HtmlField` (تب «ویرایش/پیش‌نمایش»، پاک‌سازی ساده‌ی تگ‌های خطرناک فقط برای نمایش) | ✅ |
| 9.4 | هشدار «تغییرات ذخیره نشده» برای فرم‌های بلند (محصول، مقاله، صفحه، تنظیمات، FAQ، اطلاعیه): `beforeunload` + تأیید هنگام کلیک روی لینک‌های داخلی پنل — کامپوننت مشترک `UnsavedGuard` | ✅ |
| 9.5 | چاپ برگه‌ی بسته‌بندی سفارش (دکمه‌ی «چاپ» در جزئیات سفارش؛ CSS `@media print` بدون endpoint جدید: کد، گیرنده، آدرس، کالاها با رنگ و تعداد، یادداشت مشتری) | ✅ |
| 9.6 | جمع‌بندی: `tsc` + `eslint` + `next build`، تست مرورگر با mock، به‌روزرسانی README و همین فایل | ✅ |

### فاز ۱۰ — سرعت کار روزانه (جلسه‌ی ۲)
| # | کار | وضعیت |
|---|---|---|
| 10.1 | جستجوی سریع سراسری در نوار بالا (`Ctrl+K` یا `/`): سفارش (کد/موبایل/نام)، محصول (نام/SKU)، مشتری (موبایل/نام) — فقط بخش‌هایی که نقش اجازه دارد؛ هر بخش یک `useQuery` تایپی با `signal` و debounce؛ کلیدهای بالا/پایین/Enter؛ رفتن به صفحه‌ی همان مورد | ✅ |
| 10.2 | شمارنده‌های زنده: `refetchInterval` (۶۰ ثانیه، فقط وقتی تب دیده می‌شود) روی شمارنده‌های سایدبار/کارت‌های صف داشبورد + نشانه‌ی «سفارش تازه رسید» در `/orders` (کد جدیدترین سفارش با بار اول صفحه مقایسه می‌شود) | ✅ |
| 10.3 | جمع‌بندی فاز ۱۰: `tsc` + `eslint` + `next build`، تست، README و همین فایل | ✅ |

### فاز ۱۱ — کار گروهی روی صف سفارش (جلسه‌ی ۲)
| # | کار | وضعیت |
|---|---|---|
| 11.1 | انتخاب ردیف در `/orders` (ستون چک‌باکس + «همه‌ی این صفحه»؛ انتخاب بین صفحه‌ها می‌ماند؛ سفارش پرداخت‌نشده/لغوشده انتخاب‌شدنی نیست) + نوار «n سفارش انتخاب شده» | ✅ |
| 11.2 | چاپ گروهی برگه‌ی ارسال: `useMutation` که جزئیات انتخاب‌شده‌ها را یکی‌یکی می‌خواند ← هر سفارش یک صفحه‌ی A5 (`break-after:page`) ← `window.print()`؛ `PackingSlip` به `SlipSheet` + `PackingSlips` (پورتال) شکسته می‌شود و صفحه‌ی جزئیات هم از همان استفاده می‌کند | ✅ |
| 11.3 | خروجی CSV لیست سفارش با همان فیلترها (`useMutation` که صفحه‌ها را با `size=100` تا سقف ۲۰۰۰ ردیف می‌خواند؛ BOM برای اکسل؛ برچسب‌های فارسی؛ تاریخ شمسی) | ✅ |
| 11.4 | جمع‌بندی فاز ۱۱: `tsc` + `eslint` + `next build`، تست، README و همین فایل | ✅ |

### فاز ۱۲ — کانترکت 1.5.0 (جلسه‌ی ۳)
تغییرات 1.4.0 ← 1.5.0 (با `git diff kiva-openapi.yml` در `kiva-fe`): ۱۸ endpoint تازه‌ی `/admin/*`، هیچ حذفی؛ کدهای خطای `IN_USE` (`meta.productCount`) و `BALANCE_DUE` (`meta.balanceDue`)؛ لاگ تغییرات برای هر نوشتن موفق.

| # | کار | وضعیت |
|---|---|---|
| 12.1 | **درخواست تغییر:** `POST /admin/orders/{code}/change-request/resolution` (`APPLY`/`REJECT`، ورینت دیگر، `note`، `notifyCustomer`) — مودال از کارت عکس قبل از ارسال؛ نمایش `feedback.resolution`؛ `totals.balanceDue` در کارت مبلغ و جدول سفارش؛ ثبت ارسال با `BALANCE_DUE` ← پیام؛ برداشتن هشدار شکاف §۷ #۷؛ «تغییر وضعیت» دیگر از `CHANGE_REQUESTED` جز لغو نمی‌برد. mock | ✅ |
| 12.2 | **پیگیری استرداد** (فقط ADMIN): `PATCH /admin/refunds/{id}` (در حال انجام / انجام شد با شماره‌ی پیگیری / ناموفق + یادداشت برای مشتری)؛ `Refund.returnId/createdAt/statusNote`. mock | ✅ |
| 12.3 | **چرخه‌ی کامل مرجوعی:** `AdminReturnRequest` (مشتری، شبا، `pickup`، `receipt`، `allowedTransitions`، دلیل رد/بستن)؛ در `/returns`: زمان‌بندی جمع‌آوری (`PUT …/pickup`)، رسیدن به انبار با تعداد برگشتی به موجودی (`POST …/receipt`)، بستن بدون استرداد (`POST …/close`)، ثبت استرداد با `returnId` (ADMIN)؛ تب‌های وضعیت؛ برداشتن هشدار §۷ #۸. mock | ✅ |
| 12.4 | **کاتالوگ:** `AdminCategory.imageMediaId` در فرم دسته؛ حذف رنگ (`IN_USE`)؛ متریال‌ها از `GET /admin/materials` + ویرایش + حذف؛ برداشتن هشدارهای §۷ #۶. mock | ✅ |
| 12.5 | **صف «موجود شد خبرم کن»** `/stock-alerts` (ADMIN، CATALOG_MANAGER): `GET /admin/stock-alerts` (فیلتر محصول و «هنوز ناموجود»)، لینک به محصول و مودال موجودی؛ منو. mock | ⬜ |
| 12.6 | **بازاریابی:** کمپین با `AdminCampaign.productIds` + حذف؛ اطلاعیه از `GET /admin/announcements` (زمان‌بندی‌شده‌ها دیگر پاک نمی‌شوند)؛ پیام رضایت از `GET /admin/testimonials` (منتشرنشده‌ها، فیلتر، صفحه‌بندی، `screenshotMediaId`)؛ برداشتن هشدارهای شکاف. mock | ⬜ |
| 12.7 | **محتوا:** FAQ از `GET /admin/faq/groups`؛ صفحه‌ها از `GET /admin/pages` (به‌جای slugهای شناخته‌شده). mock | ⬜ |
| 12.8 | **مشترکین خبرنامه** `/newsletter` (فقط ADMIN): `GET /admin/newsletter/subscriptions` (وضعیت، جستجوی ایمیل، شمار فعال‌ها، CSV). mock | ⬜ |
| 12.9 | **صفحه‌ی مشتری** `/customers/[id]`: `GET /admin/customers/{id}` (پروفایل، آدرس‌ها، آخرین سفارش‌ها، نقش‌ها)؛ لینک از لیست مشتری، جستجوی سریع، سفارش و مرجوعی. mock | ⬜ |
| 12.10 | **لاگ تغییرات** `/audit-log` (فقط ADMIN): فیلتر نوع/شناسه/کاربر/بازه، ردیف با «از ← به»؛ کارت «تاریخچه‌ی تغییرات» در صفحه‌ی سفارش و محصول برای ADMIN. mock که هر نوشتن موفق را ثبت می‌کند | ⬜ |
| 12.11 | جمع‌بندی: نقش‌ها/منو، README، «کارهای باز» (شکاف‌های باقی‌مانده)، `tsc` + `eslint` + `next build`، تست نقش‌ها | ⬜ |

---

## گزارش جلسه‌ها

### جلسه‌ی ۱ (۱۸ مهر ۱۴۰۵)
- خواندن `kiva-fe` (README، FEATURES، کانترکت، ساختار، httpClient، session، apiError، دیزاین‌سیستم، پنل حساب) و اسکیل `data-fetching`. نوشتن همین نقشه.
- **فاز ۰ و ۱ انجام شد.** کپی از kiva-fe: configها، `tailwind/kiva` (بدون header/drawers/search/productCard/footer/range/reveal/responsive)، httpClient (بدون سبد و `nextApiClient`؛ پاسخ حالا `headers` هم دارد برای `ETag`)، utils، ui. تغییرها: `ErrorComponent2` دکمه‌ی تیکت = «کپی برای تیم فنی» (متن خطا + کد پیگیری)؛ آیکن‌های جدید `gear chart users file layers drag up external`؛ دکمه‌ی `.btn-danger`؛ `types/common.type.ts` (Money، Tone، MediaAsset، SeoMeta، کانال‌ها).
- ساختار پنل: `src/app/(auth)/login` (شماره ← کد، بدون مرحله‌ی نام)، `src/app/(panel)/layout.tsx` (پوسته + `<Suspense>`)، `(panel)/_components/{panelShell,sidebar,noAccess}`، `(panel)/_api/panelEndpoints.ts` (`getMe`، `logout`، `uploadMedia`)، `src/app/_components/panel/*` (کامپوننت‌های مشترک پنل).
- **اجرا در این ماشین:** چون پنل مرورگر از `.claude/launch.json` ِ `kiva-fe` می‌خواند، دو ورودی `bo-mock` (8090) و `bo-dev` (3200، `npm --prefix D:/pariya/kiva-backoffice-fe run dev`) به **`kiva-fe/.claude/launch.json`** اضافه شد (فایل tracked است — اگر نمی‌خواهی، حذفش کن؛ `kiva-backoffice-fe/.claude/launch.json` هم همین‌ها را دارد).
- تست (پنل مرورگر مخفی، با JS): `/` ← `/login?next=/`؛ ارسال کد، `00000` («کد اشتباهه. ۴ بار دیگه…»)، کد درست ← پنل با منوی کامل ADMIN؛ رفرش کامل ← نشست با `auth/refresh` برگشت؛ خروج ← `/login` و نشانه پاک؛ شماره‌ی مشتری ← «به پنل مدیریت دسترسی نداری». `tsc` و `eslint` پاس.
- **فاز ۲ انجام شد (سفارش‌ها و مرجوعی).**
  - mock: `mock/catalog.mjs` (محصول/ورینت/موجودی/دسته/رنگ/متریال از `data.mjs`؛ فاز ۳ از همین می‌خواند) و `mock/admin/orders.mjs` (۶۴ سفارش در همه‌ی وضعیت‌ها، دو گروه رزرو `SG-3021`/`SG-3022`، مرجوعی‌ها در هر مرحله؛ `TRANSITIONS` = `allowedTransitions`؛ ارسال گروه رزرو با یک کد). mock با هر تغییر فایل (`--watch`) ری‌استارت و داده از نو ساخته می‌شود.
  - FE: `types/order.type.ts`؛ `(panel)/orders/` (`_api/ordersEndpoints.ts`، `_utils/apiError.ts`، `_styles/order.css` زیر `.pg-orders`، `ordersView` + `ordersColumns`، `orderDetailView` + کارت‌ها: `orderProgress`، `orderMedia`، `orderItems`، `orderMoney`، `orderTimeline`، `orderSide`، `orderNotes`؛ مودال‌ها: `statusModal`، `shipmentModal`، `refundModal`، `mediaEditModal`، `sendMediaModal`)؛ `(panel)/returns/` (`returnsView`، `decisionModal`).
  - کامپوننت‌های مشترک جدید: `MediaUploader` (یک useMutation با callbackهای سطح hook برای چند فایل، درصد، لغو)، `JalaliDateInput`، `JalaliDateTimeInput` (Tehran +03:30)، `MoneyInput`، `utils/fieldErrors.ts`، `formatDateTime`/`formatToman`/`relativeTime`.
  - الگوی مودال: فرم داخل `<Modal>` یک کامپوننت جداست (`XForm`) تا با بسته شدن unmount و دفعه‌ی بعد تازه شود (بدون `reset()`).
  - خطای «سفارش جلو رفته» (`INVALID_STATUS_TRANSITION`، `ORDER_ALREADY_SHIPPED`) ← toast + invalidate جزئیات + بستن مودال.
  - تست: تب‌ها/شمارنده‌ها، «باید عکاسی شود»، جستجو (ریست صفحه)، صفحه‌ی ۲؛ جزئیات CHANGE_REQUESTED ← «در حال آماده‌سازی» ← آپلود PNG (`/admin/media`) و ذخیره (۴ فایل) ← ارسال دستی (`PHOTO_SENT`) ← ثبت ارسال (خطای محلی کد کوتاه، بعد `SHIPPED`)؛ یادداشت؛ استرداد (بیش از سقف ← خطا، ۱۵۰٬۰۰۰ ← ثبت)؛ `KV-000000` ← «پیدا نشد»؛ مرجوعی: رد بدون دلیل ← خطا، تأیید ← حذف از «منتظر تصمیم».
  - **شکاف‌ها در UI گفته شد:** انجام درخواست تغییر مشتری (§۷ #۷) و ادامه‌ی چرخه‌ی مرجوعی (§۷ #۸) endpoint ندارند. ورینت جایگزین درخواست تغییر فقط با `#id` نشان داده می‌شود (بعد از فاز ۳ می‌شود نام/رنگش را از `GET /admin/products/{id}` آورد).
- **فاز ۳ انجام شد (کاتالوگ).**
  - mock: `mock/admin/catalog.mjs` (محصول با ETag ‏`"p{id}-v{version}"`؛ **فقط `PUT` نسخه را بالا می‌برد** — وضعیت، رنگ‌ها و موجودی منابع جدا هستند؛ `If-Match` کهنه ← `412 CHANGED_BY_SOMEONE_ELSE`؛ کدهای `NO_ACTIVE_VARIANT`، `LAST_ACTIVE_VARIANT`، `COLOR_ALREADY_ON_PRODUCT`، `DUPLICATE_SLUG/SKU`، `QUANTITY_EXCEEDS_STOCK`؛ شارژ رنگ صفرشده ← «موجود شد» برای مشترکین)؛ `GET /categories|/colors|/materials` عمومی؛ `specs` ساختاریافته طبق کانترکت. **نشست‌های mock در فایل temp می‌مانند** (`kiva-bo-mock-sessions.json`) تا با هر ری‌استارت `--watch` از پنل بیرون نیفتیم؛ بقیه‌ی داده از نو ساخته می‌شود.
  - FE: `types/catalog.type.ts`؛ `(panel)/_api/taxonomyEndpoints.ts` (دسته‌های ادمین/عمومی، رنگ‌ها، متریال‌ها — مشترک فرم‌ها)؛ `(panel)/products/` (`productsView`، `productEditView` برای `/products/new` و `/products/[id]`، `productForm` + `_utils/productForm.ts` (نگاشت فرم ↔ `ProductUpsertRequest`، اعتبارسنجی)، `specsFields`، `productStatusCard` (انتشار/زمان‌بندی/پیش‌نویس/آرشیو + آمار)، `variantsSection`، `variantModal` (گالری با view/ترتیب/اصلی/alt)، `stockModal`، `stockHistory`)؛ `(panel)/inventory/`؛ `(panel)/categories/` (+ `categoryModal`)، `(panel)/colors/`، `(panel)/materials/`.
  - کامپوننت‌های مشترک جدید: `ChipsInput`، `SeoFields`، `NumberInput`، `SingleMediaField`.
  - **قفل خوش‌بینانه‌ی فرم محصول:** فرم نسخه‌ی باز شدنش (`etag`) را نگه می‌دارد؛ خواندن دوباره‌ی محصول فرمِ دست‌نخورده را تازه می‌کند ولی فرمِ تغییرکرده را نه؛ ذخیره با `If-Match` همان نسخه؛ رد شدن ← نوار «این محصول جای دیگری ذخیره شده؛ خواندن دوباره». `status` هرگز با `PUT` فرستاده نمی‌شود (فقط `PATCH …/status`).
  - تصویر دسته: پاسخ `Category` شناسه‌ی مدیا ندارد، پس اگر عکس عوض نشده `imageMediaId` اصلاً فرستاده نمی‌شود (حذف = `null`).
  - تست: لیست (مرتب‌سازی موجودی)، فرم ویرایش و ذخیره، ذخیره‌ی هم‌زمان از curl ← نوار تعارض ← خواندن دوباره؛ شارژ رنگ ناموجود با ۶ مشترک؛ ساخت محصول (خطاهای محلی، بعد ساخت با یک رنگ) ← افزودن رنگ با ۲ آپلود ← انتشار؛ `/inventory`، `/categories` (ساخت؛ حذف دسته‌ی دارای محصول ← پیام ۴۰۹)، `/colors` (ساخت)، `/materials` (ساخت). منوی CATALOG_MANAGER فقط کاتالوگ را نشان داد.
  - شکاف‌ها در UI گفته شد: لیست/ویرایش/حذف متریال و حذف رنگ (§۷ #۶).
- **فاز ۴ انجام شد (بازاریابی).**
  - mock: `mock/admin/marketing.mjs` — کد تخفیف (۴ نمونه + `active`)، کمپین (`GET /campaigns/active` هم)، بنر (`GET /banners` عمومی هم)، نوار اطلاعیه (`PUT` + `GET /config` با `configParts` که فاز ۷ تنظیمات را به آن اضافه می‌کند)، پیام رضایت (`GET /testimonials` عمومی فقط منتشرشده‌ها) و `GET /products` سبک (q، ids) برای انتخاب‌گر محصول. پاسخ کمپین و پیام رضایت فیلدهای بیرون از کانترکت `productIds` / `isPublished`، `sortOrder` دارند (برای فرم؛ §۷).
  - FE: `types/marketing.type.ts`؛ `(panel)/_utils/apiError.ts` → `PANEL_ERRORS` (مپ مشترک بخش‌های CRUD ساده)؛ `utils/period.ts` (وضعیت بازه‌ی زمانی)؛ ماژول‌های `discount-codes` (فقط ADMIN)، `campaigns`، `banners` (پیش‌نمایش تم)، `announcements` (ویرایش کل لیست با جابه‌جایی)، `testimonials`.
  - کامپوننت‌های مشترک جدید: `ProductPicker` (جستجوی تایپی روی `GET /products` + نام انتخاب‌شده‌ها با `ids`)، `IconSelect`.
  - `TaxonomyEndpoints`: `searchProducts`، `getProductsByIds`، `getCategories` (عمومی برای نقش‌های بدون دسترسی کاتالوگ).
  - **هشدارهای شکاف در UI:** بنرها و نوار اطلاعیه در فروشگاه فعلاً از محتوای ثابت خوانده می‌شوند (§۶)؛ لیست اطلاعیه از `GET /config` فقط پیام‌های «در حال نمایش» را دارد و پیام زمان‌بندی‌شده با ذخیره پاک می‌شود (§۷ #۵)؛ پیام رضایت منتشرنشده در جدول دیده نمی‌شود (§۷ #۳)؛ کمپین حذف ندارد (§۷ #۲۱)؛ تصویر پیام رضایت مثل دسته: اگر عوض نشده `screenshotMediaId` فرستاده نمی‌شود.
  - تست (ADMIN): هر ۵ لیست؛ ساخت کد MEHR20 با محدودیت دسته؛ جابه‌جایی و ذخیره‌ی اطلاعیه؛ ویرایش کمپین یلدا (نام ۳ محصول از ids، جستجوی «کوله» و افزودن)؛ ذخیره‌ی بنر؛ ساخت پیام رضایت با انتخاب محصول (رنگ خودکار). CONTENT_EDITOR روی `/admin/discount-codes` ← ۴۰۳ (درست).
- **فاز ۵ انجام شد (محتوا).**
  - mock: `mock/admin/content.mjs` — بلاگ (۸ مقاله از `data.mjs`، یکی پیش‌نویس؛ دسته‌ها و نویسنده‌ها از روی مقاله‌ها)، `GET /blog/posts|/blog/categories|/blog/posts/{idOrSlug}` عمومی، FAQ (`GET /faq` + `PUT /admin/faq/groups`)، صفحات ثابت (`GET /pages/{slug}` + `PUT /admin/pages/{slug}`، `terms` آماده).
  - **فرض mock که باید از بک‌اند پرسیده شود:** `GET /blog/posts/{id}` با توکن کارمند، مقاله را در هر وضعیتی برمی‌گرداند (وگرنه پیش‌نویس بعد از ساخت قابل باز کردن نیست — شکاف §۷ #۱). پاسخ خلاصه‌ی مقاله در mock فیلد `status` هم دارد.
  - FE: `types/content.type.ts`؛ `(panel)/blog/` (`blogView`، `blogEditView` برای `/blog/new` و `/blog/[id]`، `blogPostForm` (سربرگ، بلوک‌ها، انتشار، کاور، نویسنده، SEO، حذف)، `blockEditor` (۷ نوع بلوک با جابه‌جایی؛ محصول با `ProductPicker`، عکس با `SingleMediaField`، لیست = هر خط یک مورد))؛ `(panel)/faq/` (گروه‌ها و سؤال‌ها با جابه‌جایی، هشدار anchorهای لینک‌شده `reserve/shipping/return`)؛ `(panel)/pages/` (`pagesView` با slugهای شناخته‌شده + slug دلخواه، `pageEditView` که ۴۰۴ را «صفحه‌ی تازه» می‌گیرد).
  - نویسنده‌ها از روی مقاله‌های عمومی جمع می‌شوند (لیست نویسنده در کانترکت نیست، §۷ #۲).
  - تست (ADMIN): لیست بلاگ، ویرایش مقاله ۱ و ذخیره، ساخت پیش‌نویس ← `/blog/101`؛ FAQ افزودن سؤال و ذخیره‌ی کل؛ `/pages`، ویرایش `terms`، ساخت `about-us`.
  - نکته‌ی تست: در اسکریپت‌ها `document.querySelector('aside')` سایدبار پنل است؛ aside فرم‌ها `.edit-grid aside` است.
- **فاز ۶ انجام شد (پشتیبانی) + شمارنده‌های سایدبار.**
  - mock: `mock/admin/support.mjs` — نظرات (برای هر محصول ۱ تا ۳ نمونه با وضعیت‌های مختلف + ۳ نظر تازه‌ی منتظر)، پیام‌های تماس (۱۶ تیکت `CT-…`؛ پاسخ ایمیلی بدون ایمیل ← خطای فیلد)، مشتریان (از `db.users` با جمع سفارش‌ها)، `PUT …/roles` (فقط ADMIN، خود ← `422 ROLE_CHANGE_NOT_ALLOWED`، بستن نشست‌های آن شخص با `endSessionsOf`).
  - FE: `types/support.type.ts`؛ `(panel)/reviews/` (کارت‌های `.rv` در `blocks.css`، تب وضعیت با `pendingCount`، فیلتر محصول با `ProductPicker` و «پاسخ دارد»؛ `reviewModals` = تأیید با پاسخ اختیاری / رد با دلیل / پاسخ کیوا؛ حذف پاسخ با تأیید)؛ `(panel)/contact-messages/` (جدول + `ticketModal`: پاسخ SMS/EMAIL، یادداشت داخلی، وضعیت)؛ `(panel)/customers/` (جستجو، نقش‌ها با توضیح دامنه‌ی هر نقش، قفل نقش‌های خود). لینک‌ها به محصول/سفارش فقط وقتی نقش اجازه دارد (`useCan`).
  - سایدبار: `panelShell` چهار کوئری کوچک (`size=1`) با کلیدهای زیر پیشوند هر بخش (`["orders","queueCount",…]`) تا `invalidateQueries` همان بخش شمارنده را هم تازه کند؛ خطای شمارنده بی‌صداست (فقط badge نمی‌آید).
  - تست (ADMIN): نظرات منتظر (۸) ← تأیید با پاسخ ← رد بدون دلیل (خطا) و با دلیل؛ پاسخ به تیکت با پیامک و بستن؛ جستجوی مشتری؛ نقش‌های خود (قفل + پیام)؛ افزودن OPERATOR به لیلا؛ badgeهای سایدبار ۷/۲/۶/۵.
- **فاز ۷ انجام شد (تنظیمات و داشبورد).**
  - mock: `mock/admin/settings.mjs` — `GET/PUT /admin/settings` (فقط ADMIN، اعتبارسنجی: یک روش ارسال فعال، یک درگاه پیش‌فرض فعال، بازه‌ها، تلفن/ایمیل، ساعت‌ها)، `GET /site/stats`، `GET /config` حالا `shipping`، `support`، `social`، `paymentGateways` هم دارد، `GET /admin/reports/overview` (از سفارش‌های mock، روزبه‌روز به وقت تهران).
  - FE: `types/settings.type.ts`؛ `(panel)/settings/` (روش‌های ارسال، ارسال رایگان، روزهای بدون ارسال، رزرو/بازگشت/مهلت‌ها، پشتیبانی و ساعت‌ها، شبکه‌ها، درگاه‌ها با پیش‌فرض، آمار «درباره ما»، قابلیت‌ها؛ الگوی base/dirty + ذخیره‌ی کل)؛ `(panel)/_api/reportsEndpoints.ts`؛ `(panel)/_components/dashboardView` (کارت‌های صف بر اساس نقش با همان کلیدهای شمارنده‌ی سایدبار ← بدون درخواست اضافه؛ برای ADMIN گزارش با بازه‌ی ۷/۳۰/۹۰ روز در URL، ۴ شاخص، `revenueChart`، شاخص‌های امضای کیوا/رزرو/مرجوعی، سهم روش ارسال و پیام‌رسان، پرفروش‌ها).
  - نمودار طبق اسکیل `dataviz`: یک سری تک‌رنگ (یاسی، hover بنفش)، بدون محور دوم (تعداد سفارش در tooltip و جدول)، فاصله‌ی ۲px و سر گرد ۴px، tooltip روی کل ستون، دکمه‌ی «نمایش جدول»، محور و خطوط کم‌رنگ. محور در RTL سمت راست است و زمان از راست به چپ.
- **۸.۱ واکنش‌گرایی و نقش‌ها:** در ۳۷۵px هیچ صفحه‌ای اسکرول افقی ندارد (اصلاح‌ها: `.icard > h3` و `.row-card .rh` با `flex-wrap`، `.stack/.rows/.row-card/.m-body > *{min-width:0}`، جدول پرفروش‌ها داخل `.tbl-scroll`؛ KPI پولی بدون «تومان» در عدد). اسکرین‌شات ۱۳۶۶ و ۳۷۵ داشبورد درست بود. OPERATOR: منو فقط داشبورد/سفارش/مرجوعی، `/products` ← «به این بخش دسترسی نداری.» بدون خروج، دکمه‌ی استرداد و گزارش دیده نمی‌شود.
- **فاز ۸ انجام شد.** `README.md` پروژه (اجرا، mock و کاربرهای آزمایشی، بخش‌ها و نقش‌ها، ساختار، قراردادها، شکاف‌ها). `npx tsc --noEmit` ✅ · `npx eslint src mock` ✅ · `npx next build` ✅ (۲۹ مسیر؛ `/orders/[code]`، `/products/[id]`، `/blog/[id]`، `/pages/[slug]` پویا، بقیه استاتیک). قبل از build سرور dev متوقف شد (هر دو در `.next` می‌نویسند) و بعد دوباره روشن شد.

### جلسه‌ی ۲ (۱۹ مهر ۱۴۰۵)
- کاربر پروژه را git کرد (`d5e82e2`، درخت تمیز). کانترکت و FEATURES از جلسه‌ی ۱ عوض نشده‌اند (هر دو ۱۸ مهر).
- **9.1 ممیزی:** لیست متدهای `/admin/*` از yml (۶۰ مورد) با `method/url`های `src/**/_api` مقایسه شد — هیچ endpointی جا نمانده. `tsc` و `eslint` پاس. فاز ۹ از «کارهای باز» تعریف شد.
- **9.2 ورینت جایگزین:** `orders/_components/desiredVariant` (دو `useQuery` با `enabled` بر اساس `changeType` و `select` که ورینت را پیدا می‌کند؛ کلیدها `["orders","storeProduct",productId]` و `["orders","relatedProducts",productId]`)؛ نمایش: سواچ، نام رنگ (برای مدل: «محصول — رنگ»)، تگ موجودی، اختلاف قیمت هر عدد، لینک به `/products/{id}` فقط با `can("catalog")`. `PRODUCT_NOT_FOUND` (محصول از فروشگاه برداشته شده) ← `isStoreProductMissingError` ← «ورینت جایگزین #id (در فروشگاه پیدا نشد)». endpointها: `OrdersEndpoints.getStoreProduct`، `getRelatedProducts` (`limit=8` مثل مودال فروشگاه)؛ تایپ‌ها `StoreVariant`، `StoreProductDetail` در `marketing.type.ts`. mock: `GET /products/:idOrSlug`، `GET /products/:id/related`، سفارش‌های `CHANGE_REQUESTED` یکی‌درمیان `MODEL` (محصول هم‌دسته)، `stockStatus` واقعی در خلاصه‌ها. تست (ADMIN): `KV-220308` (مدل ← «توت آسمان — آبی، ناموجود، +۳۰۰٬۰۰۰») و `KV-220317` (رنگ ← «کرم، فقط ۱ عدد»)؛ آرشیو محصول ۹ ← fallback درست.
- **9.3 پیش‌نمایش HTML:** `utils/html.ts` (`HTML_TAGS` = تگ‌های مجاز `HtmlString` کانترکت؛ `cleanHtml` با `DOMParser` (سند بی‌اثر): تگ غیرمجاز باز می‌شود و متنش می‌ماند، script/style/iframe/فرم با محتوا حذف، فقط `href` امن روی `a` می‌ماند) + `_components/panel/htmlField` (همان پراپ‌های `Textarea`؛ سوییچ `.seg` «کد / پیش‌نمایش»؛ پیش‌نمایش با `.prose` فروشگاه (کپی از `kiva-fe` pages/blog در `tailwind/admin/forms.css`)؛ زیرش «سایت این تگ‌ها را حذف می‌کند: …»). جایگزین در: توضیحات محصول، محتوای صفحه‌ی ثابت، پاسخ FAQ، بلوک پاراگراف و نکته‌ی بلاگ. تست: توضیحات محصول ۱ + `h2/ul/div/script/a[javascript:]/blockquote` ← script اجرا نشد و حذف شد، div باز شد، href بد پاک شد، هشدار `div, script`؛ اسکرین‌شات درست.
- **9.4 تغییرات ذخیره‌نشده:** `_components/panel/unsavedGuard` — `<UnsavedGuard dirty={…} />` (فقط state، بدون کوئری): وقتی `dirty` است `beforeunload` (پیام خود مرورگر) + شنونده‌ی `click` در فاز capture روی `document` که کلیک روی `<a>` داخلی پنل را (هم‌origin، بدون target/مودیفایر، مسیر دیگر) نگه می‌دارد و `ConfirmModal` «تغییرات ذخیره نشده / بدون ذخیره برو» نشان می‌دهد ← `router.push`. ناوبری برنامه‌ای (بعد از ذخیره) و دکمه‌ی back مرورگر رد می‌شوند (App Router راهی برای نگه داشتنش ندارد). در ۶ فرم: محصول، تنظیمات، FAQ، اطلاعیه (از `dirty` موجود)، مقاله و صفحه‌ی ثابت (`dirty` تازه: مقایسه با مقدار باز شدن فرم؛ `&& !save.isSuccess` چون فرم با `key={updatedAt}` بعد از refetch از نو mount می‌شود). تست: محصول ۱ تغییر ← کلیک سایدبار ← مودال، انصراف ← ماند، «بدون ذخیره برو» ← `/orders`؛ تنظیمات دست‌نخورده ← بدون مودال؛ صفحه‌ی `terms` تغییر + ذخیره ← بدون مودال.
  - نکته‌ی تست: بعد از اضافه کردن فایل/کامپوننت تازه، HMR در پنل مخفی همیشه اعمال نمی‌شود — `location.href='/'` و بعد `window.next.router.push(...)`.
- **9.5 برگه‌ی ارسال:** `orders/_components/packingSlip` (با `createPortal` مستقیم در `<body>`؛ لوگو، «برگه‌ی ارسال»، تاریخ و روش ارسال، کد سفارش درشت، گیرنده و تلفن، نشانی و کد پستی، گروه رزرو با کد سفارش‌های هم‌بسته، جدول کالا (تیک، نام، رنگ، SKU، تعداد، جمع)، کادوپیچی و پیام کارت، یادداشت مشتری، جای امضای بسته‌بندی/کنترل) + `tailwind/admin/print.css` (`.print-slip{display:none}`؛ در `@media print`: `@page A5`، `body > :not(.print-slip){display:none}`، سیاه‌وسفید). دکمه‌ی «برگه‌ی ارسال» (آیکن `print`) در سربرگ جزئیات سفارش = `window.print()`؛ برای سفارش پرداخت‌نشده/لغوشده نه. تست: `KV-220063` (رزرو `SG-3021`) — قواعد print موقتاً به screen کپی شد و در عرض A5 اسکرین‌شات گرفته شد: درست.
- **9.6 جمع‌بندی فاز ۹:** README (بخش سفارش‌ها، ساختار، «فرم‌های بلند»). `tsc` ✅ · `eslint src mock` ✅ · `next build` ✅ (۲۹ مسیر، مثل قبل). bo-dev قبل از build متوقف و بعدش دوباره روشن شد. فاز ۱۰ تعریف شد.
- **10.1 جستجوی سریع:** `(panel)/_components/quickSearch` — دکمه‌ی «جستجو… Ctrl K» در نوار بالا (در موبایل فقط آیکن) + میان‌بر `Ctrl/⌘+K` و `/` (با `e.code` تا با چیدمان فارسی هم کار کند؛ `/` وقتی در فیلد تایپ می‌کنی نه). مودال **بیرون از `.bo-top`** رندر می‌شود چون `backdrop-filter` نوار بالا `position:fixed` را خراب می‌کند. `SearchBox` جدا (با بسته شدن مودال unmount و خالی می‌شود)؛ debounce ۲۵۰ms، حداقل ۲ حرف؛ سه `useQuery` تایپی با `signal` (برای همین `OrdersEndpoints.getOrders` و `CustomersEndpoints.getCustomers` پارامتر اختیاری `signal` گرفتند) با کلیدهای `["orders"|"products"|"customers", "quickSearch", term]`، `keepPreviousData`، `enabled` بر اساس `can(...)`؛ خطای هر گروه درجا با `ErrorComponent2` فشرده (`PANEL_ERRORS`). نتیجه‌ها `<Link>` واقعی‌اند: `↑/↓` + `Enter` = `click()` روی لینک فعال ⇒ `UnsavedGuard` هم می‌تواند نگهش دارد؛ بستن جستجو با شنونده‌ی `click` بومی در فاز capture روی `document` (چون guard رویداد را قبل از `onClick` ری‌اکت متوقف می‌کند). مشتری صفحه‌ی جزئیات ندارد ← `/customers?q=<موبایل>`؛ «همه‌ی نتایج» ← `/orders|/products|/customers?q=`. `PanelShell`: state باز/بسته + بستن با عوض شدن مسیر (هماهنگی هنگام رندر). CSS در `tailwind/admin/shell.css` (`kbd`، `.qs-*`). تست (ADMIN): `Ctrl+K` ← «0912» ← ۵ سفارش + «چیزی پیدا نشد» محصول + ۵ مشتری؛ `↓↓Enter` ← `/orders/KV-220145` و جستجو بسته شد؛ فرم محصول کثیف + `/` + «کوله» + Enter ← مودال «تغییرات ذخیره نشده» و جستجو بسته؛ اسکرین‌شات ۱۳۶۶ و ۳۷۵ (بدون اسکرول افقی).
- **10.2 شمارنده‌های زنده:** `LIVE_POLL_MS = 60_000` در `config/global.ts`. چهار شمارنده‌ی سایدبار (`PanelShell`) `refetchInterval` گرفتند؛ کارت‌های صف داشبورد همان کلیدها را دارند پس با هم تازه می‌شوند. `/orders`: کوئری `["orders","latest"]` (صفحه‌ی ۱ با اندازه‌ی ۱، `select` = کد جدیدترین سفارش، هر دقیقه)؛ کد بار اول در state (`seenLatest`، هماهنگی هنگام رندر) و اگر عوض شد نوار `.note.success.new-orders` «سفارش تازه رسید: KV-… · به‌روزرسانی لیست» ← `invalidateQueries` لیست و شمارنده‌ها. خود لیست زیر دست اپراتور خودکار عوض نمی‌شود. خطای این بررسی بی‌صداست (مثل شمارنده‌ها). React Query در تب پنهان (`visibilityState=hidden`) بازه را اجرا نمی‌کند — درست همان چیزی که می‌خواهیم. mock: `POST /api/v1/__mock/new-order` (سفارش PROCESSING تازه با کد `KV-23000n` بالای صف). تست: پنل مرورگر مخفی `hidden` گزارش می‌دهد پس برای تست `document.visibilityState` موقتاً `visible` شد ← بعد از یک بازه نوار با `KV-230002` آمد و badge سایدبار ۸ ← ۹؛ «به‌روزرسانی لیست» ← ردیف اول `KV-230002` و نوار رفت.
- **10.3 جمع‌بندی فاز ۱۰:** README (جستجوی سریع، شمارنده‌های زنده، تست‌کمک `__mock/new-order`). `tsc` ✅ · `eslint src mock` ✅ · `next build` ✅ (۲۹ مسیر).
- **11.1–11.3 کار گروهی روی صف سفارش** (همه در `ordersView`):
  - `orders/_utils/packing.ts`: `isPackable(status)` (نه برای `PENDING_PAYMENT`، `PAYMENT_FAILED`، `EXPIRED`، `CANCELLED`) و `MAX_SLIPS = 30`؛ صفحه‌ی جزئیات هم از `isPackable` استفاده می‌کند.
  - انتخاب: ستون اول `pick` (کامپوننت `Checkbox` با برچسب `sr-only`)، سربرگ = «همه‌ی این صفحه»؛ state = آرایه‌ی کد سفارش در خود صفحه، بین صفحه‌ها و تب‌ها می‌ماند؛ ردیف غیرقابل‌بسته‌بندی غیرفعال با `title` توضیح. کلیک روی چک‌باکس ردیف را باز نمی‌کند (DataTable کلیک روی `input/label` را رد می‌کند). نوار چسبان پایین `.savebar.sel-bar`: «n سفارش انتخاب شده»، «لغو انتخاب»، «چاپ برگه‌ی ارسال» (بالای ۳۰ ← غیرفعال + پیام).
  - چاپ گروهی: `printSlips` (`useMutation`، جزئیات را یکی‌یکی با `getOrder` می‌خواند، toast روی خطا) ← state `slips` ← `<PackingSlips orders={slips} />` ← `useEffect` بعد از commit `window.print()` و با `afterprint` برگه‌ها برداشته می‌شوند. `packingSlip.tsx` حالا `PackingSlips` (پورتال، پیش‌فرض) + `SlipSheet` (یک `.ps-sheet` با `break-after:page`).
  - CSV: `utils/csv.ts` (`downloadCsv`: RFC 4180، BOM ‏UTF-8، CRLF، Blob + `a[download]`)؛ دکمه‌ی «خروجی CSV» ته `.fbar` (`.fbar-end`)؛ `exportCsv` (`useMutation`) با همان `filters` صفحه‌ها را `size=100` تا `hasNext=false` یا ۲۰۰۰ ردیف می‌خواند؛ ۱۳ ستون فارسی (وضعیت/روش ارسال/پیام‌رسان با برچسب، تاریخ شمسی، مبلغ عدد خام)؛ toast «n سفارش در فایل CSV».
  - تست: ۲ انتخاب در صفحه‌ی ۱ + ۱ در صفحه‌ی ۲ ← «۳ سفارش انتخاب شده»؛ ردیف‌های پرداخت‌نشده غیرفعال؛ چاپ (با `window.print` جایگزین‌شده در تست) ← ۳ برگه `KV-230002، KV-230001، KV-220369` در DOM و بعد از `afterprint` حذف؛ CSV ← `kiva-orders-2026-10-11.csv`، ۶۶ سفارش + سربرگ، BOM `ef bb bf`؛ اسکرین‌شات ۱۳۶۶ درست.
- **11.4 جمع‌بندی فاز ۱۱:** README (ردیف سفارش‌ها). `tsc` ✅ · `eslint src mock` ✅ · `next build` ✅. bo-dev دوباره روشن شد.
- **بازبینی تغییرات جلسه‌ی ۲ (اصلاح):** `print.css` اول همه‌چیز جز برگه را در هر چاپی پنهان می‌کرد (Ctrl+P روی داشبورد = صفحه‌ی خالی) و `@page` سراسری A5 بود ← حالا `body:has(> .print-slip) > :not(.print-slip)` فقط وقتی برگه‌ای mount است، و صفحه‌ی نام‌دار `@page slip{size:A5}` + `.ps-sheet{page:slip}` (بقیه‌ی صفحه‌ها با اندازه‌ی پیش‌فرض چاپگر). در stylesheet کامپایل‌شده بررسی شد.
- **دیر رسیدن محتوا به سایت (FEATURES §۸، ISR):** `STORE_REFRESH_MINUTES = { home: 1, blog: 5, faq: 5, pages: 10 }` در `config/global.ts` + `onSiteWithin(min)` در `utils/format.ts`؛ toast ذخیره‌ی مقاله، FAQ، صفحه‌ی ثابت، کمپین و پیام رضایت منتشرشده حالا می‌گوید «… — تا n دقیقه‌ی دیگر در سایت» (نوار ذخیره‌ی صفحه‌ی ثابت هم از همان ثابت). تست: ذخیره‌ی FAQ ← «سوالات متداول ذخیره شد — تا ۵ دقیقه‌ی دیگر در سایت». `tsc`/`eslint` پاس.
- **پایان جلسه‌ی ۲:** همه‌ی ردیف‌های فاز ۰ تا ۱۱ ✅. تغییرات جلسه‌ی ۲ کامیت نشده‌اند (۲۹ فایل تغییرکرده + ۹ فایل/پوشه‌ی تازه؛ `git status`). سرورهای `bo-mock` و `bo-dev` از پنل مرورگر روشن ماندند.

### جلسه‌ی ۳ (۱۹ مهر ۱۴۰۵)
- کاربر جلسه‌ی ۲ را کامیت کرد (`c609eab`) و کانترکت **1.5.0** را در `kiva-backoffice-fe/kiva-openapi.yml` گذاشت (همان فایلِ کاری `kiva-fe`). diff خوانده شد و فاز ۱۲ تعریف شد.
- **mock برای ۱۲.۱ تا ۱۲.۳ یک‌جا** (`mock/admin/orders.mjs`): `totals.balanceDue`؛ `TRANSITIONS` ‏(`CHANGE_REQUESTED` فقط لغو؛ وضعیت‌های مرجوعی دیگر با `…/status` نه)؛ `POST …/change-request/resolution` (جابه‌جایی رزرو انبار، قیمت امروز، اختلاف منفی ← `Refund` PENDING، مثبت ← `balanceDue`، `CANCEL_ITEM`، `feedback.resolution`، رویداد تاریخچه)؛ ثبت ارسال با مانده ← `422 BALANCE_DUE`؛ `newRefund` (همیشه PENDING؛ `returnId`، `createdAt`، `statusNote`)، `totals.refunded` فقط با COMPLETED؛ `PATCH /admin/refunds/:id`؛ `returnView` = `AdminReturnRequest` + `returnNext` (قدم‌های مجاز)؛ `PUT …/pickup`، `POST …/receipt` (برگشت به موجودی با `adjustStock` دلیل `RETURNED`)، `POST …/close`؛ وضعیت سفارش دنبال مرجوعی. داده: یک مرجوعی در هر مرحله (`RT-1013/14` درخواست، `RT-1017` تأییدشده، `RT-1019` جمع‌آوری، `RT-1015` رسیده با شبا، `RT-1016` استردادشده، `RT-1018` رد). `mock/admin/catalog.mjs`: `adjustStock` صادر شد (route موجودی هم از آن استفاده می‌کند) و `stockAlerts` (یک ردیف برای هر اشتراک + اشتراک «هر رنگی») + `GET /admin/stock-alerts`.
- **12.1 درخواست تغییر:** `ChangeRequestModal` (`orders/_components/changeRequestModal`) — خلاصه‌ی درخواست با `DesiredVariant`، `.seg` «اجرا / رد»، اثر هر نوع (`APPLY_EFFECT`)، برای رنگ: انتخاب رنگ دیگر از `GET /products/{id}` (همان کلید `["orders","storeProduct",id]`، ناموجودها غیرفعال — `Select` حالا `disabled` در گزینه می‌گیرد) + پیش‌بینی مانده/استرداد؛ یادداشت (برای رد و `OTHER` لازم)، سوییچ پیامک؛ خطای «سفارش جلو رفته» ← بستن و خواندن دوباره. کارت عکس: به‌جای هشدار شکاف دکمه‌ی «رسیدگی به درخواست»، و بعد از رسیدگی خط «اجرا شد/رد شد · زمان · یادداشت — عکس تازه بگیر». کارت پرداخت: نوار «مانده‌ی پرداخت مشتری». «ثبت ارسال» با مانده غیرفعال (با `title`). قلم پرچم‌دار فقط وقتی سفارش `CHANGE_REQUESTED` است. `OrdersEndpoints.resolveChangeRequest`. تست: `KV-220317` (۲ عدد، کرم فقط ۱) اجرا ← toast «از این رنگ فقط ۱ عدد موجوده» و مودال ماند؛ رد بدون دلیل ← خطای محلی، با دلیل ← «در حال آماده‌سازی» + خط «رد شد»؛ `KV-220308` (مدل، بعد از شارژ ۳ عدد با curl) اجرا ← قلم «توت آسمان آبی»، مانده ۳۰۰٬۰۰۰، «ثبت ارسال» غیرفعال.
- **12.2 پیگیری استرداد:** `orders/_components/refundTrackModal` (`RefundTrackModal` با `refund | null` به‌جای `open`؛ گزینه‌ها از وضعیت فعلی: `PENDING` ← در حال انجام/انجام شد/ناموفق، `PROCESSING` ← انجام شد/ناموفق؛ شماره‌ی پیگیری برای «انجام شد» جز `STORE_CREDIT` لازم؛ یادداشت برای مشتری؛ invalidate `orders` و `returns`) + `isRefundOpen`. کارت پرداخت: ردیف `.refund-row` با تاریخ ثبت، کد مرجوعی، `statusNote` و دکمه‌ی «پیگیری» (فقط `can("refunds")`). `OrdersEndpoints.updateRefund`. تست: `KV-220101` (استرداد در حال انجام) ← «ثبت» بی شماره ← خطای محلی؛ با شماره ← «انجام شد» و «برگشت داده‌شده −۲٬۴۲۵٬۰۰۰».
- **12.3 چرخه‌ی مرجوعی:** `ReturnsEndpoints` (`AdminReturnRequest`؛ `schedulePickup`، `receive`، `close`؛ نوع موقت `AdminReturn` حذف شد)؛ `returns/_components/returnStepModals` (`PickupModal` حامل/زمان شمسی/کد رهگیری/یادداشت/پیامک — دوباره = تغییر؛ `ReceiptModal` برای هر قلم «رسید» و «برگشت به فروش» (پیش‌فرض صفر برای ایراد ساخت/آسیب ارسال) + نتیجه‌ی بازبینی؛ `CloseModal` روی `ConfirmModal` با دلیل لازم؛ `useStepDone` = toast + invalidate `returns` و جزئیات سفارش؛ `INVALID_STATUS_TRANSITION` ← بستن و خواندن دوباره). `/returns`: ۸ تب (همه‌ی مراحل)، ستون مشتری، شبا، جزئیات هر مرحله زیر وضعیت، دکمه‌ها فقط از `allowedTransitions`؛ «ثبت استرداد» (فقط ADMIN) = لینک `/orders/{code}?refund={id}` ← صفحه‌ی سفارش مودال استرداد را با همان مرجوعی باز می‌کند (مبلغ = اقلام مرجوعی، روش = `refundMethod`، دلیل «مرجوعی RT-…»؛ پارامتر با بستن پاک می‌شود)؛ برای غیر ADMIN «منتظر استرداد (مدیر کل)». `RefundModal`: سقف = پرداختی − استردادهای غیر `FAILED`، فقط مرجوعی‌های `RECEIVED` در انتخاب. کارت مرجوعی صفحه‌ی سفارش: دلیل بستن + «ثبت استرداد این مرجوعی». برچسب‌ها: `PICKUP_SCHEDULED` «در حال جمع‌آوری»، `RECEIVED` «رسیده به انبار». هشدار شکاف §۷ #۸ حذف شد. تست: `RT-1017` رسید (برگشت به فروش ۰) ← رسیده؛ `RT-1019` بستن بی دلیل ← خطا، با دلیل ← «بسته شد»؛ `RT-1015` «ثبت استرداد» ← صفحه‌ی سفارش با مودال پرشده (۱٬۷۵۰٬۰۰۰، شبا) ← ثبت ← پیگیری «انجام شد» ← سفارش «وجه برگشت داده شد»؛ `RT-1013` تأیید ← جمع‌آوری با کد ← «در حال جمع‌آوری».
- **12.4 کاتالوگ:** نوع `AdminCategory` (`imageMediaId`)؛ `TaxonomyEndpoints.getAdminCategories` ← `AdminCategory[]`، `getMaterials` ← `GET /admin/materials` (صفحه‌ی متریال و فرم محصول، هر دو نقش کاتالوگ)؛ فرم دسته حالا عکس فعلی را با شناسه‌اش نگه می‌دارد و همیشه `imageMediaId` می‌فرستد (ترفند `CURRENT` حذف شد). `ColorsEndpoints.deleteColor`، `updateMaterial`، `deleteMaterial`. `/colors`: دکمه‌ی حذف (برای رنگِ روی محصول غیرفعال با `title` تعداد) + `ConfirmModal`. `/materials`: ستون ویرایش/حذف، `MaterialForm` برای ساخت و ویرایش، هشدار شکاف حذف شد. mock: `imageMediaId` در نمای دسته، کد ۴۰۹ ‏`IN_USE` (دسته، رنگ، متریال؛ با پیش‌نویس و آرشیو)، `DELETE /admin/colors/:key`، `GET/PUT/DELETE /admin/materials`. تست: متریال تازه ← ساخته ← حذف؛ ویرایش «چرم مصنوعی مات» (زیرعنوان «۲ محصول…») ← ذخیره؛ رنگ‌های روی محصول ← حذف غیرفعال.

---

## کارهای باز (برای جلسه‌های بعد)

**از بک‌اند بپرس / درخواست بده** (شکاف‌های FEATURES §۷ که پنل الان با راه‌حل موقت کار می‌کند):
1. `GET /admin/blog/posts` (+ پیش‌نویس‌ها) — الان لیست از بلاگ عمومی است؛ و این‌که `GET /blog/posts/{id}` با توکن کارمند پیش‌نویس را برگرداند (mock این را فرض کرده).
2. `GET /admin/testimonials`، `GET /admin/announcements`، `GET /admin/pages`، `GET /admin/faq` — الان از endpointهای عمومی؛ اطلاعیه‌ی زمان‌بندی‌شده با ذخیره پاک می‌شود.
3. `productIds` در پاسخ `Campaign` و `isPublished`/`sortOrder` در پاسخ `Testimonial`، `status` در `BlogPostSummary`، شناسه‌ی مدیا در پاسخ‌ها (`Category.imageMediaId`، `Testimonial.screenshotMediaId`) — فرم‌ها به آن‌ها نیاز دارند.
4. `/admin/blog/categories` و `/admin/blog/authors`؛ ویرایش/حذف/لیست متریال؛ حذف یا غیرفعال‌سازی رنگ؛ حذف کمپین.
5. انجام درخواست تغییر مشتری (`CHANGE_REQUESTED`)، ادامه‌ی چرخه‌ی مرجوعی (`PICKUP_SCHEDULED`، `RECEIVED`، `CLOSED`)، `PATCH /admin/refunds/{id}`، `GET /admin/customers/{id}`، `GET /admin/stock-alerts`، خبرنامه، لاگ تغییرات.
6. مجاز کردن origin پنل (`http://localhost:3200` در توسعه، `admin.kiva.ir` در پروداکشن) برای `refresh`/`logout`.

**بهبودهای پیشنهادی در خود پنل:** فازهای ۹ تا ۱۱ انجام شد. ایده‌های بعدی (هیچ‌کدام شروع نشده، فقط اگر کاربر خواست):
- جستجوی سریع: `aria-activedescendant` برای صفحه‌خوان‌ها (الان فوکوس روی input می‌ماند و ردیف فعال فقط کلاس `.on` و `aria-selected` دارد).
- تغییر وضعیت گروهی سفارش‌های انتخاب‌شده — endpoint گروهی در کانترکت نیست؛ با N درخواست جدا شدنی است ولی خطای نیمه‌کاره را باید خوب نشان داد.
- تست خودکار (پروژه مثل `kiva-fe` هنوز هیچ تستی ندارد).
- `next start` و تست روی بک‌اند واقعی وقتی آماده شد (فقط `NEXT_PUBLIC_API_URL` عوض می‌شود).
- `kiva-fe/.claude/launch.json` (در git فروشگاه، هنوز کامیت‌نشده: `M`) دو ورودی `bo-mock`/`bo-dev` دارد که پنل مرورگر از آن‌ها سرورها را روشن می‌کند — تصمیم با کاربر که کامیت شوند یا نه.

