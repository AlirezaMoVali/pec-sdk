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

export default PecUtils;
