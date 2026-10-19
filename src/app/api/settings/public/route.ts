import {
  NextResponse,
} from "next/server";

import {
  db,
} from "@/lib/db";

import {
  getBkashAccessMode,
  isBkashAllowedForPhone,
} from "@/lib/payments/bkash/access";

export const dynamic =
  "force-dynamic";

export async function GET(
  request:
    Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const phone =
      url.searchParams
        .get(
          "phone",
        );

    const rows =
      await db.storeSetting.findMany({
        where: {
          key: {
            in: [
              "shipping",
              "payments",
            ],
          },
        },
      });

    const shipping =
      rows.find(
        (
          row,
        ) =>
          row.key ===
          "shipping",
      )?.value as
        | {
            insideDhaka?:
              number;

            outsideDhaka?:
              number;
          }
        | undefined;

    const payments =
      rows.find(
        (
          row,
        ) =>
          row.key ===
          "payments",
      )?.value as
        | {
            codEnabled?:
              boolean;

            bkashEnabled?:
              boolean;
          }
        | undefined;

    const configuredBkashEnabled =
      payments?.bkashEnabled ??
      true;

    const bkashAllowed =
      configuredBkashEnabled &&
      isBkashAllowedForPhone(
        phone,
      );

    return NextResponse.json({
      insideDhaka:
        shipping?.insideDhaka ??
        80,

      outsideDhaka:
        shipping?.outsideDhaka ??
        150,

      codEnabled:
        payments?.codEnabled ??
        true,

      bkashEnabled:
        bkashAllowed,

      bkashAccessMode:
        getBkashAccessMode(),
    });
  } catch {
    /*
     * Fail closed for bKash.
     *
     * If settings/DB temporarily fail, COD can remain
     * available but bKash must not become public by
     * accident.
     */
    return NextResponse.json({
      insideDhaka:
        80,

      outsideDhaka:
        150,

      codEnabled:
        true,

      bkashEnabled:
        false,

      bkashAccessMode:
        "DISABLED",
    });
  }
}