# کیوا — پنل مدیریت (Kiva Backoffice)

پنل ادمین فروشگاه **کیوا**؛ راست‌به‌چپ و فارسی. ساختار و قراردادها عین فروشگاه (`kiva-fe`) است.

**Next.js 16 (App Router)** · **TypeScript** · **Tailwind CSS 3** · **TanStack Query v5** · **Zustand** · **axios**

| مرجع | کجا |
|---|---|
| قرارداد API | `D:\pariya\kiva-fe\kiva-openapi.yml` — نسخه‌ی **1.4.0**، بخش `/admin/*` |
| ویژگی‌ها، نقش‌ها، چرخه‌ها و شکاف‌های کانترکت | `D:\pariya\kiva-fe\docs\FEATURES.md` |
| نقشه‌ی کار و گزارش جلسه‌ها | [`docs/PLAN.md`](docs/PLAN.md) |
| استانداردهای کد | اسکیل‌های `data-fetching` و `error-ui` |
| دیزاین | دیزاین‌سیستم کیوا (`src/tailwind/kiva/*` = `kiva/assets/kiva.css`) + الگوی پنل حساب کاربری فروشگاه |

## اجرا

```bash
npm install
npm run dev
```

```bash
npm run mock
```

```env
# .env
NEXT_PUBLIC_API_URL="http://localhost:8090/api/v1/"
NEXT_PUBLIC_STORE_URL="http://localhost:3100"   # لینک‌های «مشاهده در سایت»
```

- پنل روی **3200**، بک‌اند آزمایشی روی **8090** (فروشگاه 3100/8080 دست نمی‌خورد).
- سرورها در `.claude/launch.json` هم هستند: `bo-dev` و `bo-mock`.
- **قبل از کامیت:** `npx tsc --noEmit` · `npx eslint src mock` · `npx next build`

### بک‌اند واقعی

- پنل باید روی **زیردامنه‌ی `kiva.ir`** باشد (مثلاً `admin.kiva.ir`) و origin آن در فهرست مجاز `POST /auth/refresh` و `/auth/logout` باشد؛ کوکی نشست `SameSite=Strict` است.
- در توسعه `http://localhost:3200` باید مجاز باشد، وگرنه بعد از هر رفرش صفحه به ورود برمی‌گردید.

## بک‌اند Mock (`mock/`)

پیاده‌سازی `/admin/*` قرارداد + ورود و `/me` + خواندن‌های عمومی که پنل لازم دارد، در حافظه و با داده‌های طرح. با هر ری‌استارت داده از نو ساخته می‌شود؛ **نشست‌ها در یک فایل temp می‌مانند** تا با `--watch` از پنل بیرون نیفتید.

| شماره | نقش |
|---|---|
| `09120000001` | مدیر کل (`ADMIN`) |
| `09120000002` | مدیر کاتالوگ (`CATALOG_MANAGER`) |
| `09120000003` | اپراتور سفارش (`OPERATOR`) |
| `09120000004` | ویراستار محتوا (`CONTENT_EDITOR`) |
| `09120000005` | پشتیبانی (`SUPPORT`) |
| هر شماره‌ی دیگر | مشتری ← «به پنل مدیریت دسترسی نداری» |

- کد OTP: هر ۵ رقم؛ `00000` اشتباه، `11111` منقضی؛ هر شماره هر ۱۲۰ ثانیه یک کد؛ `09999999999` همیشه `RATE_LIMITED`.
- نام کوکی mock پیش‌فرض `kiva_bo_rt` است (`MOCK_COOKIE`) تا با mock فروشگاه روی localhost قاطی نشود. فرانت اسم کوکی را نمی‌داند.
- `POST /api/v1/__mock/expire-access-tokens` همه‌ی access tokenها را منقضی می‌کند (تست تمدید).
- ساختار: `server.mjs` (راه‌انداز)، `lib.mjs`، `db.mjs` (کاربرها)، `auth.mjs`، `media.mjs`، `catalog.mjs` (داده‌ی کاتالوگ)، `admin/<بخش>.mjs` (سفارش، کاتالوگ، بازاریابی، محتوا، پشتیبانی، تنظیمات).

## بخش‌ها

| مسیر | بخش | نقش |
|---|---|---|
| `/` | داشبورد: صف‌های کاری هر نقش + گزارش فروش (ADMIN) | همه |
| `/orders`، `/orders/[code]` | صف سفارش؛ عکس قبل از ارسال، ارسال، وضعیت، یادداشت، استرداد | ADMIN، OPERATOR (استرداد فقط ADMIN) |
| `/returns` | مرجوعی‌ها و تصمیم | ADMIN، OPERATOR |
| `/products`، `/products/new`، `/products/[id]` | محصول، رنگ‌ها و گالری، انتشار، موجودی | ADMIN، CATALOG_MANAGER |
| `/inventory`، `/categories`، `/colors`، `/materials` | انبار و طبقه‌بندی | ADMIN، CATALOG_MANAGER |
| `/discount-codes` | کدهای تخفیف | ADMIN |
| `/campaigns`، `/banners`، `/announcements`، `/testimonials` | بازاریابی | ADMIN، CONTENT_EDITOR |
| `/blog`، `/faq`، `/pages` | محتوا | ADMIN، CONTENT_EDITOR |
| `/reviews`، `/contact-messages`، `/customers` | پشتیبانی (نقش‌دادن فقط ADMIN) | ADMIN، SUPPORT |
| `/settings` | تنظیمات فروشگاه | ADMIN |

منو و دکمه‌ها از `roles` کاربر ساخته می‌شوند ولی **فقط برای نمایش**اند؛ تصمیم با سرور است و `403` بلوک «به این بخش دسترسی نداری» نشان می‌دهد، بدون بیرون کردن.

## ساختار

```
src/
├── app/
│   ├── layout.tsx، queryProvider.tsx، sessionProvider.tsx
│   ├── (auth)/login            — ورود OTP (شماره ← کد)
│   ├── (panel)/layout.tsx      — پوسته (سایدبار نقش‌محور + شمارنده‌ی صف‌ها) و گارد ورود
│   ├── (panel)/_api            — panelEndpoints (me، logout، آپلود مدیا)، taxonomy، reports
│   ├── (panel)/<section>/      — page.tsx، _api/<x>Endpoints.ts، _components/<name>/<name>.tsx، _utils/apiError.ts
│   └── _components/            — ui و common (از فروشگاه) + panel (DataTable، Pager، SearchInput، MediaUploader، ProductPicker، …)
├── config/  httpClient/  hooks/ (useTableState، useUrlFilters، useCan)  store/  types/  utils/ (labels، roles، period، …)
└── tailwind/kiva/*.css (دیزاین‌سیستم) + components.css + admin/*.css (پوسته، جدول، فرم، بلوک‌ها)
```

**قراردادها** همان `kiva-fe`: `useQuery`/`useMutation` مستقیم در کامپوننت با `withMappedError`، کلیدهای سلسله‌مراتبی، بدون کش و retry، خطای کوئری با `toErrorView` + `ErrorComponent2`، خطای میوتیشن با toast یا پیام زیر فیلد (`fieldErrorsOf`). فیلترهای لیست در URL (`useUrlFilters`)، صفحه‌بندی با `useTableState`. فرم‌های داخل مودال کامپوننت جدا هستند تا با بسته شدن از نو شروع شوند.

## شکاف‌های کانترکت که در UI گفته شده

جزئیات در FEATURES §۷ و `docs/PLAN.md`: لیست ادمین بلاگ/پیام رضایت/صفحات/اطلاعیه (از endpoint عمومی خوانده می‌شوند)، دسته و نویسنده‌ی بلاگ، ویرایش/حذف متریال و حذف رنگ، انجام درخواست تغییر مشتری، ادامه‌ی چرخه‌ی مرجوعی، وضعیت استرداد، جزئیات مشتری، حذف کمپین. همچنین فروشگاه فعلاً بنرها، نوار اطلاعیه و متن‌های تنظیمات را از محتوای ثابت خودش می‌خواند (FEATURES §۶).
