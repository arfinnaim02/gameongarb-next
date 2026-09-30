import {
  Prisma,
} from "@prisma/client";

import {
  NextResponse,
} from "next/server";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  serializeAdminSizeChart,
  sizeChartEditorSchema,
  sizeChartNameKey,
} from "@/lib/size-charts";

/* =========================================================
   GET
   ========================================================= */

export async function GET() {
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

  const charts =
    await db.sizeChart.findMany({
      include: {
        _count: {
          select: {
            products:
              true,
          },
        },
      },

      orderBy: {
        name:
          "asc",
      },
    });

  return NextResponse.json({
    charts:
      charts.map(
        serializeAdminSizeChart,
      ),
  });
}

/* =========================================================
   POST
   ========================================================= */

export async function POST(
  request:
    Request,
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
    const input =
      sizeChartEditorSchema.parse(
        await request.json(),
      );

    const chart =
      await db.sizeChart.create({
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

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "SIZE_CHART_CREATED",

        entityType:
          "SizeChart",

        entityId:
          chart.id,

        metadata: {
          name:
            chart.name,

          columns:
            input.columns
              .length,

          rows:
            input.rows.length,
        },
      },
    });

    return NextResponse.json(
      {
        chart:
          serializeAdminSizeChart(
            chart,
          ),

        message:
          "Size chart created.",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Size chart create error:",
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
            : "Unable to create size chart.",
      },
      {
        status: 400,
      },
    );
  }
}