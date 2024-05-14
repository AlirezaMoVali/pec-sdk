import { PaymentService } from './paymentService'; // Assuming you have exported PaymentService class

declare namespace pec {
  interface PecInstance {
    paymentService: PaymentService;
  }

  function createInstance(terminalPin: string, defaultCallbackURL?: string): PecInstance;
}

export = pec;
