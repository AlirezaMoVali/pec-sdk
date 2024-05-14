import axios, { AxiosResponse } from 'axios';
import { isValidURL, parseXmlResponse } from './helpers';
import PecUtils from './pecUtils';

//* fixed values for methods
const SOAP_PAYMENT_REQUEST_HEADER =
  'https://pec.Shaparak.ir/NewIPGServices/Sale/SaleService/SaleServiceSoap/SalePaymentRequestRequest';

const SOAP_PAYMENT_VERIFICATION_HEADER =
  'https://pec.Shaparak.ir/NewIPGServices/Confirm/ConfirmService/ConfirmPayment';

const SOAP_PAYMENT_REVERSE_HEADER =
  'https://pec.Shaparak.ir/NewIPGServices/Reversal/ReversalService/ReversalRequest';

const CONTENT_TYPE_HEADER = 'application/xml';

//* list of interfaces for methods
export interface PaymentRequestInput {
  amount: number;
  orderId: number;
  currency: 'rial' | 'toman';
  callbackURL?: string;
}

export interface PaymentRequestOutput {
  status: number;
  message: string;
  token: number;
  url?: string | undefined;
}

export interface PaymentVerificationInput {
  token: number;
}

export interface PaymentVerificationOutput {
  status: number;
  cardNumberMasked: string;
  token: number;
  RRN: number;
}

export interface PaymentReverseInput {
  token: number;
}

export interface PaymentReverseOutput {
  status: number;
  message: string;
  token: number;
}

interface SoapPaymentRequestResponse {
  'soap:Envelope': {
    'soap:Body': {
      SalePaymentRequestResponse: {
        SalePaymentRequestResult: {
          Status: number;
          Token: number;
          Message: string;
        };
      };
    };
  };
}

interface SoapPaymentVerificationResponse {
  'soap:Envelope': {
    'soap:Body': {
      ConfirmPaymentResponse: {
        ConfirmPaymentResult: {
          Status: number;
          CardNumberMasked: string;
          Token: number;
          RRN: string;
        };
      };
    };
  };
}

interface SoapPaymentReverseResponse {
  'soap:Envelope': {
    'soap:Body': {
      ReversalRequestResponse: {
        ReversalRequestResult: {
          Status: number;
          Token: number;
          Message: string;
        };
      };
    };
  };
}

export class PaymentService {
  private defaultCallbackURL: string | undefined;
  private terminalPin: string;

  constructor(terminalPin: string, defaultCallbackURL?: string) {
    this.terminalPin = terminalPin;
    this.defaultCallbackURL = defaultCallbackURL;
  }

  //* method: creating a new payment in pec ipg with given args
  async paymentRequest(input: PaymentRequestInput): Promise<PaymentRequestOutput> {
    console.log('🚀 ~ PaymentService ~ paymentRequest ~ input:', input);

    const mergedHeaders = {
      'soap-action': SOAP_PAYMENT_REQUEST_HEADER,
      'Content-Type': CONTENT_TYPE_HEADER,
    };

    //* converting amount based on given currency
    let convertedAmount = input.currency === 'rial' ? input.amount * 10 : input.amount;

    //* check existence of callbackURL
    const callbackURL = input.callbackURL || this.defaultCallbackURL;

    if (!callbackURL) {
      throw new Error('ارسال مقدار callbackURL الزامی است');
    }

    //* simple validation for given callbackURL
    if (callbackURL && !isValidURL(callbackURL)) {
      throw new Error('مقدار ارسالی برای callbackURL نامعتبر است');
    }

    //* prepare request body
    const gatewayBody = PecUtils.PaymentRequestBody(
      this.terminalPin,
      convertedAmount,
      input.orderId,
      callbackURL
    );

    try {
      //* making request with body and header
      const response: AxiosResponse<Document> = await axios.post(
        SOAP_PAYMENT_REQUEST_HEADER,
        gatewayBody,
        {
          headers: mergedHeaders,
          responseType: 'document',
        }
      );

      //* parsing XML typed resposne from pec API gateway to JSON
      const xmlString = new XMLSerializer().serializeToString(response.data);
      const jsonResponse = await parseXmlResponse<SoapPaymentRequestResponse>(xmlString);

      const { Status, Token, Message } =
        jsonResponse['soap:Envelope']['soap:Body']['SalePaymentRequestResponse'][
          'SalePaymentRequestResult'
        ];

      //! url field has value ONLY if your request has met requirements
      const url =
        Status === 0 && Token > 0 ? `https://pec.shaparak.ir/NewIPG/?token=${Token}` : undefined;

      return {
        status: Status,
        token: Token,
        message: Message,
        url: url,
      };
    } catch (error: unknown) {
      console.error('Error occurred while processing PaymentRequest:', (error as Error).message);
      throw new Error('Failed to process PaymentRequest. Please try again later.');
    }
  }

  //* method: verifying a payment of yours in pec system
  async paymentVerification(input: PaymentVerificationInput): Promise<PaymentVerificationOutput> {
    const mergedHeaders = {
      'soap-action': SOAP_PAYMENT_VERIFICATION_HEADER,
      'Content-Type': CONTENT_TYPE_HEADER,
    };

    //* prepare request body
    const gatewayBody = PecUtils.PaymentVerificationBody(this.terminalPin, input.token);

    try {
      //* making request with body and header
      const response: AxiosResponse<Document> = await axios.post(
        SOAP_PAYMENT_VERIFICATION_HEADER,
        gatewayBody,
        {
          headers: mergedHeaders,
          responseType: 'document',
        }
      );

      //* parsing XML typed resposne from pec API gateway to JSON
      const xmlString = new XMLSerializer().serializeToString(response.data);
      const jsonResponse = await parseXmlResponse<SoapPaymentVerificationResponse>(xmlString);

      const { Status, CardNumberMasked, Token, RRN } =
        jsonResponse['soap:Envelope']['soap:Body']['ConfirmPaymentResponse'][
          'ConfirmPaymentResult'
        ];

      return {
        status: Status,
        token: Token,
        cardNumberMasked: CardNumberMasked,
        RRN: parseInt(RRN),
      };
    } catch (error: unknown) {
      console.error(
        'Error occurred while processing PaymentVerification:',
        (error as Error).message
      );
      throw new Error('Failed to process PaymentVerification. Please try again later.');
    }
  }

  //* method: refunding a payment of yours in pec system.
  //! Alert: this method only works within 15 minutes timeframe from your payment request in pec system
  async paymentReverse(input: PaymentReverseInput): Promise<PaymentReverseOutput> {
    const mergedHeaders = {
      'soap-action': SOAP_PAYMENT_REVERSE_HEADER,
      'Content-Type': CONTENT_TYPE_HEADER,
    };

    //* prepare request body
    const gatewayBody = PecUtils.PaymentReverseBody(this.terminalPin, input.token);

    try {
      //* making request with body and header
      const response: AxiosResponse<Document> = await axios.post(
        SOAP_PAYMENT_REVERSE_HEADER,
        gatewayBody,
        {
          headers: mergedHeaders,
          responseType: 'document',
        }
      );

      //* parsing XML typed resposne from pec API gateway to JSON
      const xmlString = new XMLSerializer().serializeToString(response.data);
      const jsonResponse = await parseXmlResponse<SoapPaymentReverseResponse>(xmlString);

      const { Status, Token, Message } =
        jsonResponse['soap:Envelope']['soap:Body']['ReversalRequestResponse'][
          'ReversalRequestResult'
        ];

      return {
        status: Status,
        token: Token,
        message: Message,
      };
    } catch (error: unknown) {
      console.error('Error occurred while processing PaymentReverse:', (error as Error).message);
      throw new Error('Failed to process PaymentReverse. Please try again later.');
    }
  }
}
