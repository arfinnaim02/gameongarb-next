"use client";

import {
  AlertTriangle,
  Boxes,
  PackageCheck,
  PackageX,
  Search,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

/* =========================================================
   TYPES
   ========================================================= */

type Row =
  Record<
    string,
    unknown
  >;

type InventoryFilter =
  | "ALL"
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "INACTIVE";

type InventoryV2Props = {
  rows:
    Row[];

  history:
    Row[];
};

/* =========================================================
   HELPERS
   ========================================================= */

function stockStatus(
  row:
    Row,
) {
  const stock =
    Number(
      row.stock ??
        0,
    );

  const threshold =
    Number(
      row.lowStockThreshold ??
        0,
    );

  const active =
    row.active !==
    false;

  if (
    !active
  ) {
    return "INACTIVE";
  }

  if (
    stock <=
    0
  ) {
    return "OUT_OF_STOCK";
  }

  if (
    stock <=
    threshold
  ) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}

function statusLabel(
  status:
    ReturnType<
      typeof stockStatus
    >,
) {
  if (
    status ===
    "OUT_OF_STOCK"
  ) {
    return "Out of Stock";
  }

  if (
    status ===
    "LOW_STOCK"
  ) {
    return "Low Stock";
  }

  if (
    status ===
    "INACTIVE"
  ) {
    return "Inactive";
  }

  return "In Stock";
}

function statusClass(
  status:
    ReturnType<
      typeof stockStatus
    >,
) {
  if (
    status ===
    "OUT_OF_STOCK"
  ) {
    return "red";
  }

  if (
    status ===
    "LOW_STOCK"
  ) {
    return "orange";
  }

  if (
    status ===
    "INACTIVE"
  ) {
    return "orange";
  }

  return "green";
}

/* =========================================================
   INVENTORY V2
   ========================================================= */

export function InventoryV2({
  rows,
  history,
}: InventoryV2Props) {
  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<InventoryFilter>(
      "ALL",
    );

  /* =======================================================
     SUMMARY
     ======================================================= */

  const summary =
    useMemo(
      () => {
        const totalVariants =
          rows.length;

        const totalUnits =
          rows.reduce(
            (
              total,
              row,
            ) =>
              total +
              Number(
                row.stock ??
                  0,
              ),

            0,
          );

        const inStock =
          rows.filter(
            (
              row,
            ) =>
              stockStatus(
                row,
              ) ===
              "IN_STOCK",
          ).length;

        const lowStock =
          rows.filter(
            (
              row,
            ) =>
              stockStatus(
                row,
              ) ===
              "LOW_STOCK",
          ).length;

        const outOfStock =
          rows.filter(
            (
              row,
            ) =>
              stockStatus(
                row,
              ) ===
              "OUT_OF_STOCK",
          ).length;

        const inactive =
          rows.filter(
            (
              row,
            ) =>
              stockStatus(
                row,
              ) ===
              "INACTIVE",
          ).length;

        return {
          totalVariants,
          totalUnits,
          inStock,
          lowStock,
          outOfStock,
          inactive,
        };
      },

      [
        rows,
      ],
    );

  /* =======================================================
     SEARCH + FILTER
     ======================================================= */

  const filteredRows =
    useMemo(
      () => {
        const normalizedQuery =
          query
            .trim()
            .toLowerCase();

        return rows.filter(
          (
            row,
          ) => {
            const status =
              stockStatus(
                row,
              );

            if (
              filter !==
                "ALL" &&
              status !==
                filter
            ) {
              return false;
            }

            if (
              !normalizedQuery
            ) {
              return true;
            }

            const searchable = [
              row.product,
              row.sku,
              row.color,
              row.size,
            ]
              .map(
                (
                  value,
                ) =>
                  String(
                    value ??
                      "",
                  ).toLowerCase(),
              )
              .join(
                " ",
              );

            return searchable.includes(
              normalizedQuery,
            );
          },
        );
      },

      [
        filter,
        query,
        rows,
      ],
    );

  /* =======================================================
     GROUP BY PRODUCT
     ======================================================= */

  const productGroups =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            {
              productId:
                string;

              product:
                string;

              rows:
                Row[];
            }
          >();

        for (
          const row
          of filteredRows
        ) {
          const key =
            String(
              row.productId ??
                row.product ??
                "unknown",
            );

          const existing =
            map.get(
              key,
            );

          if (
            existing
          ) {
            existing.rows.push(
              row,
            );

            continue;
          }

          map.set(
            key,
            {
              productId:
                String(
                  row.productId ??
                    "",
                ),

              product:
                String(
                  row.product ??
                    "Unnamed Product",
                ),

              rows: [
                row,
              ],
            },
          );
        }

        return Array.from(
          map.values(),
        ).sort(
          (
            a,
            b,
          ) =>
            a.product.localeCompare(
              b.product,
            ),
        );
      },

      [
        filteredRows,
      ],
    );

  const filterOptions: {
    value:
      InventoryFilter;

    label:
      string;

    count:
      number;
  }[] = [
    {
      value:
        "ALL",

      label:
        "All",

      count:
        summary.totalVariants,
    },

    {
      value:
        "IN_STOCK",

      label:
        "In Stock",

      count:
        summary.inStock,
    },

    {
      value:
        "LOW_STOCK",

      label:
        "Low Stock",

      count:
        summary.lowStock,
    },

    {
      value:
        "OUT_OF_STOCK",

      label:
        "Out of Stock",

      count:
        summary.outOfStock,
    },

    {
      value:
        "INACTIVE",

      label:
        "Inactive",

      count:
        summary.inactive,
    },
  ];

  return (
    <>
      {/* ===================================================
          HEADER
          =================================================== */}

      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap:
            20,
          flexWrap:
            "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin:
                0,
            }}
          >
            Inventory Management
          </h1>

          <p
            className="muted"
            style={{
              marginBottom:
                0,
            }}
          >
            Monitor stock by
            product and variant,
            identify low stock and
            review inventory
            movements.
          </p>
        </div>
      </div>

      {/* ===================================================
          KPI CARDS
          =================================================== */}

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(175px, 1fr))",
          gap:
            12,
          marginTop:
            22,
        }}
      >
        <InventoryKpi
          icon={
            Boxes
          }
          label="Total Variants"
          value={
            summary.totalVariants
          }
          note={`${summary.totalUnits} total units`}
        />

        <InventoryKpi
          icon={
            PackageCheck
          }
          label="In Stock"
          value={
            summary.inStock
          }
          note="Healthy variants"
        />

        <InventoryKpi
          icon={
            AlertTriangle
          }
          label="Low Stock"
          value={
            summary.lowStock
          }
          note="Needs attention"
        />

        <InventoryKpi
          icon={
            PackageX
          }
          label="Out of Stock"
          value={
            summary.outOfStock
          }
          note="Unavailable variants"
        />
      </div>

      {/* ===================================================
          SEARCH + FILTERS
          =================================================== */}

      <section
        className="card"
        style={{
          padding:
            16,
          marginTop:
            18,
        }}
      >
        <div
          style={{
            display:
              "flex",
            gap:
              12,
            alignItems:
              "center",
            justifyContent:
              "space-between",
            flexWrap:
              "wrap",
          }}
        >
          <label
            style={{
              position:
                "relative",
              display:
                "block",
              flex:
                "1 1 300px",
              maxWidth:
                520,
            }}
          >
            <Search
              size={
                16
              }
              style={{
                position:
                  "absolute",
                left:
                  12,
                top:
                  12,
                pointerEvents:
                  "none",
              }}
            />

            <input
              className="field"
              value={
                query
              }
              onChange={(
                event,
              ) =>
                setQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search product, SKU, color or size…"
              style={{
                minHeight:
                  40,
                paddingLeft:
                  38,
                width:
                  "100%",
              }}
            />
          </label>

          <div
            style={{
              display:
                "flex",
              gap:
                7,
              flexWrap:
                "wrap",
            }}
          >
            {filterOptions.map(
              (
                option,
              ) => (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  className={
                    filter ===
                    option.value
                      ? "btn btn-primary"
                      : "btn btn-outline"
                  }
                  style={{
                    minHeight:
                      38,
                    padding:
                      "7px 11px",
                  }}
                  onClick={() =>
                    setFilter(
                      option.value,
                    )
                  }
                >
                  {
                    option.label
                  }

                  <span
                    style={{
                      marginLeft:
                        6,
                      opacity:
                        0.7,
                    }}
                  >
                    {
                      option.count
                    }
                  </span>
                </button>
              ),
            )}
          </div>
        </div>

        <div
          style={{
            marginTop:
              14,
            paddingTop:
              13,
            borderTop:
              "1px solid var(--line)",
            display:
              "flex",
            justifyContent:
              "space-between",
            gap:
              12,
            flexWrap:
              "wrap",
          }}
        >
          <span
            className="muted"
          >
            Showing{" "}
            <strong>
              {
                filteredRows.length
              }
            </strong>{" "}
            of{" "}
            <strong>
              {
                rows.length
              }
            </strong>{" "}
            variants
          </span>

          <span
            className="muted"
          >
            {
              productGroups.length
            }{" "}
            product
            {productGroups.length ===
            1
              ? ""
              : "s"}
          </span>
        </div>
      </section>

      {/* ===================================================
          PRODUCT GROUPS
          =================================================== */}

      <div
        style={{
          display:
            "grid",
          gap:
            12,
          marginTop:
            16,
        }}
      >
        {productGroups.map(
          (
            group,
          ) => {
            const productStock =
              group.rows.reduce(
                (
                  total,
                  row,
                ) =>
                  total +
                  Number(
                    row.stock ??
                      0,
                  ),

                0,
              );

            const lowCount =
              group.rows.filter(
                (
                  row,
                ) =>
                  stockStatus(
                    row,
                  ) ===
                  "LOW_STOCK",
              ).length;

            const outCount =
              group.rows.filter(
                (
                  row,
                ) =>
                  stockStatus(
                    row,
                  ) ===
                  "OUT_OF_STOCK",
              ).length;

            return (
              <details
                key={
                  group.productId ||
                  group.product
                }
                className="card"
                open={
                  Boolean(
                    query,
                  ) ||
                  filter !==
                    "ALL"
                }
                style={{
                  overflow:
                    "hidden",
                }}
              >
                <summary
                  style={{
                    cursor:
                      "pointer",
                    listStyle:
                      "none",
                    padding:
                      18,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap:
                        16,
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          display:
                            "block",
                          fontSize:
                            16,
                        }}
                      >
                        {
                          group.product
                        }
                      </strong>

                      <span
                        className="muted"
                        style={{
                          display:
                            "block",
                          marginTop:
                            4,
                        }}
                      >
                        {
                          group.rows
                            .length
                        }{" "}
                        variant
                        {group.rows
                          .length ===
                        1
                          ? ""
                          : "s"}{" "}
                        ·{" "}
                        {
                          productStock
                        }{" "}
                        units
                      </span>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        gap:
                          8,
                        alignItems:
                          "center",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      {lowCount >
                      0 ? (
                        <span className="badge orange">
                          {
                            lowCount
                          }{" "}
                          Low
                        </span>
                      ) : null}

                      {outCount >
                      0 ? (
                        <span className="badge red">
                          {
                            outCount
                          }{" "}
                          Out
                        </span>
                      ) : null}

                      {lowCount ===
                        0 &&
                      outCount ===
                        0 ? (
                        <span className="badge green">
                          Healthy
                        </span>
                      ) : null}
                    </div>
                  </div>
                </summary>

                <div
                  style={{
                    borderTop:
                      "1px solid var(--line)",
                    overflowX:
                      "auto",
                  }}
                >
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>
                          SKU
                        </th>

                        <th>
                          Color
                        </th>

                        <th>
                          Size
                        </th>

                        <th>
                          Stock
                        </th>

                        <th>
                          Threshold
                        </th>

                        <th>
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {group.rows.map(
                        (
                          row,
                        ) => {
                          const status =
                            stockStatus(
                              row,
                            );

                          return (
                            <tr
                              key={String(
                                row.id,
                              )}
                            >
                              <td>
                                <strong>
                                  {String(
                                    row.sku ??
                                      "—",
                                  )}
                                </strong>
                              </td>

                              <td>
                                {String(
                                  row.color ??
                                    "—",
                                )}
                              </td>

                              <td>
                                {String(
                                  row.size ??
                                    "—",
                                )}
                              </td>

                              <td>
                                <strong
                                  style={{
                                    fontSize:
                                      16,
                                  }}
                                >
                                  {String(
                                    row.stock ??
                                      0,
                                  )}
                                </strong>
                              </td>

                              <td>
                                {String(
                                  row.lowStockThreshold ??
                                    0,
                                )}
                              </td>

                              <td>
                                <span
                                  className={`badge ${statusClass(
                                    status,
                                  )}`}
                                >
                                  {statusLabel(
                                    status,
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          },
        )}

        {productGroups.length ===
        0 ? (
          <div
            className="card"
            style={{
              padding:
                32,
              textAlign:
                "center",
            }}
          >
            <PackageX
              size={
                28
              }
              style={{
                marginBottom:
                  10,
              }}
            />

            <strong
              style={{
                display:
                  "block",
              }}
            >
              No inventory found
            </strong>

            <p
              className="muted"
              style={{
                marginBottom:
                  0,
              }}
            >
              Try another search or
              inventory filter.
            </p>
          </div>
        ) : null}
      </div>

      {/* ===================================================
          HISTORY
          =================================================== */}

      <InventoryHistory
        rows={
          history
        }
      />
    </>
  );
}

/* =========================================================
   KPI
   ========================================================= */

function InventoryKpi({
  icon:
    Icon,
  label,
  value,
  note,
}: {
  icon:
    typeof Boxes;

  label:
    string;

  value:
    number;

  note:
    string;
}) {
  return (
    <div
      className="card"
      style={{
        padding:
          18,
      }}
    >
      <div
        style={{
          display:
            "flex",
          alignItems:
            "center",
          gap:
            9,
        }}
      >
        <Icon
          size={
            18
          }
          strokeWidth={
            1.7
          }
        />

        <span
          className="muted"
        >
          {
            label
          }
        </span>
      </div>

      <strong
        style={{
          display:
            "block",
          fontSize:
            30,
          lineHeight:
            1,
          marginTop:
            15,
        }}
      >
        {
          value
        }
      </strong>

      <small
        className="muted"
        style={{
          display:
            "block",
          marginTop:
            8,
        }}
      >
        {
          note
        }
      </small>
    </div>
  );
}

/* =========================================================
   HISTORY
   ========================================================= */

function InventoryHistory({
  rows,
}: {
  rows:
    Row[];
}) {
  return (
    <section
      className="card"
      style={{
        padding:
          14,
        marginTop:
          20,
      }}
    >
      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          gap:
            12,
          padding:
            "2px 4px 14px",
        }}
      >
        <div>
          <h2
            style={{
              margin:
                0,
              fontSize:
                18,
            }}
          >
            Recent Inventory
            Activity
          </h2>

          <p
            className="muted"
            style={{
              margin:
                "5px 0 0",
            }}
          >
            Latest stock movements
            recorded in the inventory
            ledger.
          </p>
        </div>

        <span className="badge blue">
          {
            rows.length
          }{" "}
          records
        </span>
      </div>

      <div
        style={{
          overflowX:
            "auto",
        }}
      >
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                Time
              </th>

              <th>
                Product / SKU
              </th>

              <th>
                Type
              </th>

              <th>
                Movement
              </th>

              <th>
                Before → After
              </th>

              <th>
                Reason
              </th>

              <th>
                Actor
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map(
              (
                row,
              ) => (
                <tr
                  key={String(
                    row.id,
                  )}
                >
                  <td>
                    {new Date(
                      String(
                        row.createdAt,
                      ),
                    ).toLocaleString()}
                  </td>

                  <td>
                    <strong>
                      {String(
                        row.product ??
                          "—",
                      )}
                    </strong>

                    <small
                      className="muted"
                      style={{
                        display:
                          "block",
                      }}
                    >
                      {String(
                        row.sku ??
                          "—",
                      )}
                    </small>
                  </td>

                  <td>
                    <span className="badge blue">
                      {String(
                        row.type ??
                          "—",
                      ).replaceAll(
                        "_",
                        " ",
                      )}
                    </span>
                  </td>

                  <td>
                    <strong
                      style={{
                        color:
                          Number(
                            row.change,
                          ) <
                          0
                            ? "#b42318"
                            : "#16803b",
                      }}
                    >
                      {Number(
                        row.change,
                      ) >
                      0
                        ? "+"
                        : ""}

                      {String(
                        row.change ??
                          0,
                      )}
                    </strong>
                  </td>

                  <td>
                    {String(
                      row.before ??
                        0,
                    )}{" "}
                    →{" "}
                    {String(
                      row.after ??
                        0,
                    )}
                  </td>

                  <td>
                    {String(
                      row.reason ??
                        "—",
                    )}
                  </td>

                  <td>
                    {String(
                      row.actor ??
                        "System",
                    )}
                  </td>
                </tr>
              ),
            )}

            {!rows.length ? (
              <tr>
                <td
                  colSpan={
                    7
                  }
                  style={{
                    textAlign:
                      "center",
                    padding:
                      30,
                  }}
                >
                  No inventory
                  transactions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}