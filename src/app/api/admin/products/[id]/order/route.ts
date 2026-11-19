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

const orderSchema =
  z.object({
    sortOrder:
      z.coerce
        .number()
        .int()
        .min(0)
        .max(999999),
  });

export async function PATCH(
  request:
    Request,

  {
    params,
  }: {
    params:
      Promise<{
        id: string;
      }>;
  },
) {
  const admin =
    await requireAdminApi();

  if (
    !admin ||
    !hasPermission(
      admin.role,
      "products",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const {
      id,
    } =
      await params;

    const input =
      orderSchema.parse(
        await request.json(),
      );

    const product =
      await db.product.update({
        where: {
          id,
        },

        data: {
          sortOrder:
            input.sortOrder,
        },

        select: {
          id:
            true,

          slug:
            true,

          sortOrder:
            true,
        },
      });

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "PRODUCT_ORDER_UPDATED",

        entityType:
          "Product",

        entityId:
          product.id,

        metadata: {
          sortOrder:
            product.sortOrder,
        },
      },
    });

    revalidatePath(
      "/",
    );

    revalidatePath(
      "/shop",
    );

    revalidatePath(
      "/categories",
    );

    revalidatePath(
      `/product/${product.slug}`,
    );

    return NextResponse.json({
      sortOrder:
        product.sortOrder,

      message:
        "Product order updated.",
    });
  } catch (error) {
    console.error(
      "Product order update error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to update product order.",
      },
      {
        status: 400,
      },
    );
  }
}
