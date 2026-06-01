import { randomBytes } from 'crypto';
import type { CallbackPayload, Currency } from './types.js';
import { PAYMENT_PAGE_BASE, PEC_SUCCESS_STATUS } from './constants.js';

/** Converts an amount to Rials for PEC API requests. */
export function toRials(amount: number, currency: Currency = 'toman'): number {
  return currency === 'toman' ? amount * 10 : amount;
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

export function isValidHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
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

/** Parses callback body from Express/Fastify (query or POST body). */
export function parseCallback(body: Record<string, unknown>): CallbackPayload {
  return {
    token: readField(body, ['Token', 'token']),
    status: Number(readField(body, ['status', 'Status']) || NaN),
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
  accounts: Array<{ amount: number; iban: string; payId: string }>
): Array<{ Amount: number; IBAN: string; PayId: string }> {
  return accounts.map((account) => ({
    Amount: account.amount,
    IBAN: account.iban,
    PayId: account.payId,
  }));
}
