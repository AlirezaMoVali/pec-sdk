import { describe, expect, it } from 'vitest';
import { PecValidationError } from '../src/errors.js';
import {
  buildPaymentTokenResult,
  isValidUrl,
  mapMultiplexedAccounts,
  normalizeSoapField,
  normalizeSoapNumber,
  parseCallback,
  shouldConfirmPayment,
  toRials,
  validateAmount,
  validateMultiplexedAccounts,
  validateSaleReportDateRange,
} from '../src/utils.js';

describe('toRials', () => {
  it('converts toman to rials', () => {
    expect(toRials(50000, 'toman')).toBe(500000);
  });

  it('keeps rial unchanged', () => {
    expect(toRials(500000, 'rial')).toBe(500000);
  });

  it('rejects invalid amounts', () => {
    expect(() => toRials(0, 'toman')).toThrow(PecValidationError);
    expect(() => toRials(-1, 'rial')).toThrow(PecValidationError);
    expect(() => toRials(NaN, 'toman')).toThrow(PecValidationError);
  });
});

describe('isValidUrl', () => {
  it('accepts https URLs', () => {
    expect(isValidUrl('https://shop.example/payment/callback')).toBe(true);
  });

  it('accepts http localhost for development', () => {
    expect(isValidUrl('http://localhost:3000/payment/callback')).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });
});

describe('parseCallback', () => {
  it('parses successful bank POST body', () => {
    const callback = parseCallback({
      Token: '12345',
      status: '0',
      OrderId: '99',
      TerminalNo: '1',
      Amount: '500000',
      RRN: '987654',
    });

    expect(callback.token).toBe('12345');
    expect(callback.status).toBe(0);
    expect(callback.rrn).toBe('987654');
    expect(shouldConfirmPayment(callback)).toBe(true);
  });

  it('returns NaN status when missing', () => {
    const callback = parseCallback({ Token: '1' });
    expect(Number.isNaN(callback.status)).toBe(true);
    expect(shouldConfirmPayment(callback)).toBe(false);
  });

  it('handles numeric status zero', () => {
    const callback = parseCallback({ status: 0, RRN: '1' });
    expect(callback.status).toBe(0);
  });
});

describe('buildPaymentTokenResult', () => {
  it('adds paymentUrl on success', () => {
    const result = buildPaymentTokenResult(0, '999', 'OK');
    expect(result.paymentUrl).toBe('https://pec.shaparak.ir/NewIPG/?Token=999');
  });

  it('omits paymentUrl on failure', () => {
    const result = buildPaymentTokenResult(-1, '', 'Error');
    expect(result.paymentUrl).toBeUndefined();
  });
});

describe('normalizeSoapField', () => {
  it('unwraps xml2js arrays', () => {
    expect(normalizeSoapField(['0'])).toBe('0');
  });

  it('normalizes numbers to strings', () => {
    expect(normalizeSoapNumber(0)).toBe(0);
  });
});

describe('mapMultiplexedAccounts', () => {
  it('converts account amounts using currency', () => {
    const mapped = mapMultiplexedAccounts(
      [{ amount: 10000, iban: 'IR123', payId: 'p1' }],
      'toman'
    );
    expect(mapped[0].Amount).toBe(100000);
  });

  it('requires non-empty accounts', () => {
    expect(() => mapMultiplexedAccounts([], 'toman')).toThrow(PecValidationError);
  });
});

describe('validateMultiplexedAccounts', () => {
  it('requires iban and payId', () => {
    expect(() =>
      validateMultiplexedAccounts([{ amount: 1000, iban: '', payId: 'x' }])
    ).toThrow(PecValidationError);
  });
});

describe('validateSaleReportDateRange', () => {
  it('rejects ranges over 30 days', () => {
    expect(() =>
      validateSaleReportDateRange('2024-01-01 00:00:00', '2024-03-01 00:00:00')
    ).toThrow(PecValidationError);
  });

  it('rejects inverted ranges', () => {
    expect(() =>
      validateSaleReportDateRange('2024-02-01 00:00:00', '2024-01-01 00:00:00')
    ).toThrow(PecValidationError);
  });

  it('accepts valid ranges', () => {
    expect(() =>
      validateSaleReportDateRange('2024-01-01 00:00:00', '2024-01-15 00:00:00')
    ).not.toThrow();
  });
});
