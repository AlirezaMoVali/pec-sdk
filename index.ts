import { PaymentService } from './paymentService';

namespace pec {
  export interface PecInstance {
    paymentService: PaymentService;
  }

  export function createInstance(terminalPin: string, defaultCallbackURL?: string): PecInstance {
    const paymentService = new PaymentService(terminalPin, defaultCallbackURL);
    return { paymentService };
  }
}

export = pec;
