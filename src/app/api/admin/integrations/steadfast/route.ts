import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

import {
  SteadfastClient,
  STEADFAST_PROVIDER,
  type SteadfastCredentials,
} from "@/lib/courier/steadfast";

import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "@/lib/integrations/secret";

export const dynamic =
  "force-dynamic";

const DEFAULT_BASE_URL =
  "https://portal.packzy.com/api/v1";

const saveSchema =
  z.object({
    enabled:
      z.boolean(),

    baseUrl:
      z
        .string()
        .url()
        .default(
          DEFAULT_BASE_URL,
        ),

    apiKey:
      z
        .string()
        .trim()
        .optional(),

    secretKey:
      z
        .string()
        .trim()
        .optional(),
  });

async function authorize() {
  const admin =
    await requireAdminApi();

  if (!admin) {
    return {
      response:
        NextResponse.json(
          {
            error:
              "Unauthorized.",
          },
          {
            status:
              401,
          },
        ),

      admin:
        null,
    };
  }

  if (
    !hasPermission(
      admin.role,
      "settings",
    )
  ) {
    return {
      response:
        NextResponse.json(
          {
            error:
              "Forbidden.",
          },
          {
            status:
              403,
          },
        ),

      admin:
        null,
    };
  }

  return {
    response:
      null,

    admin,
  };
}

function maskSecret(
  value:
    string,
) {
  if (
    value.length <=
    6
  ) {
    return "••••••";
  }

  return `••••••••${value.slice(
    -4,
  )}`;
}

/* =========================================================
   GET CURRENT CONFIG
   ========================================================= */

export async function GET() {
  try {
    const {
      response,
    } =
      await authorize();

    if (response) {
      return response;
    }

    const integration =
      await db.integration.findUnique({
        where: {
          service_provider: {
            service:
              "COURIER",

            provider:
              STEADFAST_PROVIDER,
          },
        },
      });

    let maskedApiKey:
      string |
      null =
      null;

    let maskedSecretKey:
      string |
      null =
      null;

    if (
      integration
        ?.secretCiphertext
    ) {
      try {
        const credentials =
          decryptIntegrationSecret<
            SteadfastCredentials
          >(
            integration.secretCiphertext,
          );

        maskedApiKey =
          maskSecret(
            credentials.apiKey,
          );

        maskedSecretKey =
          maskSecret(
            credentials.secretKey,
          );
      } catch {
        /*
         * Never leak a decryption
         * failure or secret value to
         * the client.
         */
      }
    }

    const config =
      (
        integration?.config ??
        {}
      ) as {
        baseUrl?:
          string;
      };

    return NextResponse.json({
      configured:
        Boolean(
          integration
            ?.secretCiphertext,
        ),

      enabled:
        integration
          ?.enabled ??
        false,

      provider:
        STEADFAST_PROVIDER,

      baseUrl:
        config.baseUrl ??
        DEFAULT_BASE_URL,

      maskedApiKey,

      maskedSecretKey,

      updatedAt:
        integration
          ?.updatedAt
          .toISOString() ??
        null,
    });
  } catch (
    error
  ) {
    console.error(
      "Steadfast settings GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load Steadfast settings.",
      },
      {
        status:
          500,
      },
    );
  }
}

/* =========================================================
   SAVE CONFIG
   ========================================================= */

export async function PUT(
  request:
    Request,
) {
  try {
    const {
      response,
      admin,
    } =
      await authorize();

    if (
      response ||
      !admin
    ) {
      return response;
    }

    const input =
      saveSchema.parse(
        await request.json(),
      );

    const existing =
      await db.integration.findUnique({
        where: {
          service_provider: {
            service:
              "COURIER",

            provider:
              STEADFAST_PROVIDER,
          },
        },
      });

    let current:
      SteadfastCredentials |
      null =
      null;

    if (
      existing
        ?.secretCiphertext
    ) {
      current =
        decryptIntegrationSecret<
          SteadfastCredentials
        >(
          existing.secretCiphertext,
        );
    }

    const apiKey =
      input.apiKey ||
      current?.apiKey ||
      "";

    const secretKey =
      input.secretKey ||
      current?.secretKey ||
      "";

    if (
      input.enabled &&
      (
        !apiKey ||
        !secretKey
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Add both the Steadfast API key and Secret key before enabling the integration.",
        },
        {
          status:
            400,
        },
      );
    }

    const secretCiphertext =
      apiKey &&
      secretKey
        ? encryptIntegrationSecret({
            apiKey,
            secretKey,
          } satisfies SteadfastCredentials)
        : null;

    const integration =
      await db.integration.upsert({
        where: {
          service_provider: {
            service:
              "COURIER",

            provider:
              STEADFAST_PROVIDER,
          },
        },

        create: {
          service:
            "COURIER",

          provider:
            STEADFAST_PROVIDER,

          enabled:
            input.enabled,

          mode:
            "production",

          config: {
            baseUrl:
              input.baseUrl,
          },

          secretCiphertext,
        },

        update: {
          enabled:
            input.enabled,

          mode:
            "production",

          config: {
            baseUrl:
              input.baseUrl,
          },

          ...(secretCiphertext
            ? {
                secretCiphertext,
              }
            : {}),
        },
      });

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "STEADFAST_SETTINGS_UPDATED",

        entityType:
          "Integration",

        entityId:
          integration.id,

        metadata: {
          provider:
            STEADFAST_PROVIDER,

          enabled:
            integration.enabled,

          credentialsUpdated:
            Boolean(
              input.apiKey ||
              input.secretKey,
            ),
        },
      },
    });

    return NextResponse.json({
      message:
        "Steadfast settings saved successfully.",
    });
  } catch (
    error
  ) {
    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            error.issues[0]
              ?.message ??
            "Invalid Steadfast settings.",
        },
        {
          status:
            400,
        },
      );
    }

    console.error(
      "Steadfast settings PUT error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to save Steadfast settings.",
      },
      {
        status:
          400,
      },
    );
  }
}

/* =========================================================
   TEST SAVED CREDENTIALS
   ========================================================= */

export async function POST() {
  try {
    const {
      response,
      admin,
    } =
      await authorize();

    if (
      response ||
      !admin
    ) {
      return response;
    }

    const client =
      await SteadfastClient.fromDatabase();

    /*
     * /get_balance is authenticated,
     * unlike /ping, so success here
     * proves the saved keys work.
     */
    const result =
      await client.getBalance();

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "STEADFAST_CONNECTION_TESTED",

        entityType:
          "Integration",

        metadata: {
          success:
            true,
        },
      },
    });

    return NextResponse.json({
      message:
        "Steadfast connection successful.",

      balance:
        result.currentBalance,
    });
  } catch (
    error
  ) {
    console.error(
      "Steadfast connection test error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Steadfast connection failed.",
      },
      {
        status:
          400,
      },
    );
  }
}