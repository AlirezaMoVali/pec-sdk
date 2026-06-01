export type Currency = 'rial' | 'toman';

export type OrderId = string | number;

export interface PecClientOptions {
  /** Merchant terminal PIN (`LoginAccount` in PEC SOAP requests). */
  loginAccount: string;
  /** Default callback URL when not provided per request. */
  callbackUrl?: string;
}

export interface RequestPaymentInput {
  /** Amount in the unit specified by `currency`. Converted to Rials before sending to PEC. */
  amount: number;
  orderId: OrderId;
  currency?: Currency;
  callbackUrl?: string;
  additionalData?: string;
  originator?: string;
}

export interface PaymentTokenResult {
  status: number;
  message: string;
  token: string;
  paymentUrl?: string;
}

export interface ConfirmPaymentInput {
  token: string | number;
}

export interface ConfirmPaymentResult {
  status: number;
  token: string;
  cardNumberMasked: string;
  rrn: string;
}

export interface ReversePaymentInput {
  token: string | number;
}

export interface ReversePaymentResult {
  status: number;
  message: string;
  token: string;
}

export interface MultiplexedAccount {
  amount: number;
  iban: string;
  payId: string;
}

export interface RequestMultiplexedPaymentInput {
  amount: number;
  orderId: OrderId;
  accounts: MultiplexedAccount[];
  currency?: Currency;
  callbackUrl?: string;
  originator?: string;
}

export interface RequestGovernmentPaymentInput {
  amount: number;
  orderId: OrderId;
  govId: string;
  currency?: Currency;
  callbackUrl?: string;
  originator?: string;
}

export interface RequestGovernmentMultiplexedPaymentInput {
  amount: number;
  orderId: OrderId;
  govId: string;
  accounts: MultiplexedAccount[];
  currency?: Currency;
  callbackUrl?: string;
  originator?: string;
}

export interface RequestBillPaymentInput {
  orderId: OrderId;
  billId: string;
  payId: string;
  callbackUrl?: string;
  additionalData?: string;
  originator?: string;
}

export interface GetBillInfoInput {
  billId: string;
  payId: string;
}

export interface BillInfoResult {
  status: number;
  message: string;
  amount: string;
  billId: string;
  payId: string;
}

export interface RequestMobileTopupInput {
  orderId: OrderId;
  chargeMobileNumber: string;
  requesterMobileNumber: string;
  topupType: string | number;
  amount: number;
  currency?: Currency;
  callbackUrl?: string;
  additionalData?: string;
  originator?: string;
}

export interface GetSaleReportInput {
  username: string;
  password: string;
  fromDate: string;
  toDate: string;
  rrn?: string;
  orderId?: OrderId;
  token?: string | number;
}

export interface GetSaleReportResult {
  [key: string]: unknown;
}

/** Fields POSTed by PEC to the merchant callback URL after payment. */
export interface CallbackPayload {
  token: string;
  status: number;
  orderId: string;
  terminalNo: string;
  amount: string;
  rrn: string;
}
