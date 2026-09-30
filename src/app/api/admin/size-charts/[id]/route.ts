import {
  Prisma,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import {
  NextResponse,
} from "next/server";

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
  serializeAdminSizeChart,
  sizeChartEditorSchema,
  sizeChartNameKey,
} from "@/lib/size-charts";

/* =========================================================
   PATCH
   ========================================================= */

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
      sizeChartEditorSchema.parse(
        await request.json(),
      );

    const products =
      await db.product.findMany({
        where: {
          sizeChartId:
            id,
        },

        select: {
          slug:
            true,
        },
      });

    const chart =
      await db.sizeChart.update({
        where: {
          id,
        },

        data: {
          name:
            input.name,

          nameKey:
            sizeChartNameKey(
              input.name,
            ),

          unit:
            input.unit,

          note:
            input.note ||
            null,

          columns:
            input.columns as
              Prisma.InputJsonValue,

          rows:
            input.rows as
              Prisma.InputJsonValue,

          active:
            input.active,
        },

        include: {
          _count: {
            select: {
              products:
                true,
            },
          },
        },
      });

    for (
      const product
      of products
    ) {
      revalidatePath(
        `/product/${product.slug}`,
      );
    }

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "SIZE_CHART_UPDATED",

        entityType:
          "SizeChart",

        entityId:
          chart.id,

        metadata: {
          name:
            chart.name,
        },
      },
    });

    return NextResponse.json({
      chart:
        serializeAdminSizeChart(
          chart,
        ),

      message:
        "Size chart updated.",
    });
  } catch (error) {
    console.error(
      "Size chart update error:",
      error,
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError &&
      error.code ===
        "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "A size chart with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to update size chart.",
      },
      {
        status: 400,
      },
    );
  }
}

/* =========================================================
   DELETE / ARCHIVE
   ========================================================= */

export async function DELETE(
  _request:
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

    const chart =
      await db.sizeChart.findUniqueOrThrow({
        where: {
          id,
        },

        include: {
          _count: {
            select: {
              products:
                true,
            },
          },
        },
      });

    /*
     * Never remove a chart currently
     * assigned to products.
     *
     * Archive it instead so existing
     * products keep their measurement
     * guide.
     */
    if (
      chart._count
        .products >
      0
    ) {
      const archived =
        await db.sizeChart.update({
          where: {
            id,
          },

          data: {
            active:
              false,
          },

          include: {
            _count: {
              select: {
                products:
                  true,
              },
            },
          },
        });

      return NextResponse.json({
        mode:
          "archived",

        chart:
          serializeAdminSizeChart(
            archived,
          ),

        message:
          "Size chart archived because products are using it.",
      });
    }

    await db.sizeChart.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      mode:
        "deleted",

      message:
        "Size chart deleted.",
    });
  } catch (error) {
    console.error(
      "Size chart delete error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete size chart.",
      },
      {
        status: 400,
      },
    );
  }
}