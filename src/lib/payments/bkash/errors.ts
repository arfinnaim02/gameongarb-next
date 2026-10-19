import type {
  BkashApiErrorPayload,
} from "@/lib/payments/bkash/types";

export type BkashErrorCategory =
  | "AUTH"
  | "VALIDATION"
  | "INSUFFICIENT_BALANCE"
  | "DUPLICATE"
  | "EXPIRED"
  | "NOT_FOUND"
  | "LIMIT"
  | "TEMPORARY"
  | "UNKNOWN";

export class BkashApiError
  extends Error {
  readonly status:
    number | null;

  readonly code:
    string | null;

  readonly payload:
    BkashApiErrorPayload | null;

  readonly category:
    BkashErrorCategory;

  constructor({
    message,
    status,
    code,
    payload,
    category =
      "UNKNOWN",
  }: {
    message:
      string;

    status?:
      number | null;

    code?:
      string | null;

    payload?:
      BkashApiErrorPayload | null;

    category?:
      BkashErrorCategory;
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

    this.category =
      category;
  }
}

/* =========================================================
   RAW PROVIDER MESSAGE
   ========================================================= */

export function getBkashErrorMessage(
  payload:
    BkashApiErrorPayload |
    null,
) {
  if (
    !payload
  ) {
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

/* =========================================================
   ERROR CATEGORY

   Do not depend only on provider text.
   HTTP status is the first signal.

   Message matching is only fallback classification until
   the exact merchant error-code catalogue is loaded from
   bKash UAT documentation.
   ========================================================= */

export function getBkashErrorCategory({
  status,
  code,
  message,
}: {
  status:
    number | null;

  code:
    string | null;

  message:
    string;
}): BkashErrorCategory {
  const normalized =
    message
      .trim()
      .toLowerCase();

  if (
    status ===
      401 ||
    status ===
      403
  ) {
    return "AUTH";
  }

  if (
    status ===
      429
  ) {
    return "LIMIT";
  }

  if (
    status !==
      null &&
    status >=
      500
  ) {
    return "TEMPORARY";
  }

  if (
    normalized.includes(
      "insufficient",
    ) &&
    normalized.includes(
      "balance",
    )
  ) {
    return "INSUFFICIENT_BALANCE";
  }

  if (
    normalized.includes(
      "duplicate",
    ) ||
    normalized.includes(
      "already exists",
    ) ||
    normalized.includes(
      "already processed",
    )
  ) {
    return "DUPLICATE";
  }

  if (
    normalized.includes(
      "expired",
    )
  ) {
    return "EXPIRED";
  }

  if (
    normalized.includes(
      "not found",
    ) ||
    normalized.includes(
      "invalid payment",
    )
  ) {
    return "NOT_FOUND";
  }

  if (
    normalized.includes(
      "limit",
    )
  ) {
    return "LIMIT";
  }

  if (
    status ===
      400 ||
    status ===
      422
  ) {
    return "VALIDATION";
  }

  /*
   * Preserve the provider code even if it is not
   * yet mapped. We will add the official code table
   * once the exact bKash UAT catalogue is available.
   */
  if (
    code
  ) {
    return "UNKNOWN";
  }

  return "UNKNOWN";
}

/* =========================================================
   CUSTOMER-SAFE MESSAGE
   ========================================================= */

export function getBkashCustomerMessage(
  error:
    unknown,
) {
  if (
    !(error instanceof
      BkashApiError)
  ) {
    return "Unable to process the bKash payment right now. Please try again.";
  }

  switch (
    error.category
  ) {
    case "INSUFFICIENT_BALANCE":
      return "Your bKash account does not have enough balance for this payment.";

    case "DUPLICATE":
      return "This payment may already have been processed. Please check the payment status before trying again.";

    case "EXPIRED":
      return "This bKash payment session has expired. Please start a new payment.";

    case "NOT_FOUND":
      return "The bKash payment could not be found. Please start the payment again.";

    case "LIMIT":
      return "The bKash payment could not be completed because a transaction limit was reached.";

    case "AUTH":
      return "bKash payment service authentication failed. Please try again later.";

    case "TEMPORARY":
      return "bKash is temporarily unavailable. Please try again shortly.";

    case "VALIDATION":
      return "bKash could not process the payment details. Please try again.";

    default:
      return "Unable to process the bKash payment right now. Please try again.";
  }
}