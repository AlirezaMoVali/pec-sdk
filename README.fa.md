# pec-payment-sdk

[![npm version](https://img.shields.io/npm/v/pec-payment-sdk?logo=npm&logoColor=white)](https://www.npmjs.com/package/pec-payment-sdk)
[![npm downloads](https://img.shields.io/npm/dm/pec-payment-sdk?logo=npm&logoColor=white&label=downloads)](https://www.npmjs.com/package/pec-payment-sdk)
[![GitHub stars](https://img.shields.io/github/stars/AlirezaMoVali/pec-sdk?style=flat&logo=github)](https://github.com/AlirezaMoVali/pec-sdk/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/AlirezaMoVali/pec-sdk?style=flat&logo=github)](https://github.com/AlirezaMoVali/pec-sdk/issues)
[![GitHub license](https://img.shields.io/github/license/AlirezaMoVali/pec-sdk?style=flat)](https://github.com/AlirezaMoVali/pec-sdk/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[English](./README.md) | **فارسی**

SDK نوشته‌شده با TypeScript/JavaScript برای درگاه پرداخت **PEC** (تجارت الکترونیک پارسیان). با Node.js، Express، Fastify، NestJS، Next.js و هر پروژه CommonJS یا ESM سازگار است.

این کتابخانه بر پایه سرویس‌های SOAP رسمی PEC (همان endpointهای نمونه PHP بانک) با API تایپ‌شده و helperهای آماده برای توسعه‌دهندگان ساخته شده است.

## امکانات

- جریان استاندارد خرید، تایید و برگشت تراکنش
- پرداخت با تسهیم آنلاین
- پرداخت با شناسه حساب دولتی و تسهیم چند حسابی دولتی
- پرداخت قبض و استعلام قبض
- خرید شارژ موبایل
- گزارش تراکنش‌های فروش (REST API)
- **تبدیل ریال / تومان** (SDK مبلغ را به ریال برای بانک ارسال می‌کند)
- پشتیبانی از **CommonJS** (`require`) و **ESM** (`import`)
- تایپ‌های کامل TypeScript

## پیش‌نیاز

- Node.js **۱۸ به بالا**

## نصب

```bash
npm install pec-payment-sdk
```

## شروع سریع

### ESM / TypeScript

```typescript
import {
  PecClient,
  generateOrderId,
  parseCallback,
  shouldConfirmPayment,
  isSuccessStatus,
} from 'pec-payment-sdk';

const client = new PecClient({
  loginAccount: process.env.PEC_LOGIN_ACCOUNT!,
  callbackUrl: 'https://your-shop.com/payment/callback',
});

const sale = await client.requestPayment({
  amount: 50000,
  currency: 'toman', // پیش‌فرض؛ SDK مبلغ ۵۰۰٬۰۰۰ ریال به PEC می‌فرستد
  orderId: generateOrderId(),
});

if (sale.paymentUrl) {
  // کاربر را به صفحه پرداخت بانک هدایت کنید
  res.redirect(sale.paymentUrl);
}
```

### CommonJS

```javascript
const {
  PecClient,
  generateOrderId,
  parseCallback,
  shouldConfirmPayment,
} = require('pec-payment-sdk');

const client = new PecClient({
  loginAccount: process.env.PEC_LOGIN_ACCOUNT,
  callbackUrl: 'https://your-shop.com/payment/callback',
});
```

## فرآیند پرداخت

```
۱. سرور شما     →  client.requestPayment()
۲. هدایت کاربر  →  sale.paymentUrl (درگاه PEC)
۳. پرداخت کاربر →  بانک به callbackUrl شما redirect می‌کند
۴. سرور شما     →  parseCallback() + client.confirmPayment()
```

### هندلر callback (مثال Express)

پس از پرداخت، PEC با **POST** به آدرس callback شما فیلدهایی مثل `Token`، `status`، `OrderId`، `RRN`، `Amount` و `TerminalNo` ارسال می‌کند. مقدار `req.body` را به `parseCallback()` بدهید. اگر route شما query می‌خواند، ابتدا آن را با body ادغام کنید.

آدرس callback می‌تواند برای توسعه محلی **HTTP** (مثل `http://localhost`) یا در production **HTTPS** باشد.

```typescript
app.post('/payment/callback', async (req, res) => {
  const callback = parseCallback(req.body);

  if (!shouldConfirmPayment(callback)) {
    return res.redirect('/payment/failed');
  }

  const result = await client.confirmPayment({ token: callback.token });

  if (isSuccessStatus(result.status)) {
    return res.redirect(`/payment/success?rrn=${result.rrn}`);
  }

  res.redirect('/payment/failed');
});
```

## واحد پول (ریال / تومان)

PEC مبلغ را به **ریال** می‌پذیرد. مبلغ را با واحدی که در اپلیکیشن استفاده می‌کنید بفرستید:

| `currency` | مقدار ورودی | ارسال به PEC |
|------------|-------------|--------------|
| `'toman'` (پیش‌فرض) | `50000` | `500000` ریال |
| `'rial'` | `500000` | `500000` ریال |

```typescript
import { toRials } from 'pec-payment-sdk';

toRials(50000, 'toman'); // 500000
toRials(500000, 'rial'); // 500000
```

در **پرداخت تسهیمی**، مبلغ هر حساب (`accounts[].amount`) با همان `currency` درخواست اصلی به ریال تبدیل می‌شود.

## مرجع API

### ساخت کلاینت

```typescript
const client = new PecClient({
  loginAccount: string;  // PIN پذیرنده (LoginAccount)
  callbackUrl?: string;  // آدرس callback پیش‌فرض
});
```

### متدهای پرداخت

| متد | توضیح |
|-----|--------|
| `requestPayment()` | خرید استاندارد کالا و خدمات |
| `requestMultiplexedPayment()` | پرداخت با تسهیم آنلاین (چند شبا) |
| `requestGovernmentPayment()` | پرداخت با شناسه حساب دولتی |
| `requestGovernmentMultiplexedPayment()` | پرداخت دولتی با تسهیم چند حسابی |
| `requestBillPayment()` | پرداخت قبض |
| `getBillInfo()` | استعلام قبض قبل از پرداخت |
| `requestMobileTopup()` | خرید شارژ موبایل |
| `confirmPayment()` | تایید (تسویه) تراکنش موفق |
| `reversePayment()` | برگشت تراکنش (در بازه زمانی مجاز بانک) |
| `getSaleReport()` | دریافت گزارش تراکنش‌ها (REST API) |

### توابع کمکی

| Export | توضیح |
|--------|--------|
| `generateOrderId()` | تولید شماره سفارش یکتا |
| `getPaymentPageUrl(token)` | ساخت URL هدایت به درگاه |
| `parseCallback(body)` | پارس بدنه POST بازگشتی از بانک |
| `shouldConfirmPayment(callback)` | بررسی آماده بودن callback برای confirm |
| `isSuccessStatus(status)` | `true` وقتی status برابر `0` باشد |
| `isValidUrl(url)` | اعتبارسنجی آدرس callback با HTTP/HTTPS |
| `toRials(amount, currency)` | تبدیل مبلغ به ریال |
| `validateAmount(amount)` | خطا در صورت مبلغ نامعتبر |
| `validateSaleReportDateRange(from, to)` | محدودیت بازه ۳۰ روزه گزارش |

### خطاها

| کلاس | زمان رخداد |
|------|-----------|
| `PecValidationError` | ورودی نامعتبر (مثلاً callback خالی) |
| `PecTransportError` | خطای شبکه یا SOAP |
| `PecError` | خطای عمومی مرتبط با PEC |

## CommonJS و ESM

در هر دو سبک از یک نام پکیج استفاده کنید — Node و bundlerها به‌صورت خودکار build مناسب را انتخاب می‌کنند:

```javascript
// CommonJS
const { PecClient } = require('pec-payment-sdk');
```

```typescript
// ESM
import { PecClient } from 'pec-payment-sdk';
```

## متغیرهای محیطی (پیشنهادی)

```env
PEC_LOGIN_ACCOUNT=your_merchant_pin
```

PIN پذیرنده را commit نکنید. از متغیر محیطی یا secrets manager استفاده کنید.

## لینک‌ها

- [مخزن GitHub](https://github.com/AlirezaMoVali/pec-sdk)
- [مستندات درگاه PEC / پارسیان](https://pgw.pec.ir/)

## مجوز

[MIT](./LICENSE) © Alireza Mohammadvali
