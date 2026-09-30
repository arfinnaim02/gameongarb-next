import {
  notFound,
} from "next/navigation";

import {
  SizeChartManager,
} from "@/components/admin/size-chart-manager";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

import {
  requireAdmin,
} from "@/lib/session";

import {
  serializeAdminSizeChart,
} from "@/lib/size-charts";

export const dynamic =
  "force-dynamic";

export default async function SizeChartsAdminPage() {
  const admin =
    await requireAdmin();

  if (
    !hasPermission(
      admin.role,
      "products",
    )
  ) {
    notFound();
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

  return (
    <SizeChartManager
      initialCharts={
        charts.map(
          serializeAdminSizeChart,
        )
      }
    />
  );
}