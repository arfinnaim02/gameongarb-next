import {
  Prisma,
} from "@prisma/client";

import {
  z,
} from "zod";

import type {
  AdminSizeChartRecord,
  PublicSizeChart,
  SizeChartRowData,
  SizeChartUnit,
} from "@/lib/size-chart-types";

/* =========================================================
   ROW SCHEMA
   ========================================================= */

const sizeChartRowSchema =
  z.object({
    size:
      z
        .string()
        .trim()
        .min(
          1,
          "Size name is required.",
        )
        .max(
          40,
          "Size name is too long.",
        ),

    values:
      z
        .array(
          z
            .string()
            .trim()
            .min(
              1,
              "Measurement value is required.",
            )
            .max(
              60,
              "Measurement value is too long.",
            ),
        )
        .max(
          12,
          "A size chart can have a maximum of 12 measurement columns.",
        ),
  });

/* =========================================================
   SIZE CHART EDITOR SCHEMA
   ========================================================= */

export const sizeChartEditorSchema =
  z
    .object({
      name:
        z
          .string()
          .trim()
          .min(
            2,
            "Size chart name must contain at least 2 characters.",
          )
          .max(
            120,
            "Size chart name is too long.",
          ),

      unit:
        z.enum([
          "IN",
          "CM",
          "NONE",
        ]),

      note:
        z
          .string()
          .trim()
          .max(
            500,
            "Size chart note is too long.",
          )
          .default(""),

      columns:
        z
          .array(
            z
              .string()
              .trim()
              .min(
                1,
                "Measurement column name is required.",
              )
              .max(
                60,
                "Measurement column name is too long.",
              ),
          )
          .min(
            1,
            "Add at least one measurement column.",
          )
          .max(
            12,
            "A size chart can have a maximum of 12 measurement columns.",
          ),

      rows:
        z
          .array(
            sizeChartRowSchema,
          )
          .min(
            1,
            "Add at least one size row.",
          )
          .max(
            50,
            "A size chart can have a maximum of 50 size rows.",
          ),

      active:
        z.boolean(),
    })
    .superRefine(
      (
        data,
        context,
      ) => {
        /* ===============================================
           UNIQUE COLUMN NAMES
           =============================================== */

        const columnNames =
          new Set<string>();

        data.columns.forEach(
          (
            column,
            index,
          ) => {
            const key =
              column
                .trim()
                .toLowerCase();

            if (
              columnNames.has(
                key,
              )
            ) {
              context.addIssue({
                code:
                  "custom",

                path: [
                  "columns",
                  index,
                ],

                message:
                  "Measurement column names must be unique.",
              });
            }

            columnNames.add(
              key,
            );
          },
        );

        /* ===============================================
           UNIQUE SIZE NAMES + CORRECT VALUE COUNT
           =============================================== */

        const sizeNames =
          new Set<string>();

        data.rows.forEach(
          (
            row,
            index,
          ) => {
            const sizeKey =
              row.size
                .trim()
                .toLowerCase();

            if (
              sizeNames.has(
                sizeKey,
              )
            ) {
              context.addIssue({
                code:
                  "custom",

                path: [
                  "rows",
                  index,
                  "size",
                ],

                message:
                  "Size names must be unique inside a size chart.",
              });
            }

            sizeNames.add(
              sizeKey,
            );

            if (
              row.values.length !==
              data.columns.length
            ) {
              context.addIssue({
                code:
                  "custom",

                path: [
                  "rows",
                  index,
                  "values",
                ],

                message:
                  "Every size row must contain one measurement value for every column.",
              });
            }
          },
        );
      },
    );

export type SizeChartEditorInput =
  z.infer<
    typeof sizeChartEditorSchema
  >;

/* =========================================================
   UNIQUE NAME KEY
   ========================================================= */

export function sizeChartNameKey(
  value: string,
) {
  return value
    .normalize(
      "NFKC",
    )
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " ",
    );
}

/* =========================================================
   READ COLUMNS FROM PRISMA JSON
   ========================================================= */

function readColumns(
  value:
    Prisma.JsonValue,
): string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is string =>
      typeof item ===
      "string",
  );
}

/* =========================================================
   READ ROWS FROM PRISMA JSON
   ========================================================= */

function readRows(
  value:
    Prisma.JsonValue,
): SizeChartRowData[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value.flatMap(
    (
      item,
    ) => {
      const parsed =
        sizeChartRowSchema.safeParse(
          item,
        );

      if (
        !parsed.success
      ) {
        return [];
      }

      return [
        parsed.data,
      ];
    },
  );
}

/* =========================================================
   ADMIN SERIALIZER
   ========================================================= */

export function serializeAdminSizeChart(
  chart: {
    id: string;

    name: string;

    unit:
      SizeChartUnit;

    note:
      string | null;

    columns:
      Prisma.JsonValue;

    rows:
      Prisma.JsonValue;

    active:
      boolean;

    createdAt:
      Date;

    updatedAt:
      Date;

    _count?: {
      products:
        number;
    };
  },
): AdminSizeChartRecord {
  return {
    id:
      chart.id,

    name:
      chart.name,

    unit:
      chart.unit,

    note:
      chart.note ??
      "",

    columns:
      readColumns(
        chart.columns,
      ),

    rows:
      readRows(
        chart.rows,
      ),

    active:
      chart.active,

    productCount:
      chart._count
        ?.products ??
      0,

    createdAt:
      chart.createdAt.toISOString(),

    updatedAt:
      chart.updatedAt.toISOString(),
  };
}

/* =========================================================
   STOREFRONT SERIALIZER
   ========================================================= */

export function serializePublicSizeChart(
  chart: {
    id: string;

    name: string;

    unit:
      SizeChartUnit;

    note:
      string | null;

    columns:
      Prisma.JsonValue;

    rows:
      Prisma.JsonValue;
  },
): PublicSizeChart {
  return {
    id:
      chart.id,

    name:
      chart.name,

    unit:
      chart.unit,

    note:
      chart.note ??
      "",

    columns:
      readColumns(
        chart.columns,
      ),

    rows:
      readRows(
        chart.rows,
      ),
  };
}