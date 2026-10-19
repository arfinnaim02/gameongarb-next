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