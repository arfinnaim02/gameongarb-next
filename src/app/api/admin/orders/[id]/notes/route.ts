import {
  revalidatePath,
} from "next/cache";

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

export const dynamic =
  "force-dynamic";

const schema =
  z.object({
    notes:
      z
        .string()
        .max(
          5000,
          "Notes must be 5000 characters or less.",
        ),
  });

export async function PATCH(
  request:
    Request,

  {
    params,
  }: {
    params:
      Promise<{
        id:
          string;
      }>;
  },
) {
  try {
    const admin =
      await requireAdminApi();

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "Unauthorized.",
        },
        {
          status:
            401,
        },
      );
    }

    if (
      !hasPermission(
        admin.role,
        "orders",
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden.",
        },
        {
          status:
            403,
        },
      );
    }

    const {
      id,
    } =
      await params;

    const input =
      schema.parse(
        await request.json(),
      );

    const existing =
      await db.order.findUnique({
        where: {
          id,
        },

        select: {
          id:
            true,

          number:
            true,
        },
      });

    if (
      !existing
    ) {
      return NextResponse.json(
        {
          error:
            "Order not found.",
        },
        {
          status:
            404,
        },
      );
    }

    const notes =
      input.notes.trim();

    await db.order.update({
      where: {
        id,
      },

      data: {
        internalNotes:
          notes ||
          null,
      },
    });

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "ORDER_NOTES_UPDATED",

        entityType:
          "Order",

        entityId:
          id,

        metadata: {
          orderNumber:
            existing.number,

          hasNotes:
            Boolean(
              notes,
            ),
        },
      },
    });

    revalidatePath(
      `/admin/orders/${id}`,
    );

    return NextResponse.json({
      message:
        "Internal notes saved successfully.",
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
            "Invalid notes.",
        },
        {
          status:
            400,
        },
      );
    }

    console.error(
      "Order notes PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to save order notes.",
      },
      {
        status:
          400,
      },
    );
  }
}