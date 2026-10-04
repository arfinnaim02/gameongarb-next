import {
  ChevronDown,
  CircleCheck,
  CircleX,
  Ruler,
} from "lucide-react";

import type {
  ProductVariant,
} from "@/lib/data";

import type {
  PublicSizeChart,
} from "@/lib/size-chart-types";

type ProductSizeGuideProps = {
  chart:
    PublicSizeChart;

  selectedColor:
    string;

  variants:
    ProductVariant[];
};

function normalize(
  value:
    string,
) {
  return value
    .trim()
    .toLowerCase();
}

export function ProductSizeGuide({
  chart,
  selectedColor,
  variants,
}: ProductSizeGuideProps) {
  const unit =
    chart.unit ===
    "IN"
      ? "Measurements in inches"
      : chart.unit ===
          "CM"
        ? "Measurements in centimeters"
        : "";

  /* =======================================================
     PRODUCT-RELEVANT SIZE ROWS
     ======================================================= */

  const productSizes =
    new Set(
      variants.map(
        (
          variant,
        ) =>
          normalize(
            variant.size,
          ),
      ),
    );

  const matchingRows =
    chart.rows.filter(
      (
        row,
      ) =>
        productSizes.has(
          normalize(
            row.size,
          ),
        ),
    );

  /*
   * If legacy product data has no matching
   * sizes, keep the original chart visible.
   */
  const rows =
    matchingRows.length >
    0
      ? matchingRows
      : chart.rows;

  function available(
    targetSize:
      string,
  ) {
    if (
      variants.length ===
      0
    ) {
      return null;
    }

    return variants.some(
      (
        variant,
      ) =>
        normalize(
          variant.color,
        ) ===
          normalize(
            selectedColor,
          ) &&
        normalize(
          variant.size,
        ) ===
          normalize(
            targetSize,
          ) &&
        variant.stock >
          0,
    );
  }

  return (
    <details className="product-size-guide">
      <summary>
        <div className="product-size-guide-title">
          <Ruler
            size={17}
            strokeWidth={
              1.7
            }
          />

          <div>
            <strong>
              Size Guide
            </strong>

            <span>
              {
                chart.name
              }
              {" · "}
              {
                selectedColor
              }
            </span>
          </div>
        </div>

        <div className="product-size-guide-summary-right">
          {unit ? (
            <span>
              {
                unit
              }
            </span>
          ) : null}

          <ChevronDown
            size={16}
            strokeWidth={
              1.7
            }
          />
        </div>
      </summary>

      <div className="product-size-guide-content">
        <div className="product-size-guide-top">
          <div>
            <span>
              Size Chart
            </span>

            <h3>
              {
                chart.name
              }
            </h3>
          </div>

          <div className="product-size-guide-color">
            Availability for{" "}
            <strong>
              {
                selectedColor
              }
            </strong>
          </div>
        </div>

        <div className="product-size-guide-table-wrap">
          <table className="product-size-guide-table">
            <thead>
              <tr>
                <th>
                  Size
                </th>

                {chart.columns.map(
                  (
                    column,
                  ) => (
                    <th
                      key={
                        column
                      }
                    >
                      {
                        column
                      }
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (
                  row,
                ) => {
                  const isAvailable =
                    available(
                      row.size,
                    );

                  return (
                    <tr
                      key={
                        row.size
                      }
                      className={
                        isAvailable ===
                        false
                          ? "is-unavailable"
                          : isAvailable
                            ? "is-available"
                            : ""
                      }
                    >
                      <td>
                        <div className="product-size-guide-size-cell">
                          <strong>
                            {
                              row.size
                            }
                          </strong>

                          {isAvailable !==
                          null ? (
                            <span
                              className={
                                isAvailable
                                  ? "is-available"
                                  : "is-unavailable"
                              }
                            >
                              {isAvailable ? (
                                <CircleCheck
                                  size={14}
                                />
                              ) : (
                                <CircleX
                                  size={14}
                                />
                              )}

                              {
                                isAvailable
                                  ? "Available"
                                  : "Out of stock"
                              }
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {chart.columns.map(
                        (
                          _,
                          index,
                        ) => (
                          <td
                            key={
                              index
                            }
                          >
                            {row.values[
                              index
                            ] ??
                              "—"}
                          </td>
                        ),
                      )}
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        {chart.note ? (
          <p className="product-size-guide-note">
            {
              chart.note
            }
          </p>
        ) : null}
      </div>
    </details>
  );
}