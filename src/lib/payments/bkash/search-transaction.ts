import {
  bkashRequest,
} from "@/lib/payments/bkash/client";

import type {
  BkashSearchTransactionResponse,
} from "@/lib/payments/bkash/types";

export async function searchBkashTransaction(
  trxId:
    string,
) {
  return bkashRequest<BkashSearchTransactionResponse>({
    path:
      "/tokenized-checkout/general/search-transaction/",

    body: {
      trxId,
    },
  });
}