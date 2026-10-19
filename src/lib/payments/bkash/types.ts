export type BkashGrantTokenResponse = {
  id_token?:
    string;

  token_type?:
    string;

  expires_in?:
    number;

  refresh_token?:
    string;

  statusCode?:
    string;

  statusMessage?:
    string;

  errorCode?:
    string;

  errorMessage?:
    string;

  [key: string]:
    unknown;
};

export type BkashApiErrorPayload = {
  statusCode?:
    string;

  statusMessage?:
    string;

  errorCode?:
    string;

  errorMessage?:
    string;

  message?:
    string;

  [key: string]:
    unknown;
};

export type BkashAccessToken = {
  token:
    string;

  expiresAt:
    number;
};

export type BkashCreatePaymentResponse = {
  paymentId?:
    string;

  paymentID?:
    string;

  bkashURL?:
    string;

  callbackURL?:
    string;

  successCallbackURL?:
    string;

  failureCallbackURL?:
    string;

  cancelledCallbackURL?:
    string;

  amount?:
    string;

  intent?:
    string;

  currency?:
    string;

  paymentCreateTime?:
    string;

  transactionStatus?:
    string;

  merchantInvoiceNumber?:
    string;

  signature?:
    string;

  statusCode?:
    string;

  statusMessage?:
    string;

  errorCode?:
    string;

  errorMessage?:
    string;

  [key: string]:
    unknown;
};