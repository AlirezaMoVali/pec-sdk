import axios from 'axios';
import { REPORT_API_URL, WSDL } from './constants.js';
import { PecTransportError, PecValidationError } from './errors.js';
import { callSoapMethod } from './soapClient.js';
import type {
  BillInfoResult,
  ConfirmPaymentInput,
  ConfirmPaymentResult,
  GetBillInfoInput,
  GetSaleReportInput,
  GetSaleReportResult,
  PaymentTokenResult,
  PecClientOptions,
  RequestBillPaymentInput,
  RequestGovernmentMultiplexedPaymentInput,
  RequestGovernmentPaymentInput,
  RequestMobileTopupInput,
  RequestMultiplexedPaymentInput,
  RequestPaymentInput,
  ReversePaymentInput,
  ReversePaymentResult,
} from './types.js';
import {
  buildPaymentTokenResult,
  isValidUrl,
  mapMultiplexedAccounts,
  normalizeBillInfoResult,
  normalizeSoapField,
  normalizeSoapNumber,
  toRials,
  validateAmount,
  validateSaleReportDateRange,
} from './utils.js';

export class PecClient {
  private readonly loginAccount: string;
  private readonly defaultCallbackUrl?: string;

  constructor(options: PecClientOptions) {
    if (!options?.loginAccount?.trim()) {
      throw new PecValidationError('loginAccount is required');
    }

    this.loginAccount = options.loginAccount;
    this.defaultCallbackUrl = options.callbackUrl;
  }

  /** Starts a standard sale payment and returns a token plus redirect URL. */
  async requestPayment(input: RequestPaymentInput): Promise<PaymentTokenResult> {
    const callbackUrl = this.resolveCallbackUrl(input.callbackUrl);
    const currency = input.currency ?? 'toman';

    const result = await callSoapMethod<{
      SalePaymentRequestResult?: Record<string, unknown>;
    } | null>(WSDL.SALE, 'SalePaymentRequestAsync', {
      requestData: {
        LoginAccount: this.loginAccount,
        Amount: toRials(input.amount, currency),
        OrderId: input.orderId,
        CallBackUrl: callbackUrl,
        AdditionalData: input.additionalData ?? '',
        Originator: input.originator ?? '',
      },
    });

    const payload = result?.SalePaymentRequestResult ?? {};
    return buildPaymentTokenResult(payload.Status, payload.Token, payload.Message);
  }

  /** Starts an online multiplexed sale (تسهیم آنلاین). */
  async requestMultiplexedPayment(
    input: RequestMultiplexedPaymentInput
  ): Promise<PaymentTokenResult> {
    const callbackUrl = this.resolveCallbackUrl(input.callbackUrl);
    const currency = input.currency ?? 'toman';

    const result = await callSoapMethod<{
      MultiplexedSaleWithIBANPaymentRequestResult?: Record<string, unknown>;
    } | null>(WSDL.MULTIPLEXED_SALE, 'MultiplexedSaleWithIBANPaymentRequestAsync', {
      requestData: {
        LoginAccount: this.loginAccount,
        Amount: toRials(input.amount, currency),
        OrderId: input.orderId,
        CallBackUrl: callbackUrl,
        AdditionalData: '',
        Originator: input.originator ?? '',
        MultiplexedAccounts: {
          MultiplexedAccount: mapMultiplexedAccounts(input.accounts, currency),
        },
      },
    });

    const payload = result?.MultiplexedSaleWithIBANPaymentRequestResult ?? {};
    return buildPaymentTokenResult(payload.Status, payload.Token, payload.Message);
  }

  /** Starts a government-ID sale (شناسه حساب دولتی). */
  async requestGovernmentPayment(
    input: RequestGovernmentPaymentInput
  ): Promise<PaymentTokenResult> {
    const callbackUrl = this.resolveCallbackUrl(input.callbackUrl);
    const currency = input.currency ?? 'toman';

    const result = await callSoapMethod<{
      SalePaymentRequestResult?: Record<string, unknown>;
    } | null>(WSDL.GOVERNMENT_SALE, 'SalePaymentRequestAsync', {
      requestData: {
        LoginAccount: this.loginAccount,
        Amount: toRials(input.amount, currency),
        OrderId: input.orderId,
        CallBackUrl: callbackUrl,
        AdditionalData: `GOVId=${input.govId}`,
        Originator: input.originator ?? '',
      },
    });

    const payload = result?.SalePaymentRequestResult ?? {};
    return buildPaymentTokenResult(payload.Status, payload.Token, payload.Message);
  }

  /** Starts a government sale with multiplexed IBAN accounts. */
  async requestGovernmentMultiplexedPayment(
    input: RequestGovernmentMultiplexedPaymentInput
  ): Promise<PaymentTokenResult> {
    const callbackUrl = this.resolveCallbackUrl(input.callbackUrl);
    const currency = input.currency ?? 'toman';

    const result = await callSoapMethod<{
      GovSaleWithMultiIbanPaymentRequestSW2Result?: Record<string, unknown>;
    } | null>(WSDL.GOVERNMENT_SALE, 'GovSaleWithMultiIbanPaymentRequestSW2Async', {
      requestData: {
        LoginAccount: this.loginAccount,
        Amount: toRials(input.amount, currency),
        OrderId: input.orderId,
        CallBackUrl: callbackUrl,
        AdditionalData: `GOVId=${input.govId}`,
        Originator: input.originator ?? '',
        MultiplexedAccounts: {
          MultiplexedAccount: mapMultiplexedAccounts(input.accounts, currency),
        },
      },
    });

    const payload = result?.GovSaleWithMultiIbanPaymentRequestSW2Result ?? {};
    return buildPaymentTokenResult(payload.Status, payload.Token, payload.Message);
  }

  /** Starts a bill payment request. */
  async requestBillPayment(input: RequestBillPaymentInput): Promise<PaymentTokenResult> {
    const callbackUrl = this.resolveCallbackUrl(input.callbackUrl);

    const result = await callSoapMethod<{
      BillPaymentRequestResult?: Record<string, unknown>;
    } | null>(WSDL.BILL, 'BillPaymentRequestAsync', {
      requestData: {
        LoginAccount: this.loginAccount,
        BillId: input.billId,
        PayId: input.payId,
        OrderId: input.orderId,
        Amount: '',
        CallBackUrl: callbackUrl,
        AdditionalData: input.additionalData ?? '',
        Originator: input.originator ?? '',
      },
    });

    const payload = result?.BillPaymentRequestResult ?? {};
    return buildPaymentTokenResult(payload.Status, payload.Token, payload.Message);
  }

  /** Retrieves bill details before payment. */
  async getBillInfo(input: GetBillInfoInput): Promise<BillInfoResult> {
    if (!input.billId?.trim() || !input.payId?.trim()) {
      throw new PecValidationError('billId and payId are required');
    }

    const result = await callSoapMethod<{
      GetBillInfoResult?: Record<string, unknown>;
    } | null>(WSDL.BILL, 'GetBillInfoAsync', {
      billId: input.billId,
      payId: input.payId,
    });

    const payload = result?.GetBillInfoResult ?? {};
    return normalizeBillInfoResult(payload);
  }

  /** Starts a mobile top-up/charge request. */
  async requestMobileTopup(input: RequestMobileTopupInput): Promise<PaymentTokenResult> {
    const callbackUrl = this.resolveCallbackUrl(input.callbackUrl);
    const currency = input.currency ?? 'toman';

    const result = await callSoapMethod<{
      TopupChargeRequestResult?: Record<string, unknown>;
    } | null>(WSDL.MOBILE_TOPUP, 'TopupChargeRequestAsync', {
      requestData: {
        LoginAccount: this.loginAccount,
        OrderId: input.orderId,
        ChargeMobileNumber: input.chargeMobileNumber,
        RequesterMobileNumber: input.requesterMobileNumber,
        TopupType: input.topupType,
        Amount: toRials(input.amount, currency),
        CallBackUrl: callbackUrl,
        AdditionalData: input.additionalData ?? '',
        Originator: input.originator ?? '',
      },
    });

    const payload = result?.TopupChargeRequestResult ?? {};
    return buildPaymentTokenResult(payload.Status, payload.Token, payload.Message);
  }

  /** Confirms/settles a successful payment using its token. */
  async confirmPayment(input: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
    if (input.token === undefined || input.token === null || input.token === '') {
      throw new PecValidationError('token is required');
    }

    const result = await callSoapMethod<{
      ConfirmPaymentResult?: Record<string, unknown>;
    } | null>(WSDL.CONFIRM, 'ConfirmPaymentAsync', {
      requestData: {
        LoginAccount: this.loginAccount,
        Token: input.token,
      },
    });

    const payload = result?.ConfirmPaymentResult ?? {};
    return {
      status: normalizeSoapNumber(payload.Status),
      token: normalizeSoapField(payload.Token),
      cardNumberMasked: normalizeSoapField(payload.CardNumberMasked),
      rrn: normalizeSoapField(payload.RRN),
    };
  }

  /** Reverses a payment. Works only within the bank's allowed time window. */
  async reversePayment(input: ReversePaymentInput): Promise<ReversePaymentResult> {
    if (input.token === undefined || input.token === null || input.token === '') {
      throw new PecValidationError('token is required');
    }

    const result = await callSoapMethod<{
      ReversalRequestResult?: Record<string, unknown>;
    } | null>(WSDL.REVERSAL, 'ReversalRequestAsync', {
      requestData: {
        LoginAccount: this.loginAccount,
        Token: input.token,
      },
    });

    const payload = result?.ReversalRequestResult ?? {};
    return {
      status: normalizeSoapNumber(payload.Status),
      token: normalizeSoapField(payload.Token),
      message: normalizeSoapField(payload.Message),
    };
  }

  /** Fetches sale transactions from PEC reporting REST API. */
  async getSaleReport(input: GetSaleReportInput): Promise<GetSaleReportResult> {
    if (!input.username?.trim() || !input.password?.trim()) {
      throw new PecValidationError('username and password are required');
    }

    validateSaleReportDateRange(input.fromDate, input.toDate);

    const authToken = Buffer.from(`${input.username}|${input.password}`).toString('base64');

    try {
      const response = await axios.post<GetSaleReportResult>(
        REPORT_API_URL,
        {
          FromDate: input.fromDate,
          ToDate: input.toDate,
          RRN: input.rrn ?? '',
          OrderId: input.orderId ?? '',
          Token: input.token ?? '',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authToken}`,
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      throw new PecTransportError('Failed to fetch sale report', error);
    }
  }

  private resolveCallbackUrl(callbackUrl?: string): string {
    const resolved = callbackUrl ?? this.defaultCallbackUrl;

    if (!resolved) {
      throw new PecValidationError('callbackUrl is required');
    }

    if (!isValidUrl(resolved)) {
      throw new PecValidationError('callbackUrl must be a valid HTTP or HTTPS URL');
    }

    return resolved;
  }
}
