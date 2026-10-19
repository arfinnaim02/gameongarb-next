const REQUIRED_KEYS = [
  "BKASH_BASE_URL",
  "BKASH_APP_KEY",
  "BKASH_APP_SECRET",
  "BKASH_USERNAME",
  "BKASH_PASSWORD",
  "BKASH_CALLBACK_URL",
  "BKASH_TOKEN_ENCRYPTION_KEY",
] as const;

type RequiredKey =
  (typeof REQUIRED_KEYS)[number];

function requiredEnv(
  key:
    RequiredKey,
) {
  const value =
    process.env[key]
      ?.trim();

  if (!value) {
    throw new Error(
      `${key} is not configured.`,
    );
  }

  return value;
}

function normalizeBaseUrl(
  value:
    string,
) {
  return value.replace(
    /\/+$/,
    "",
  );
}

export type BkashMode =
  | "sandbox"
  | "production";

export function getBkashConfig() {
  const mode =
    (
      process.env
        .BKASH_MODE ??
      "sandbox"
    )
      .trim()
      .toLowerCase();

  if (
    mode !==
      "sandbox" &&
    mode !==
      "production"
  ) {
    throw new Error(
      "BKASH_MODE must be sandbox or production.",
    );
  }

  return {
    mode:
      mode as BkashMode,

    baseUrl:
      normalizeBaseUrl(
        requiredEnv(
          "BKASH_BASE_URL",
        ),
      ),

    appKey:
      requiredEnv(
        "BKASH_APP_KEY",
      ),

    appSecret:
      requiredEnv(
        "BKASH_APP_SECRET",
      ),

    username:
      requiredEnv(
        "BKASH_USERNAME",
      ),

    password:
      requiredEnv(
        "BKASH_PASSWORD",
      ),

    callbackUrl:
      requiredEnv(
        "BKASH_CALLBACK_URL",
      ),

    tokenEncryptionKey:
      requiredEnv(
        "BKASH_TOKEN_ENCRYPTION_KEY",
      ),

    timeoutMs:
      30_000,
  };
}