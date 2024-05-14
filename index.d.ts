import { PaymentService } from './paymentService'; // Assuming you have exported PaymentService class

declare namespace Pec {
  interface PecInstance {
    paymentService: PaymentService;
  }

  function createInstance(terminalPin: string, defaultCallbackURL?: string): PecInstance;
}

export = Pec;
