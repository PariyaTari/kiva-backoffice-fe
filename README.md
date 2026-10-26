# کیوا — پنل مدیریت (Kiva Backoffice)

پنل ادمین فروشگاه **کیوا**؛ راست‌به‌چپ و فارسی. ساختار و قراردادها عین فروشگاه (`kiva-fe`) است.

**Next.js 16 (App Router)** · **TypeScript** · **Tailwind CSS 3** · **TanStack Query v5** · **Zustand** · **axios**

| مرجع | کجا |
|---|---|
| قرارداد API | `kiva-openapi.yml` همین پروژه — نسخه‌ی **1.22.0**، بخش `/admin/*` (همه‌ی ۸۱ متد در `_api/*Endpoints.ts` صدا زده می‌شوند) |
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

پیاده‌سازی `/admin/*` قرارداد 1.22.0 + ورود و `/me` + خواندن‌های عمومی که پنل لازم دارد، در حافظه و با داده‌های طرح. هر نوشتن موفق زیر `/admin/*` یک ردیف لاگ تغییرات می‌سازد (`mock/admin/audit.mjs`). نمونه‌های آزمایشی: مقاله‌ی زمان‌بندی‌شده، آرشیو و مقاله‌ای با کارت محصولِ برداشته‌شده (#999)؛ مرجوعی `RECEIVED` با مبلغ پیشنهادی. با هر ری‌استارت داده از نو ساخته می‌شود؛ **نشست‌ها در یک فایل temp می‌مانند** تا با `--watch` از پنل بیرون نیفتید.

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
- `POST /api/v1/__mock/new-order` یک سفارش تازه‌ی «در حال آماده‌سازی» بالای صف می‌گذارد (تست شمارنده‌های زنده و نوار «سفارش تازه رسید»).
- ساختار: `server.mjs` (راه‌انداز)، `lib.mjs`، `db.mjs` (کاربرها)، `auth.mjs`، `media.mjs`، `catalog.mjs` (داده‌ی کاتالوگ)، `admin/<بخش>.mjs` (سفارش، کاتالوگ، بازاریابی، محتوا، پشتیبانی، تنظیمات).

## بخش‌ها

| مسیر | بخش | نقش |
|---|---|---|
| `/` | داشبورد: صف‌های کاری هر نقش + گزارش فروش (ADMIN) | همه |
| `/orders`، `/orders/[code]` | صف سفارش (انتخاب چندتایی ← چاپ گروهی برگه‌ی ارسال، خروجی CSV با همان فیلترها)؛ عکس قبل از ارسال (و ورینت جایگزین درخواست تغییر با نام/رنگ/موجودی)، ارسال، وضعیت، یادداشت، چاپ برگه‌ی ارسال، استرداد | ADMIN، OPERATOR (استرداد فقط ADMIN) |
| `/returns` | چرخه‌ی کامل مرجوعی (تصمیم، جمع‌آوری، رسیدن به انبار، استرداد با مبلغ پیشنهادی سرور، بستن)؛ ترتیب «قدیمی‌ترین اول» برای مرسوله‌های نرسیده | ADMIN، OPERATOR |
| `/products`، `/products/new`، `/products/[id]` | محصول، رنگ‌ها و گالری، انتشار، موجودی | ADMIN، CATALOG_MANAGER |
| `/inventory`، `/stock-alerts`، `/categories`، `/colors`، `/materials` | انبار، صف «موجود شد خبرم کن» و طبقه‌بندی | ADMIN، CATALOG_MANAGER |
| `/discount-codes` | کدهای تخفیف | ADMIN |
| `/campaigns`، `/banners`، `/announcements`، `/testimonials` | بازاریابی | ADMIN، CONTENT_EDITOR |
| `/newsletter` | مشترکین خبرنامه (جستجوی ایمیل، شمار فعال‌ها، CSV) | ADMIN |
| `/blog`، `/faq`، `/pages` | محتوا (بلاگ با پیش‌نویس، زمان‌بندی‌شده و آرشیو) | ADMIN، CONTENT_EDITOR |
| `/reviews`، `/contact-messages`، `/customers`، `/customers/[id]` | پشتیبانی؛ صفحه‌ی مشتری با آدرس‌ها و آخرین سفارش‌ها (نقش‌دادن فقط ADMIN) | ADMIN، SUPPORT |
| `/settings`، `/audit-log` | تنظیمات فروشگاه و لاگ تغییرات پنل (+ کارت «تاریخچه‌ی تغییرات» در صفحه‌ی سفارش، محصول و مشتری) | ADMIN |

**در همه‌ی صفحه‌ها:** جستجوی سریع (`Ctrl+K` یا `/`) روی سفارش، محصول و مشتری — فقط بخش‌هایی که نقشت دارد؛ شمارنده‌های صف در سایدبار و داشبورد هر دقیقه (وقتی تب دیده می‌شود) تازه می‌شوند و `/orders` با رسیدن سفارش تازه نوار «به‌روزرسانی لیست» نشان می‌دهد.

منو و دکمه‌ها از `roles` کاربر ساخته می‌شوند ولی **فقط برای نمایش**اند؛ تصمیم با سرور است و `403` بلوک «به این بخش دسترسی نداری» نشان می‌دهد، بدون بیرون کردن.

## ساختار

```
src/
├── app/
│   ├── layout.tsx، queryProvider.tsx، sessionProvider.tsx
│   ├── (auth)/login            — ورود OTP (شماره ← کد)
│   ├── (panel)/layout.tsx      — پوسته (سایدبار نقش‌محور + شمارنده‌ی زنده‌ی صف‌ها، جستجوی سریع) و گارد ورود
│   ├── (panel)/_api            — panelEndpoints (me، logout، آپلود مدیا)، taxonomy، reports
│   ├── (panel)/<section>/      — page.tsx، _api/<x>Endpoints.ts، _components/<name>/<name>.tsx، _utils/apiError.ts
│   └── _components/            — ui و common (از فروشگاه) + panel (DataTable، Pager، SearchInput، MediaUploader، ProductPicker، HtmlField، UnsavedGuard، …)
├── config/  httpClient/  hooks/ (useTableState، useUrlFilters، useCan)  store/  types/  utils/ (labels، roles، period، …)
└── tailwind/kiva/*.css (دیزاین‌سیستم) + components.css + admin/*.css (پوسته، جدول، فرم، بلوک‌ها، چاپ)
```

**قراردادها** همان `kiva-fe`: `useQuery`/`useMutation` مستقیم در کامپوننت با `withMappedError`، کلیدهای سلسله‌مراتبی، بدون کش و retry، خطای کوئری با `toErrorView` + `ErrorComponent2`، خطای میوتیشن با toast یا پیام زیر فیلد (`fieldErrorsOf` — مسیر فیلدها dot-notation کانترکت است: `blocks.0.text`، `items.2.mediaId`؛ `fieldErrorsWith` برای ۴۰۹/۴۰۰هایی که مال یک فیلدند مثل `DUPLICATE_SLUG`، `CAMPAIGN_OVERLAP`، `CTA_INCOMPLETE`). فیلترهای لیست در URL (`useUrlFilters`)، صفحه‌بندی با `useTableState`. فرم‌های داخل مودال کامپوننت جدا هستند تا با بسته شدن از نو شروع شوند. `PUT`ها جایگزینی کامل‌اند: فیلد اختیاری خالی `null` فرستاده می‌شود.

**فرم‌های بلند** (محصول، مقاله، صفحه، تنظیمات، FAQ، اطلاعیه): متن HTML با `HtmlField` (سوییچ «کد / پیش‌نمایش» به سبک `.prose` فروشگاه و فهرست تگ‌هایی که سرور حذف می‌کند — `HTML_TAGS` در `utils/html.ts`)، و `<UnsavedGuard dirty />` که با تغییرات ذخیره‌نشده جلوی بستن تب و کلیک روی لینک‌های پنل را می‌گیرد (دکمه‌ی back مرورگر را نه).

## شکاف‌های کانترکت که مانده‌اند

از 1.22.0 شکاف‌های قبلی بسته شده‌اند: نویسنده‌های بلاگ با `GET /admin/blog/authors` (با `isDefault`)، دسته‌ها طبق کانترکت از `GET /blog/categories` (همه، خالی‌ها هم)، `Review.product` در پنل پر است، و حساب حذف‌شده در `GET /admin/customers/{id}` کد خودش را دارد (`404 CUSTOMER_DELETED` ← «این حساب حذف شده»). سفارش حساب حذف‌شده بی‌نام است و پنل «حساب حذف‌شده» نشان می‌دهد.

**آنچه هنوز فقط در پنل اثر دارد:** فروشگاه (`kiva-fe`) بنرهای صفحه‌ی اصلی، نوار اطلاعیه و متن‌های فوتر/پشتیبانی/شبکه‌ها را هنوز از محتوای ثابت خودش می‌خواند (`homeContent`، `SITE_CONFIG` از `/kiva-configs/config` ِ خود Next)، نه از `GET /banners` و `GET /config` ِ بک‌اند — صفحه‌های بنر، اطلاعیه و تنظیمات پنل همین را در یک یادداشت می‌گویند. پول (ارسال، رایگان، رزرو)، FAQ، صفحات ثابت، پیام‌های رضایت، کمپین و آمار «درباره ما» را فروشگاه از بک‌اند می‌خواند.
