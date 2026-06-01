export const WSDL = {
  SALE: 'https://pec.shaparak.ir/NewIPGServices/Sale/SaleService.asmx?WSDL',
  CONFIRM: 'https://pec.shaparak.ir/NewIPGServices/Confirm/ConfirmService.asmx?WSDL',
  REVERSAL: 'https://pec.shaparak.ir/NewIPGServices/Reverse/ReversalService.asmx?WSDL',
  MULTIPLEXED_SALE:
    'https://pec.shaparak.ir/NewIPGServices/MultiplexedSale/OnlineMultiplexedSalePaymentService.asmx?WSDL',
  GOVERNMENT_SALE:
    'https://pec.shaparak.ir/NewIPGServices/Sale/GovermentIdSaleServiceSW2.asmx?WSDL',
  BILL: 'https://pec.shaparak.ir/NewIPGServices/Bill/BillService.asmx?WSDL',
  MOBILE_TOPUP: 'https://pec.shaparak.ir/NewIPGServices/SimCharge/TopupChargeService.asmx?WSDL',
} as const;

export const PAYMENT_PAGE_BASE = 'https://pec.shaparak.ir/NewIPG/?Token=';

export const REPORT_API_URL = 'https://pgwservices.pec.ir/api/PGWReport/GetSaleReport';

export const PEC_SUCCESS_STATUS = 0;
