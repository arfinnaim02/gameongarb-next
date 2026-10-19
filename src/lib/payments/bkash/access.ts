/* =========================================================
   BKASH ACCESS CONTROL

   Production-safe defaults:

   - Public access is OFF unless explicitly enabled.
   - UAT access is OFF unless explicitly enabled.
   - UAT customers must be explicitly allowlisted by phone.

   Callback and admin reconciliation must NOT use this
   helper because an already-created payment still needs
   to be verified even if storefront access is later closed.
   ========================================================= */

function envEnabled(
  value:
    string |
    undefined,
) {
  return (
    value
      ?.trim()
      .toLowerCase() ===
    "true"
  );
}

function normalizePhone(
  value:
    string |
    null |
    undefined,
) {
  return (
    value ??
    ""
  ).replace(
    /\D/g,
    "",
  );
}

function getUatPhones() {
  return (
    process.env
      .BKASH_UAT_PHONES ??
    ""
  )
    .split(
      ",",
    )
    .map(
      (
        phone,
      ) =>
        normalizePhone(
          phone,
        ),
    )
    .filter(
      Boolean,
    );
}

export type BkashAccessMode =
  | "DISABLED"
  | "UAT"
  | "PUBLIC";

export function getBkashAccessMode():
  BkashAccessMode {
  if (
    envEnabled(
      process.env
        .BKASH_PUBLIC_ENABLED,
    )
  ) {
    return "PUBLIC";
  }

  if (
    envEnabled(
      process.env
        .BKASH_UAT_ENABLED,
    )
  ) {
    return "UAT";
  }

  return "DISABLED";
}

export function isBkashAllowedForPhone(
  phone:
    string |
    null |
    undefined,
) {
  const mode =
    getBkashAccessMode();

  if (
    mode ===
    "PUBLIC"
  ) {
    return true;
  }

  if (
    mode !==
    "UAT"
  ) {
    return false;
  }

  const normalizedPhone =
    normalizePhone(
      phone,
    );

  if (
    !normalizedPhone
  ) {
    return false;
  }

  return getUatPhones()
    .includes(
      normalizedPhone,
    );
}