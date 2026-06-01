# pec-sdk

[![npm version](https://img.shields.io/npm/v/pec-sdk?logo=npm&logoColor=white)](https://www.npmjs.com/package/pec-sdk)
[![npm downloads](https://img.shields.io/npm/dm/pec-sdk?logo=npm&logoColor=white&label=downloads)](https://www.npmjs.com/package/pec-sdk)
[![GitHub stars](https://img.shields.io/github/stars/AlirezaMoVali/pec-sdk?style=flat&logo=github)](https://github.com/AlirezaMoVali/pec-sdk/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/AlirezaMoVali/pec-sdk?style=flat&logo=github)](https://github.com/AlirezaMoVali/pec-sdk/issues)
[![GitHub license](https://img.shields.io/github/license/AlirezaMoVali/pec-sdk?style=flat)](https://github.com/AlirezaMoVali/pec-sdk/blob/main/LICENSE)
[![Node.js](https://img.shields.io/node/v/pec-sdk?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**English** | [فارسی](./README.fa.md)

TypeScript/JavaScript SDK for **PEC** (Parsian Electronic Commerce / تجارت الکترونیک پارسیان) payment gateway. Works with Node.js, Express, Fastify, NestJS, Next.js, and any CommonJS or ESM project.

Built on official PEC SOAP services (same endpoints as the bank’s PHP samples) with typed APIs and developer-friendly helpers.

## Features

- Standard sale, confirm, and reverse flows
- Online multiplexed payments (تسهیم آنلاین)
- Government ID payments and government multiplexed payments
- Bill payment and bill inquiry
- Mobile top-up
- Sale transaction reporting (REST API)
- **Rial / Toman** amount handling
- **CommonJS** (`require`) and **ESM** (`import`) support
- Full TypeScript types

## Requirements

- Node.js **18+**

## Installation

```bash
npm install pec-sdk
```

## Quick start

### ESM / TypeScript

```typescript
import {
  PecClient,
  generateOrderId,
  parseCallback,
  shouldConfirmPayment,
  isSuccessStatus,
} from 'pec-sdk';

const client = new PecClient({
  loginAccount: process.env.PEC_LOGIN_ACCOUNT!,
  callbackUrl: 'https://your-shop.com/payment/callback',
});

const sale = await client.requestPayment({
  amount: 50000,
  currency: 'toman', // default; SDK sends 500,000 Rials to PEC
  orderId: generateOrderId(),
});

if (sale.paymentUrl) {
  // Redirect the customer to the bank payment page
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
} = require('pec-sdk');

const client = new PecClient({
  loginAccount: process.env.PEC_LOGIN_ACCOUNT,
  callbackUrl: 'https://your-shop.com/payment/callback',
});
```

## Payment flow

```
1. Your server  →  client.requestPayment()
2. Redirect user →  sale.paymentUrl (PEC gateway)
3. User pays     →  Bank redirects to your callbackUrl
4. Your server   →  parseCallback() + client.confirmPayment()
```

### Callback handler (Express example)

After payment, PEC **POSTs** to your callback URL with fields such as `Token`, `status`, `OrderId`, `RRN`, `Amount`, and `TerminalNo`.

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

## Currency

PEC expects amounts in **Rials**. Pass the amount in the unit your app uses:

| `currency` | You pass | Sent to PEC |
|------------|----------|-------------|
| `'toman'` (default) | `50000` | `500000` Rials |
| `'rial'` | `500000` | `500000` Rials |

```typescript
import { toRials } from 'pec-sdk';

toRials(50000, 'toman'); // 500000
toRials(500000, 'rial'); // 500000
```

## API reference

### Client

```typescript
const client = new PecClient({
  loginAccount: string;  // Merchant PIN (LoginAccount)
  callbackUrl?: string;  // Default callback if omitted per request
});
```

### Payment methods

| Method | Description |
|--------|-------------|
| `requestPayment()` | Standard sale / goods & services |
| `requestMultiplexedPayment()` | Online split payment across IBAN accounts |
| `requestGovernmentPayment()` | Payment with government account ID |
| `requestGovernmentMultiplexedPayment()` | Government payment with split accounts |
| `requestBillPayment()` | Bill payment |
| `getBillInfo()` | Bill inquiry before payment |
| `requestMobileTopup()` | Mobile charge / top-up |
| `confirmPayment()` | Confirm (settle) a successful payment |
| `reversePayment()` | Reverse a payment (within bank time limit) |
| `getSaleReport()` | Fetch transactions via PEC reporting REST API |

### Utilities

| Export | Description |
|--------|-------------|
| `generateOrderId()` | Generate a unique order ID |
| `getPaymentPageUrl(token)` | Build PEC redirect URL |
| `parseCallback(body)` | Parse bank callback POST body |
| `shouldConfirmPayment(callback)` | Check if callback is OK to confirm |
| `isSuccessStatus(status)` | `true` when PEC status is `0` |
| `toRials(amount, currency)` | Convert amount to Rials |

### Errors

| Class | When |
|-------|------|
| `PecValidationError` | Invalid input (e.g. missing callback URL) |
| `PecTransportError` | Network or SOAP failure |
| `PecError` | General PEC-related error |

## Module formats

Use the same package name in both styles — Node and bundlers pick the right build automatically:

```javascript
// CommonJS
const { PecClient } = require('pec-sdk');
```

```typescript
// ESM
import { PecClient } from 'pec-sdk';
```

## Environment variables (recommended)

```env
PEC_LOGIN_ACCOUNT=your_merchant_pin
```

Never commit your merchant PIN. Use environment variables or a secrets manager.

## Links

- [GitHub repository](https://github.com/AlirezaMoVali/pec-sdk)
- [PEC / Parsian gateway documentation](https://pgw.pec.ir/)

## License

[MIT](./LICENSE) © Alireza Mohammadvali
