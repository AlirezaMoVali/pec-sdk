import { randomBytes } from 'crypto';
import type { CallbackPayload, Currency, MultiplexedAccount } from './types.js';
import { PAYMENT_PAGE_BASE, PEC_SUCCESS_STATUS } from './constants.js';
import { PecValidationError } from './errors.js';

const MAX_SALE_REPORT_RANGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Converts an amount to Rials for PEC API requests. */
export function toRials(amount: number, currency: Currency = 'toman'): number {
  validateAmount(amount);
  return currency === 'toman' ? amount * 10 : amount;
}

/** Ensures amount is a positive finite number. */
export function validateAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PecValidationError('amount must be a positive number');
  }
}

export function getPaymentPageUrl(token: string | number): string {
  return `${PAYMENT_PAGE_BASE}${token}`;
}

export function isSuccessStatus(status: number | string): boolean {
  return Number(status) === PEC_SUCCESS_STATUS;
}

/** Returns true when the bank callback indicates a successful payment worth confirming. */
export function shouldConfirmPayment(callback: CallbackPayload): boolean {
  return callback.status === PEC_SUCCESS_STATUS && Number(callback.rrn) > 0;
}

export function generateOrderId(): string {
  return randomBytes(20).toString('hex');
}

/** Validates callback URLs (HTTP for local dev, HTTPS for production). */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

/** @deprecated Use {@link isValidUrl} instead. */
export function isValidHttpsUrl(url: string): boolean {
  return isValidUrl(url) && url.startsWith('https:');
}

function readField(body: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = body[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return '';
}

function parseCallbackStatus(body: Record<string, unknown>): number {
  const raw = readField(body, ['status', 'Status']);
  if (raw === '') {
    return NaN;
  }
  return Number(raw);
}

/**
 * Parses the bank callback payload (PEC POSTs to your callback URL).
 * Pass `req.body` for POST callbacks; merge `req.query` if your route uses GET.
 */
export function parseCallback(body: Record<string, unknown>): CallbackPayload {
  return {
    token: readField(body, ['Token', 'token']),
    status: parseCallbackStatus(body),
    orderId: readField(body, ['OrderId', 'orderId']),
    terminalNo: readField(body, ['TerminalNo', 'terminalNo']),
    amount: readField(body, ['Amount', 'amount']),
    rrn: readField(body, ['RRN', 'rrn']),
  };
}

export function normalizeSoapField(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (Array.isArray(value)) {
    return normalizeSoapField(value[0]);
  }
  return String(value);
}

export function normalizeSoapNumber(value: unknown): number {
  return Number(normalizeSoapField(value));
}

export function buildPaymentTokenResult(
  status: unknown,
  token: unknown,
  message: unknown
): { status: number; token: string; message: string; paymentUrl?: string } {
  const normalizedStatus = normalizeSoapNumber(status);
  const normalizedToken = normalizeSoapField(token);
  const normalizedMessage = normalizeSoapField(message);

  const result = {
    status: normalizedStatus,
    token: normalizedToken,
    message: normalizedMessage,
  };

  if (isSuccessStatus(normalizedStatus) && normalizedToken.length > 0) {
    return { ...result, paymentUrl: getPaymentPageUrl(normalizedToken) };
  }

  return result;
}

export function mapMultiplexedAccounts(
  accounts: MultiplexedAccount[],
  currency: Currency = 'toman'
): Array<{ Amount: number; IBAN: string; PayId: string }> {
  validateMultiplexedAccounts(accounts);

  return accounts.map((account) => ({
    Amount: toRials(account.amount, currency),
    IBAN: account.iban,
    PayId: account.payId,
  }));
}

export function validateMultiplexedAccounts(accounts: MultiplexedAccount[]): void {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new PecValidationError('accounts must be a non-empty array');
  }

  for (const account of accounts) {
    validateAmount(account.amount);
    if (!account.iban?.trim()) {
      throw new PecValidationError('each account must include a valid iban');
    }
    if (!account.payId?.trim()) {
      throw new PecValidationError('each account must include a valid payId');
    }
  }
}

/** Validates sale report date range (max 30 days, end after start). */
export function validateSaleReportDateRange(fromDate: string, toDate: string): void {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new PecValidationError('fromDate and toDate must be valid date strings');
  }

  if (to.getTime() < from.getTime()) {
    throw new PecValidationError('toDate must be on or after fromDate');
  }

  if (to.getTime() - from.getTime() > MAX_SALE_REPORT_RANGE_MS) {
    throw new PecValidationError('date range must not exceed 30 days');
  }
}

export function normalizeBillInfoResult(payload: Record<string, unknown>): {
  status: number;
  message: string;
  amount: string;
  billId: string;
  payId: string;
} {
  return {
    status: normalizeSoapNumber(payload.Status),
    message: normalizeSoapField(payload.Message),
    amount: normalizeSoapField(payload.Amount),
    billId: normalizeSoapField(payload.BillId),
    payId: normalizeSoapField(payload.PayId),
  };
}
