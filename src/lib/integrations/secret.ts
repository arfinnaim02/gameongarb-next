import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM =
  "aes-256-gcm";

type EncryptedPayload = {
  version:
    1;

  iv:
    string;

  tag:
    string;

  data:
    string;
};

function getEncryptionKey() {
  const encoded =
    process.env
      .INTEGRATION_ENCRYPTION_KEY;

  if (!encoded) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY is not configured.",
    );
  }

  let key:
    Buffer;

  try {
    key =
      Buffer.from(
        encoded,
        "base64",
      );
  } catch {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY is invalid.",
    );
  }

  if (
    key.length !==
    32
  ) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }

  return key;
}

export function encryptIntegrationSecret(
  value:
    unknown,
) {
  const key =
    getEncryptionKey();

  const iv =
    randomBytes(
      12,
    );

  const cipher =
    createCipheriv(
      ALGORITHM,
      key,
      iv,
    );

  const plaintext =
    JSON.stringify(
      value,
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        plaintext,
        "utf8",
      ),

      cipher.final(),
    ]);

  const tag =
    cipher.getAuthTag();

  const payload:
    EncryptedPayload = {
    version:
      1,

    iv:
      iv.toString(
        "base64",
      ),

    tag:
      tag.toString(
        "base64",
      ),

    data:
      encrypted.toString(
        "base64",
      ),
  };

  return Buffer.from(
    JSON.stringify(
      payload,
    ),
    "utf8",
  ).toString(
    "base64",
  );
}

export function decryptIntegrationSecret<
  T,
>(
  ciphertext:
    string,
): T {
  const key =
    getEncryptionKey();

  let payload:
    EncryptedPayload;

  try {
    payload =
      JSON.parse(
        Buffer.from(
          ciphertext,
          "base64",
        ).toString(
          "utf8",
        ),
      ) as EncryptedPayload;
  } catch {
    throw new Error(
      "Stored integration credentials are invalid.",
    );
  }

  if (
    payload.version !==
    1
  ) {
    throw new Error(
      "Unsupported integration credential version.",
    );
  }

  const decipher =
    createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(
        payload.iv,
        "base64",
      ),
    );

  decipher.setAuthTag(
    Buffer.from(
      payload.tag,
      "base64",
    ),
  );

  let decrypted:
    Buffer;

  try {
    decrypted =
      Buffer.concat([
        decipher.update(
          Buffer.from(
            payload.data,
            "base64",
          ),
        ),

        decipher.final(),
      ]);
  } catch {
    throw new Error(
      "Unable to decrypt integration credentials.",
    );
  }

  return JSON.parse(
    decrypted.toString(
      "utf8",
    ),
  ) as T;
}