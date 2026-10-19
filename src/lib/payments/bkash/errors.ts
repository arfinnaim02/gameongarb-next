import type {
  BkashApiErrorPayload,
} from "@/lib/payments/bkash/types";

export class BkashApiError
  extends Error {
  readonly status:
    number | null;

  readonly code:
    string | null;

  readonly payload:
    BkashApiErrorPayload | null;

  constructor({
    message,
    status,
    code,
    payload,
  }: {
    message:
      string;

    status?:
      number | null;

    code?:
      string | null;

    payload?:
      BkashApiErrorPayload | null;
  }) {
    super(
      message,
    );

    this.name =
      "BkashApiError";

    this.status =
      status ??
      null;

    this.code =
      code ??
      null;

    this.payload =
      payload ??
      null;
  }
}

export function getBkashErrorMessage(
  payload:
    BkashApiErrorPayload |
    null,
) {
  if (!payload) {
    return "bKash API request failed.";
  }

  if (
    typeof payload.errorMessage ===
      "string" &&
    payload.errorMessage.trim()
  ) {
    return payload
      .errorMessage
      .trim();
  }

  if (
    typeof payload.statusMessage ===
      "string" &&
    payload.statusMessage.trim()
  ) {
    return payload
      .statusMessage
      .trim();
  }

  if (
    typeof payload.message ===
      "string" &&
    payload.message.trim()
  ) {
    return payload
      .message
      .trim();
  }

  return "bKash API request failed.";
}