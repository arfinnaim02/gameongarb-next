import {
  ChevronDown,
  Ruler,
} from "lucide-react";

import type {
  PublicSizeChart,
} from "@/lib/size-chart-types";

export function ProductSizeGuide({
  chart,
}: {
  chart:
    PublicSizeChart;
}) {
  const unit =
    chart.unit ===
    "IN"
      ? "Measurements in inches"
      : chart.unit ===
          "CM"
        ? "Measurements in centimeters"
        : "";

  return (
    <details className="product-size-guide">
      <summary>
        <div className="product-size-guide-title">
          <Ruler
            size={16}
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

          {unit ? (
            <strong>
              {
                unit
              }
            </strong>
          ) : null}
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
              {chart.rows.map(
                (
                  row,
                ) => (
                  <tr
                    key={
                      row.size
                    }
                  >
                    <td>
                      <strong>
                        {
                          row.size
                        }
                      </strong>
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
                ),
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