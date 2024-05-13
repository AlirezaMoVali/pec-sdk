declare namespace Pec {
  interface PaymentRequestInput {
    amount: number;
    orderId: number;
    currency: 'rial' | 'toman';
    callbackURL?: string;
  }

  interface PaymentRequestOutput {
    status: number;
    message: string;
    token: number;
    url?: string | undefined;
  }

  interface PaymentVerificationInput {
    token: number;
  }

  interface PaymentVerificationOutput {
    status: number;
    cardNumberMasked: string;
    token: number;
    RRN: number;
  }

  interface PaymentReverseInput {
    token: number;
  }

  interface PaymentReverseOutput {
    status: number;
    message: string;
    token: number;
  }

  interface PecInstance {
    PaymentRequest(
      input: PaymentRequestInput,
      headers?: Record<string, string>
    ): Promise<PaymentRequestOutput>;
    PaymentVerification(
      input: PaymentVerificationInput,
      headers?: Record<string, string>
    ): Promise<PaymentVerificationOutput>;
    PaymentReverse(
      input: PaymentReverseInput,
      headers?: Record<string, string>
    ): Promise<PaymentReverseOutput>;
  }
}

class PecUtils {
  static PaymentRequestBody(
    pecPin: string,
    amount: number,
    orderId: number,
    callbackURL: string
  ): string {
    return `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:sal="https://pec.Shaparak.ir/NewIPGServices/Sale/SaleService">
          <soap:Header/>
          <soap:Body>
             <sal:SalePaymentRequest>
                <sal:requestData>
                   <sal:LoginAccount>${pecPin}</sal:LoginAccount>
                   <sal:Amount>${amount}</sal:Amount>
                   <sal:OrderId>${orderId}</sal:OrderId>
                   <sal:CallBackUrl>${callbackURL}</sal:CallBackUrl>
                </sal:requestData>
             </sal:SalePaymentRequest>
          </soap:Body>
        </soap:Envelope>`;
  }

  static PaymentVerificationBody(pecPin: string, token: number): string {
    return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:con="https://pec.Shaparak.ir/NewIPGServices/Confirm/ConfirmService">
    <soapenv:Header/>
    <soapenv:Body>
       <con:ConfirmPayment>
          <con:requestData>
             <con:LoginAccount>${pecPin}</con:LoginAccount>
             <con:Token>${token}</con:Token>
          </con:requestData>
       </con:ConfirmPayment>
    </soapenv:Body>
 </soapenv:Envelope>`;
  }

  static PaymentReverseBody(pecPin: string, token: number): string {
    return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:rev="https://pec.Shaparak.ir/NewIPGServices/Reversal/ReversalService">
    <soapenv:Header/>
    <soapenv:Body>
       <rev:ReversalRequest>
          <rev:requestData>
             <rev:LoginAccount>${pecPin}</rev:LoginAccount>
             <rev:Token>${token}</rev:Token>
          </rev:requestData>
       </rev:ReversalRequest>
    </soapenv:Body>
 </soapenv:Envelope>`;
  }
}

//* list of required headers for service
const SOAP_PAYMENT_REQUEST_HEADER =
  'https://pec.Shaparak.ir/NewIPGServices/Sale/SaleService/SaleServiceSoap/SalePaymentRequestRequest';

const SOAP_PAYMENT_VERIFICATION_HEADER =
  'https://pec.Shaparak.ir/NewIPGServices/Confirm/ConfirmService/ConfirmPayment';

const SOAP_PAYMENT_REVERSE_HEADER =
  'https://pec.Shaparak.ir/NewIPGServices/Reversal/ReversalService/ReversalRequest';

const CONTENT_TYPE_HEADER = 'application/xml';

//* respsone interfaces for service
interface SoapPaymentRequestResponse {
  'soap:Envelope': {
    'soap:Body': {
      SalePaymentRequestResponse: {
        SalePaymentRequestResult: {
          Status: number;
          Message: string;
          Token: number;
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
          CardNumberMasked: number;
          Token: number;
          RRN: number;
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
          Message: string;
          Token: number;
        };
      };
    };
  };
}

//* packages that used in service
import axios from 'axios';
import { parseString } from 'xml2js';

declare const Pec: { create(terminalPin: string): PecInstance } = {
  create(terminalPin: string, defaultCallbackURL?: string): PecInstance {
    return {
      async PaymentRequest(
        input: PaymentRequestInput,
        headers?: Record<string, string>
      ): Promise<PaymentRequestOutput> {
        const mergedHeaders = {
          'soap-action': SOAP_PAYMENT_REQUEST_HEADER,
          'Content-Type': CONTENT_TYPE_HEADER,
        };

        let convertedAmount: string =
          input.currency === 'rial' ? (input.amount * 10).toString() : input.amount.toString();

        if (convertedAmount.includes('.')) {
          convertedAmount = convertedAmount.split('.')[0];
        }

        const callbackURL = input.callbackURL || defaultCallbackURL;

        if (!callbackURL) {
          throw new Error('ارسال مقدار callbackURL الزامی است');
        }

        if (callbackURL && !isValidURL(callbackURL)) {
          throw new Error('مقدار ارسالی برای callbackURL نامعتبر است');
        }

        const gatewayBody = PecUtils.PaymentRequestBody(
          terminalPin,
          convertedAmount,
          input.orderId,
          input.callbackURL
        );

        try {
          const response: AxiosResponse<string> = await axios.post(
            SOAP_PAYMENT_REQUEST_HEADER,
            gatewayBody,
            {
              headers: mergedHeaders,
            }
          );

          const jsonResponse = await parseXmlResponse<SoapPaymentRequestResponse>(response.data);

          const { Status, Token, Message } =
            jsonResponse['soap:Envelope']['soap:Body']['SalePaymentRequestResponse'][
              'SalePaymentRequestResult'
            ];

          const url =
            Status === 0 && Token > 0
              ? `https://pec.shaparak.ir/NewIPG/?token=${Token}`
              : undefined;

          return {
            status: Status,
            token: Token,
            message: Message,
            url: url,
          };
        } catch (error) {
          console.error('Error occurred while processing PaymentRequest:', error.message);
          throw new Error('Failed to process PaymentRequest. Please try again later.');
        }
      },

      async PaymentVerification(
        input: PaymentVerificationInput,
        headers?: Record<string, string>
      ): Promise<PaymentVerificationOutput> {
        const mergedHeaders = {
          'soap-action': SOAP_PAYMENT_VERIFICATION_HEADER,
          'Content-Type': CONTENT_TYPE_HEADER,
        };

        const gatewayBody = PecUtils.PaymentVerificationBody(terminalPin, input.token);

        try {
          const response: AxiosResponse<string> = await axios.post(
            SOAP_PAYMENT_VERIFICATION_HEADER,
            gatewayBody,
            {
              headers: mergedHeaders,
            }
          );

          const jsonResponse = await parseXmlResponse<SoapPaymentVerificationResponse>(
            response.data
          );

          const { Status, CardNumberMasked, Token, RRN } =
            jsonResponse['soap:Envelope']['soap:Body']['ConfirmPaymentResponse'][
              'ConfirmPaymentResult'
            ];

          return {
            status: Status,
            token: Token,
            cardNumberMasked: CardNumberMasked,
            RRN: RRN,
          };
        } catch (error) {
          console.error('Error occurred while processing PaymentVerification:', error.message);
          throw new Error('Failed to process PaymentVerification. Please try again later.');
        }
      },

      async PaymentReverse(
        input: PaymentReverseInput,
        headers?: Record<string, string>
      ): Promise<PaymentReverseOutput> {
        const mergedHeaders = {
          'soap-action': SOAP_PAYMENT_REVERSE_HEADER,
          'Content-Type': CONTENT_TYPE_HEADER,
        };

        const gatewayBody = PecUtils.PaymentReverseBody(terminalPin, input.token);

        try {
          const response: AxiosResponse<string> = await axios.post(
            SOAP_PAYMENT_REVERSE_HEADER,
            gatewayBody,
            {
              headers: mergedHeaders,
            }
          );

          const jsonResponse = await parseXmlResponse<SoapPaymentReverseResponse>(response.data);

          const { Status, Token, Message } =
            jsonResponse['soap:Envelope']['soap:Body']['ReversalRequestResponse'][
              'ReversalRequestResult'
            ];

          return {
            status: Status,
            token: Token,
            message: Message,
          };
        } catch (error) {
          console.error('Error occurred while processing PaymentReverse:', error.message);
          throw new Error('Failed to process PaymentReverse. Please try again later.');
        }
      },
    };
  },
};

async function parseXmlResponse<T>(xmlData: string): Promise<T> {
  return new Promise((resolve, reject) => {
    parseString(xmlData, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result as T);
      }
    });
  });
}

function isValidURL(url: string): boolean {
  const urlPattern = /^https?:\/\/\S+$/i;
  return urlPattern.test(url);
}

export = Pec;
