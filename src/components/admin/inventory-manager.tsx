"use client";

import Image from "next/image";
import Link from "next/link";

import {
  AlertTriangle,
  ArrowDownUp,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Download,
  FileClock,
  Minus,
  Package,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  SlidersHorizontal,
  Warehouse,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import styles from "./inventory-manager.module.css";

/* =========================================================
   TYPES
   ========================================================= */

export type InventoryVariant = {
  id:
    string;

  productId:
    string;

  product:
    string;

  productStatus:
    string;

  category:
    string;

  image:
    string |
    null;

  imageAlt:
    string;

  sku:
    string;

  size:
    string |
    null;

  color:
    string |
    null;

  colorHex:
    string |
    null;

  stock:
    number;

  lowStockThreshold:
    number;

  active:
    boolean;
};

export type InventoryHistoryItem = {
  id:
    string;

  variantId:
    string;

  product:
    string;

  sku:
    string;

  size:
    string |
    null;

  color:
    string |
    null;

  quantityChange:
    number;

  beforeQuantity:
    number;

  afterQuantity:
    number;

  type:
    string;

  reference:
    string |
    null;

  reason:
    string;

  actor:
    string;

  actorEmail:
    string |
    null;

  createdAt:
    string;
};

type StockFilter =
  | "ALL"
  | "IN_STOCK"
  | "LOW"
  | "OUT"
  | "INACTIVE";

type SortOption =
  | "PRODUCT"
  | "STOCK_ASC"
  | "STOCK_DESC"
  | "SKU";

type ViewMode =
  | "STOCK"
  | "HISTORY";

/* =========================================================
   HELPERS
   ========================================================= */

function stockState(
  variant:
    InventoryVariant,
) {
  if (
    !variant.active
  ) {
    return "INACTIVE";
  }

  if (
    variant.stock <=
    0
  ) {
    return "OUT";
  }

  if (
    variant.stock <=
    variant.lowStockThreshold
  ) {
    return "LOW";
  }

  return "IN_STOCK";
}

function stockLabel(
  state:
    ReturnType<
      typeof stockState
    >,
) {
  if (
    state ===
    "OUT"
  ) {
    return "Out of Stock";
  }

  if (
    state ===
    "LOW"
  ) {
    return "Low Stock";
  }

  if (
    state ===
    "INACTIVE"
  ) {
    return "Inactive";
  }

  return "In Stock";
}

function formatType(
  value:
    string,
) {
  return value
    .replaceAll(
      "_",
      " ",
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        char,
      ) =>
        char.toUpperCase(),
    );
}

function formatDateTime(
  value:
    string,
) {
  return new Intl.DateTimeFormat(
    "en-BD",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    },
  ).format(
    new Date(
      value,
    ),
  );
}

function csvCell(
  value:
    string |
    number |
    boolean |
    null |
    undefined,
) {
  const text =
    value ===
      null ||
    value ===
      undefined
      ? ""
      : String(
          value,
        );

  return `"${text.replaceAll(
    "\"",
    "\"\"",
  )}"`;
}

function downloadCsv(
  filename:
    string,

  rows:
    (
      string |
      number |
      boolean |
      null |
      undefined
    )[][],
) {
  const csv =
    rows
      .map(
        (
          row,
        ) =>
          row
            .map(
              csvCell,
            )
            .join(
              ",",
            ),
      )
      .join(
        "\r\n",
      );

  const blob =
    new Blob(
      [
        "\uFEFF",
        csv,
      ],
      {
        type:
          "text/csv;charset=utf-8;",
      },
    );

  const url =
    URL.createObjectURL(
      blob,
    );

  const link =
    document.createElement(
      "a",
    );

  link.href =
    url;

  link.download =
    filename;

  document.body.appendChild(
    link,
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url,
  );
}

/* =========================================================
   MANAGER
   ========================================================= */

export function InventoryManager({
  initialVariants,
  initialHistory,
}: {
  initialVariants:
    InventoryVariant[];

  initialHistory:
    InventoryHistoryItem[];
}) {
  const router =
    useRouter();

  const [
    variants,
    setVariants,
  ] =
    useState(
      initialVariants,
    );

  const [
    history,
    setHistory,
  ] =
    useState(
      initialHistory,
    );

  const [
    view,
    setView,
  ] =
    useState<ViewMode>(
      "STOCK",
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    stockFilter,
    setStockFilter,
  ] =
    useState<StockFilter>(
      "ALL",
    );

  const [
    sort,
    setSort,
  ] =
    useState<SortOption>(
      "PRODUCT",
    );

  const [
    selected,
    setSelected,
  ] =
    useState<InventoryVariant | null>(
      null,
    );

  const [
    busy,
    setBusy,
  ] =
    useState(
      false,
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(
    () => {
      setVariants(
        initialVariants,
      );

      setHistory(
        initialHistory,
      );

      setSelected(
        (
          current,
        ) =>
          current
            ? initialVariants.find(
                (
                  variant,
                ) =>
                  variant.id ===
                  current.id,
              ) ??
              null
            : null,
      );
    },
    [
      initialVariants,
      initialHistory,
    ],
  );

  /* =======================================================
     KPIS
     ======================================================= */

  const stats =
    useMemo(
      () => {
        const active =
          variants.filter(
            (
              variant,
            ) =>
              variant.active,
          );

        const totalUnits =
          active.reduce(
            (
              total,
              variant,
            ) =>
              total +
              variant.stock,
            0,
          );

        const low =
          active.filter(
            (
              variant,
            ) =>
              variant.stock >
                0 &&
              variant.stock <=
                variant.lowStockThreshold,
          ).length;

        const out =
          active.filter(
            (
              variant,
            ) =>
              variant.stock <=
              0,
          ).length;

        return {
          variants:
            variants.length,

          active:
            active.length,

          totalUnits,

          low,

          out,
        };
      },
      [
        variants,
      ],
    );

  /* =======================================================
     FILTERED STOCK
     ======================================================= */

  const filteredVariants =
    useMemo(
      () => {
        const cleanQuery =
          query
            .trim()
            .toLowerCase();

        const result =
          variants.filter(
            (
              variant,
            ) => {
              const searchable =
                [
                  variant.product,
                  variant.sku,
                  variant.size ??
                    "",
                  variant.color ??
                    "",
                  variant.category,
                ]
                  .join(
                    " ",
                  )
                  .toLowerCase();

              const matchesQuery =
                !cleanQuery ||
                searchable.includes(
                  cleanQuery,
                );

              const state =
                stockState(
                  variant,
                );

              const matchesStock =
                stockFilter ===
                  "ALL" ||
                state ===
                  stockFilter;

              return (
                matchesQuery &&
                matchesStock
              );
            },
          );

        return [
          ...result,
        ].sort(
          (
            first,
            second,
          ) => {
            if (
              sort ===
              "STOCK_ASC"
            ) {
              return (
                first.stock -
                second.stock
              );
            }

            if (
              sort ===
              "STOCK_DESC"
            ) {
              return (
                second.stock -
                first.stock
              );
            }

            if (
              sort ===
              "SKU"
            ) {
              return first.sku.localeCompare(
                second.sku,
              );
            }

            return first.product.localeCompare(
              second.product,
            );
          },
        );
      },
      [
        variants,
        query,
        stockFilter,
        sort,
      ],
    );

  /* =======================================================
     FILTERED HISTORY
     ======================================================= */

  const filteredHistory =
    useMemo(
      () => {
        const cleanQuery =
          query
            .trim()
            .toLowerCase();

        return history.filter(
          (
            item,
          ) =>
            !cleanQuery ||
            [
              item.product,
              item.sku,
              item.type,
              item.reason,
              item.reference ??
                "",
              item.actor,
            ]
              .join(
                " ",
              )
              .toLowerCase()
              .includes(
                cleanQuery,
              ),
        );
      },
      [
        history,
        query,
      ],
    );

  /* =======================================================
     MUTATIONS
     ======================================================= */

  async function adjustStock(
    variant:
      InventoryVariant,

    quantityChange:
      number,

    reason:
      string,
  ) {
    setBusy(
      true,
    );

    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/inventory",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                variantId:
                  variant.id,

                quantityChange,

                reason,
              }),
          },
        );

      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "Request failed.",
            }),
          );

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to adjust stock.",
        );
      }

      setMessage(
        result.message ??
          "Stock adjusted.",
      );

      setSelected(
        null,
      );

      router.refresh();

      return true;
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to adjust stock.",
      );

      return false;
    } finally {
      setBusy(
        false,
      );
    }
  }

  async function updateVariant(
    variant:
      InventoryVariant,

    changes:
      {
        lowStockThreshold?:
          number;

        active?:
          boolean;
      },
  ) {
    setBusy(
      true,
    );

    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/inventory",
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  variant.id,

                ...changes,
              }),
          },
        );

      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "Request failed.",
            }),
          );

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to update inventory.",
        );
      }

      setMessage(
        result.message ??
          "Inventory updated.",
      );

      router.refresh();

      return true;
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to update inventory.",
      );

      return false;
    } finally {
      setBusy(
        false,
      );
    }
  }

  /* =======================================================
     EXPORTS
     ======================================================= */

  function downloadInventory() {
    downloadCsv(
      `game-on-garb-inventory-${new Date()
        .toISOString()
        .slice(
          0,
          10,
        )}.csv`,

      [
        [
          "Product",
          "Category",
          "SKU",
          "Size",
          "Color",
          "Stock",
          "Low Stock Threshold",
          "Stock Status",
          "Variant Active",
          "Product Status",
        ],

        ...filteredVariants.map(
          (
            variant,
          ) => [
            variant.product,
            variant.category,
            variant.sku,
            variant.size ??
              "",
            variant.color ??
              "",
            variant.stock,
            variant.lowStockThreshold,
            stockLabel(
              stockState(
                variant,
              ),
            ),
            variant.active
              ? "Yes"
              : "No",
            variant.productStatus,
          ],
        ),
      ],
    );
  }

  function downloadHistory() {
    downloadCsv(
      `game-on-garb-inventory-history-${new Date()
        .toISOString()
        .slice(
          0,
          10,
        )}.csv`,

      [
        [
          "Date",
          "Product",
          "SKU",
          "Size",
          "Color",
          "Type",
          "Change",
          "Before",
          "After",
          "Reference",
          "Reason",
          "Actor",
        ],

        ...filteredHistory.map(
          (
            item,
          ) => [
            formatDateTime(
              item.createdAt,
            ),
            item.product,
            item.sku,
            item.size ??
              "",
            item.color ??
              "",
            formatType(
              item.type,
            ),
            item.quantityChange,
            item.beforeQuantity,
            item.afterQuantity,
            item.reference ??
              "",
            item.reason,
            item.actor,
          ],
        ),
      ],
    );
  }

  function resetFilters() {
    setQuery("");
    setStockFilter(
      "ALL",
    );
    setSort(
      "PRODUCT",
    );
  }

  const filtersActive =
    Boolean(
      query,
    ) ||
    stockFilter !==
      "ALL" ||
    sort !==
      "PRODUCT";

  return (
    <div
      className={
        styles.page
      }
    >
      {/* ===================================================
          HEADER
          =================================================== */}

      <header
        className={
          styles.header
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Stock Control
          </span>

          <h1>
            Inventory
          </h1>

          <p>
            Track every product
            variant, identify
            stock risks and
            maintain a complete
            adjustment history.
          </p>
        </div>

        <div
          className={
            styles.headerActions
          }
        >
          <button
            type="button"
            className={
              styles.downloadButton
            }
            onClick={
              view ===
              "STOCK"
                ? downloadInventory
                : downloadHistory
            }
          >
            <Download
              size={
                15
              }
            />

            {view ===
            "STOCK"
              ? "Download Inventory"
              : "Download History"}
          </button>
        </div>
      </header>

      {message ? (
        <div
          className={
            styles.success
          }
        >
          <CheckCircle2
            size={
              15
            }
          />

          {
            message
          }
        </div>
      ) : null}

      {error ? (
        <div
          className={
            styles.error
          }
        >
          <AlertTriangle
            size={
              15
            }
          />

          {
            error
          }
        </div>
      ) : null}

      {/* ===================================================
          KPI CARDS
          =================================================== */}

      <section
        className={
          styles.kpiGrid
        }
      >
        <article
          className={
            styles.kpiCard
          }
        >
          <span
            className={
              styles.kpiIcon
            }
          >
            <Boxes
              size={
                18
              }
            />
          </span>

          <div>
            <span>
              Total Variants
            </span>

            <strong>
              {
                stats.variants
              }
            </strong>

            <small>
              {
                stats.active
              }{" "}
              active
            </small>
          </div>
        </article>

        <article
          className={
            styles.kpiCard
          }
        >
          <span
            className={
              styles.kpiIcon
            }
          >
            <Warehouse
              size={
                18
              }
            />
          </span>

          <div>
            <span>
              Units in Stock
            </span>

            <strong>
              {
                stats.totalUnits
              }
            </strong>

            <small>
              Across active
              variants
            </small>
          </div>
        </article>

        <article
          className={
            styles.kpiCard
          }
        >
          <span
            className={`${styles.kpiIcon} ${styles.warningIcon}`}
          >
            <AlertTriangle
              size={
                18
              }
            />
          </span>

          <div>
            <span>
              Low Stock
            </span>

            <strong>
              {
                stats.low
              }
            </strong>

            <small>
              Needs attention
            </small>
          </div>
        </article>

        <article
          className={
            styles.kpiCard
          }
        >
          <span
            className={`${styles.kpiIcon} ${styles.dangerIcon}`}
          >
            <PackageX
              size={
                18
              }
            />
          </span>

          <div>
            <span>
              Out of Stock
            </span>

            <strong>
              {
                stats.out
              }
            </strong>

            <small>
              Cannot be sold
            </small>
          </div>
        </article>
      </section>

      {/* ===================================================
          VIEW TABS
          =================================================== */}

      <section
        className={
          styles.controlCard
        }
      >
        <div
          className={
            styles.tabs
          }
        >
          <button
            type="button"
            className={
              view ===
              "STOCK"
                ? styles.tabActive
                : ""
            }
            onClick={() =>
              setView(
                "STOCK",
              )
            }
          >
            <Package
              size={
                14
              }
            />

            Current Stock

            <span>
              {
                variants.length
              }
            </span>
          </button>

          <button
            type="button"
            className={
              view ===
              "HISTORY"
                ? styles.tabActive
                : ""
            }
            onClick={() =>
              setView(
                "HISTORY",
              )
            }
          >
            <FileClock
              size={
                14
              }
            />

            Transactions

            <span>
              {
                history.length
              }
            </span>
          </button>
        </div>

        <div
          className={
            styles.toolbar
          }
        >
          <label
            className={
              styles.searchBox
            }
          >
            <Search
              size={
                15
              }
            />

            <input
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
              placeholder={
                view ===
                "STOCK"
                  ? "Search product, SKU, size, color or category..."
                  : "Search transaction history..."
              }
            />

            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() =>
                  setQuery("")
                }
              >
                <X
                  size={
                    13
                  }
                />
              </button>
            ) : null}
          </label>

          {view ===
          "STOCK" ? (
            <>
              <select
                value={
                  stockFilter
                }
                onChange={(
                  event,
                ) =>
                  setStockFilter(
                    event.target
                      .value as StockFilter,
                  )
                }
              >
                <option value="ALL">
                  All stock
                </option>

                <option value="IN_STOCK">
                  In stock
                </option>

                <option value="LOW">
                  Low stock
                </option>

                <option value="OUT">
                  Out of stock
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>
              </select>

              <label
                className={
                  styles.sortControl
                }
              >
                <ArrowDownUp
                  size={
                    14
                  }
                />

                <select
                  value={
                    sort
                  }
                  onChange={(
                    event,
                  ) =>
                    setSort(
                      event.target
                        .value as SortOption,
                    )
                  }
                >
                  <option value="PRODUCT">
                    Product
                  </option>

                  <option value="STOCK_ASC">
                    Lowest stock
                  </option>

                  <option value="STOCK_DESC">
                    Highest stock
                  </option>

                  <option value="SKU">
                    SKU
                  </option>
                </select>
              </label>
            </>
          ) : null}

          {filtersActive ? (
            <button
              type="button"
              className={
                styles.resetButton
              }
              onClick={
                resetFilters
              }
            >
              Reset
            </button>
          ) : null}
        </div>
      </section>

      {/* ===================================================
          CURRENT STOCK
          =================================================== */}

      {view ===
      "STOCK" ? (
        <section
          className={
            styles.tableCard
          }
        >
          <div
            className={
              styles.tableHeading
            }
          >
            <div>
              <strong>
                Variant Inventory
              </strong>

              <span>
                {
                  filteredVariants.length
                }{" "}
                variants shown
              </span>
            </div>

            <button
              type="button"
              onClick={
                downloadInventory
              }
            >
              <Download
                size={
                  14
                }
              />

              Export CSV
            </button>
          </div>

          {filteredVariants.length >
          0 ? (
            <div
              className={
                styles.tableWrap
              }
            >
              <table
                className={
                  styles.table
                }
              >
                <thead>
                  <tr>
                    <th>
                      Product
                    </th>

                    <th>
                      SKU
                    </th>

                    <th>
                      Variant
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

                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredVariants.map(
                    (
                      variant,
                    ) => {
                      const state =
                        stockState(
                          variant,
                        );

                      return (
                        <tr
                          key={
                            variant.id
                          }
                        >
                          <td>
                            <div
                              className={
                                styles.productCell
                              }
                            >
                              <div
                                className={
                                  styles.productImage
                                }
                              >
                                {variant.image ? (
                                  <Image
                                    src={
                                      variant.image
                                    }
                                    alt={
                                      variant.imageAlt
                                    }
                                    fill
                                    sizes="46px"
                                  />
                                ) : (
                                  <Package
                                    size={
                                      18
                                    }
                                  />
                                )}
                              </div>

                              <div>
                                <Link
                                  href={`/admin/products/${variant.productId}`}
                                >
                                  {
                                    variant.product
                                  }
                                </Link>

                                <span>
                                  {
                                    variant.category
                                  }
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <code
                              className={
                                styles.sku
                              }
                            >
                              {
                                variant.sku
                              }
                            </code>
                          </td>

                          <td>
                            <div
                              className={
                                styles.variantCell
                              }
                            >
                              {variant.color ? (
                                <span>
                                  {variant.colorHex ? (
                                    <i
                                      style={{
                                        background:
                                          variant.colorHex,
                                      }}
                                    />
                                  ) : null}

                                  {
                                    variant.color
                                  }
                                </span>
                              ) : null}

                              <small>
                                {
                                  variant.size ??
                                  "No size"
                                }
                              </small>
                            </div>
                          </td>

                          <td>
                            <strong
                              className={`${styles.stockNumber} ${
                                state ===
                                "OUT"
                                  ? styles.stockDanger
                                  : state ===
                                      "LOW"
                                    ? styles.stockWarning
                                    : ""
                              }`}
                            >
                              {
                                variant.stock
                              }
                            </strong>
                          </td>

                          <td>
                            <span
                              className={
                                styles.threshold
                              }
                            >
                              {
                                variant.lowStockThreshold
                              }
                            </span>
                          </td>

                          <td>
                            <span
                              className={`${styles.statusBadge} ${
                                state ===
                                "IN_STOCK"
                                  ? styles.statusGood
                                  : state ===
                                      "LOW"
                                    ? styles.statusLow
                                    : state ===
                                        "OUT"
                                      ? styles.statusOut
                                      : styles.statusInactive
                              }`}
                            >
                              {stockLabel(
                                state,
                              )}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className={
                                styles.adjustButton
                              }
                              onClick={() =>
                                setSelected(
                                  variant,
                                )
                              }
                            >
                              <SlidersHorizontal
                                size={
                                  14
                                }
                              />

                              Adjust
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              reset={
                filtersActive
                  ? resetFilters
                  : undefined
              }
            />
          )}
        </section>
      ) : (
        /* =================================================
           HISTORY
           ================================================= */

        <section
          className={
            styles.tableCard
          }
        >
          <div
            className={
              styles.tableHeading
            }
          >
            <div>
              <strong>
                Inventory Transactions
              </strong>

              <span>
                {
                  filteredHistory.length
                }{" "}
                records shown
              </span>
            </div>

            <button
              type="button"
              onClick={
                downloadHistory
              }
            >
              <Download
                size={
                  14
                }
              />

              Export CSV
            </button>
          </div>

          {filteredHistory.length >
          0 ? (
            <div
              className={
                styles.tableWrap
              }
            >
              <table
                className={`${styles.table} ${styles.historyTable}`}
              >
                <thead>
                  <tr>
                    <th>
                      Date
                    </th>

                    <th>
                      Product
                    </th>

                    <th>
                      Type
                    </th>

                    <th>
                      Change
                    </th>

                    <th>
                      Stock
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
                  {filteredHistory.map(
                    (
                      item,
                    ) => (
                      <tr
                        key={
                          item.id
                        }
                      >
                        <td>
                          <span
                            className={
                              styles.date
                            }
                          >
                            {formatDateTime(
                              item.createdAt,
                            )}
                          </span>
                        </td>

                        <td>
                          <div
                            className={
                              styles.historyProduct
                            }
                          >
                            <strong>
                              {
                                item.product
                              }
                            </strong>

                            <span>
                              {
                                item.sku
                              }

                              {item.color
                                ? ` · ${item.color}`
                                : ""}

                              {item.size
                                ? ` · ${item.size}`
                                : ""}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              styles.typeBadge
                            }
                          >
                            {formatType(
                              item.type,
                            )}
                          </span>
                        </td>

                        <td>
                          <strong
                            className={
                              item.quantityChange >
                              0
                                ? styles.positive
                                : styles.negative
                            }
                          >
                            {item.quantityChange >
                            0
                              ? "+"
                              : ""}
                            {
                              item.quantityChange
                            }
                          </strong>
                        </td>

                        <td>
                          <span
                            className={
                              styles.beforeAfter
                            }
                          >
                            {
                              item.beforeQuantity
                            }

                            <ChevronRight
                              size={
                                12
                              }
                            />

                            <strong>
                              {
                                item.afterQuantity
                              }
                            </strong>
                          </span>
                        </td>

                        <td>
                          <div
                            className={
                              styles.reasonCell
                            }
                          >
                            <strong>
                              {
                                item.reason
                              }
                            </strong>

                            {item.reference ? (
                              <span>
                                Ref:{" "}
                                {
                                  item.reference
                                }
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              styles.actor
                            }
                          >
                            {
                              item.actor
                            }
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      )}

      {selected ? (
        <AdjustmentDrawer
          variant={
            selected
          }
          busy={
            busy
          }
          close={() =>
            setSelected(
              null,
            )
          }
          adjustStock={
            adjustStock
          }
          updateVariant={
            updateVariant
          }
        />
      ) : null}
    </div>
  );
}

/* =========================================================
   ADJUSTMENT DRAWER
   ========================================================= */

function AdjustmentDrawer({
  variant,
  busy,
  close,
  adjustStock,
  updateVariant,
}: {
  variant:
    InventoryVariant;

  busy:
    boolean;

  close:
    () => void;

  adjustStock:
    (
      variant:
        InventoryVariant,

      quantityChange:
        number,

      reason:
        string,
    ) =>
      Promise<boolean>;

  updateVariant:
    (
      variant:
        InventoryVariant,

      changes:
        {
          lowStockThreshold?:
            number;

          active?:
            boolean;
        },
    ) =>
      Promise<boolean>;
}) {
  const [
    direction,
    setDirection,
  ] =
    useState<
      "ADD" |
      "REMOVE"
    >(
      "ADD",
    );

  const [
    quantity,
    setQuantity,
  ] =
    useState(
      1,
    );

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    threshold,
    setThreshold,
  ] =
    useState(
      variant.lowStockThreshold,
    );

  const afterPreview =
    direction ===
    "ADD"
      ? variant.stock +
        quantity
      : variant.stock -
        quantity;

  async function submit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      quantity <=
        0 ||
      reason.trim().length <
        3
    ) {
      return;
    }

    await adjustStock(
      variant,

      direction ===
      "ADD"
        ? quantity
        : -quantity,

      reason.trim(),
    );
  }

  return (
    <div
      className={
        styles.drawerBackdrop
      }
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          close();
        }
      }}
    >
      <aside
        className={
          styles.drawer
        }
      >
        <header
          className={
            styles.drawerHeader
          }
        >
          <div>
            <span>
              Inventory Adjustment
            </span>

            <h2>
              {
                variant.product
              }
            </h2>

            <small>
              {
                variant.sku
              }
            </small>
          </div>

          <button
            type="button"
            onClick={
              close
            }
            aria-label="Close"
          >
            <X
              size={
                18
              }
            />
          </button>
        </header>

        <div
          className={
            styles.drawerBody
          }
        >
          <section
            className={
              styles.stockSnapshot
            }
          >
            <div>
              <span>
                Current Stock
              </span>

              <strong>
                {
                  variant.stock
                }
              </strong>
            </div>

            <ChevronRight
              size={
                20
              }
            />

            <div>
              <span>
                After Change
              </span>

              <strong
                className={
                  afterPreview <
                  0
                    ? styles.negative
                    : ""
                }
              >
                {
                  afterPreview
                }
              </strong>
            </div>
          </section>

          <form
            className={
              styles.adjustForm
            }
            onSubmit={
              submit
            }
          >
            <div
              className={
                styles.directionTabs
              }
            >
              <button
                type="button"
                className={
                  direction ===
                  "ADD"
                    ? styles.directionActive
                    : ""
                }
                onClick={() =>
                  setDirection(
                    "ADD",
                  )
                }
              >
                <Plus
                  size={
                    15
                  }
                />

                Add Stock
              </button>

              <button
                type="button"
                className={
                  direction ===
                  "REMOVE"
                    ? styles.directionRemove
                    : ""
                }
                onClick={() =>
                  setDirection(
                    "REMOVE",
                  )
                }
              >
                <Minus
                  size={
                    15
                  }
                />

                Remove Stock
              </button>
            </div>

            <label
              className={
                styles.field
              }
            >
              <span>
                Quantity
              </span>

              <input
                type="number"
                min={
                  1
                }
                value={
                  quantity
                }
                onChange={(
                  event,
                ) =>
                  setQuantity(
                    Math.max(
                      1,
                      Number(
                        event.target
                          .value,
                      ) ||
                        1,
                    ),
                  )
                }
              />
            </label>

            <label
              className={
                styles.field
              }
            >
              <span>
                Reason
              </span>

              <textarea
                rows={
                  4
                }
                minLength={
                  3
                }
                required
                value={
                  reason
                }
                placeholder="Example: New warehouse stock received"
                onChange={(
                  event,
                ) =>
                  setReason(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            {afterPreview <
            0 ? (
              <div
                className={
                  styles.drawerWarning
                }
              >
                <AlertTriangle
                  size={
                    14
                  }
                />

                Stock cannot become
                negative.
              </div>
            ) : null}

            <button
              type="submit"
              className={
                styles.saveAdjustment
              }
              disabled={
                busy ||
                afterPreview <
                  0 ||
                reason.trim().length <
                  3
              }
            >
              {busy
                ? "Saving..."
                : direction ===
                    "ADD"
                  ? "Add Stock"
                  : "Remove Stock"}
            </button>
          </form>

          <section
            className={
              styles.drawerSection
            }
          >
            <div
              className={
                styles.drawerSectionTitle
              }
            >
              <strong>
                Low Stock Alert
              </strong>

              <span>
                Alert when stock
                reaches this level.
              </span>
            </div>

            <div
              className={
                styles.thresholdEditor
              }
            >
              <input
                type="number"
                min={
                  0
                }
                value={
                  threshold
                }
                onChange={(
                  event,
                ) =>
                  setThreshold(
                    Math.max(
                      0,
                      Number(
                        event.target
                          .value,
                      ) ||
                        0,
                    ),
                  )
                }
              />

              <button
                type="button"
                disabled={
                  busy ||
                  threshold ===
                    variant.lowStockThreshold
                }
                onClick={() =>
                  void updateVariant(
                    variant,
                    {
                      lowStockThreshold:
                        threshold,
                    },
                  )
                }
              >
                Save Threshold
              </button>
            </div>
          </section>

          <section
            className={
              styles.drawerSection
            }
          >
            <div
              className={
                styles.variantSetting
              }
            >
              <div>
                <strong>
                  Variant Active
                </strong>

                <span>
                  Inactive variants
                  remain in inventory
                  history but are not
                  treated as sellable
                  stock.
                </span>
              </div>

              <button
                type="button"
                className={
                  variant.active
                    ? styles.deactivateButton
                    : styles.activateButton
                }
                disabled={
                  busy
                }
                onClick={() =>
                  void updateVariant(
                    variant,
                    {
                      active:
                        !variant.active,
                    },
                  )
                }
              >
                {variant.active
                  ? "Deactivate"
                  : "Activate"}
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
   ========================================================= */

function EmptyState({
  reset,
}: {
  reset?:
    () => void;
}) {
  return (
    <div
      className={
        styles.empty
      }
    >
      <PackageCheck
        size={
          30
        }
      />

      <strong>
        No inventory records found
      </strong>

      <p>
        Inventory variants will
        appear here when products
        and variants are created.
      </p>

      {reset ? (
        <button
          type="button"
          onClick={
            reset
          }
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}