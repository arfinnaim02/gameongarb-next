import {
  loadEnvConfig,
} from "@next/env";

import {
  Resend,
} from "resend";

loadEnvConfig(
  process.cwd(),
);

async function main() {
  const apiKey =
    process.env.RESEND_API_KEY;

  const from =
    process.env.EMAIL_FROM;

  const replyTo =
    process.env.EMAIL_REPLY_TO;

  const recipient =
    process.argv[2];

  if (
    !apiKey ||
    !from
  ) {
    throw new Error(
      "RESEND_API_KEY or EMAIL_FROM is missing.",
    );
  }

  if (
    !recipient
  ) {
    throw new Error(
      "Usage: npx tsx scripts/test-resend-email.ts your@email.com",
    );
  }

  const resend =
    new Resend(
      apiKey,
    );

  const {
    data,
    error,
  } =
    await resend.emails.send({
      from,

      to: [
        recipient,
      ],

      subject:
        "Game On Garb — Email System Test",

      html: `
        <div style="font-family:Arial,sans-serif;padding:30px;color:#111;">
          <h2>Game On Garb</h2>

          <p>
            Your transactional email system is connected successfully.
          </p>

          <p style="color:#777;">
            This is a controlled production-readiness test.
          </p>
        </div>
      `,

      text:
        "Game On Garb transactional email system is connected successfully.",

      ...(replyTo
        ? {
            replyTo,
          }
        : {}),
    });

  if (
    error
  ) {
    console.error(
      "Resend error:",
      error,
    );

    process.exit(
      1,
    );
  }

  console.log(
    "Email accepted successfully.",
  );

  console.log(
    "Resend email ID:",
    data?.id,
  );
}

main().catch(
  (
    error,
  ) => {
    console.error(
      error,
    );

    process.exit(
      1,
    );
  },
);