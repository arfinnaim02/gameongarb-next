"use client";

import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Ruler,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import type {
  AdminSizeChartRecord,
  SizeChartRowData,
  SizeChartUnit,
} from "@/lib/size-chart-types";

import styles from "./size-chart-manager.module.css";

/* =========================================================
   TYPES
   ========================================================= */

type Props = {
  initialCharts:
    AdminSizeChartRecord[];
};

type FormState = {
  name: string;

  unit:
    SizeChartUnit;

  note: string;

  columns:
    string[];

  rows:
    SizeChartRowData[];

  active:
    boolean;
};

type ApiResponse = {
  chart?:
    AdminSizeChartRecord;

  mode?:
    "archived"
    | "deleted";

  message?:
    string;

  error?:
    string;
};

/* =========================================================
   EMPTY FORM
   ========================================================= */

function emptyForm():
  FormState {
  const columns = [
    "Chest",
    "Length",
    "Shoulder",
    "Sleeve",
  ];

  return {
    name: "",

    unit:
      "IN",

    note:
      "Measurements may vary slightly depending on fabric and production.",

    columns,

    rows: [
      {
        size: "S",
        values:
          columns.map(
            () => "",
          ),
      },

      {
        size: "M",
        values:
          columns.map(
            () => "",
          ),
      },

      {
        size: "L",
        values:
          columns.map(
            () => "",
          ),
      },

      {
        size: "XL",
        values:
          columns.map(
            () => "",
          ),
      },
    ],

    active:
      true,
  };
}

function recordToForm(
  chart:
    AdminSizeChartRecord,
): FormState {
  return {
    name:
      chart.name,

    unit:
      chart.unit,

    note:
      chart.note,

    columns: [
      ...chart.columns,
    ],

    rows:
      chart.rows.map(
        (
          row,
        ) => ({
          size:
            row.size,

          values: [
            ...row.values,
          ],
        }),
      ),

    active:
      chart.active,
  };
}

/* =========================================================
   MANAGER
   ========================================================= */

export function SizeChartManager({
  initialCharts,
}: Props) {
  const [
    charts,
    setCharts,
  ] =
    useState(
      initialCharts,
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    editorOpen,
    setEditorOpen,
  ] =
    useState(false);

  const [
    editing,
    setEditing,
  ] =
    useState<AdminSizeChartRecord | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      emptyForm(),
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    busyId,
    setBusyId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const filtered =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return charts;
        }

        return charts.filter(
          (
            chart,
          ) =>
            chart.name
              .toLowerCase()
              .includes(
                query,
              ),
        );
      },
      [
        charts,
        search,
      ],
    );

  function createChart() {
    setEditing(
      null,
    );

    setForm(
      emptyForm(),
    );

    setError("");
    setMessage("");

    setEditorOpen(
      true,
    );
  }

  function editChart(
    chart:
      AdminSizeChartRecord,
  ) {
    setEditing(
      chart,
    );

    setForm(
      recordToForm(
        chart,
      ),
    );

    setError("");
    setMessage("");

    setEditorOpen(
      true,
    );
  }

  /* =======================================================
     COLUMNS
     ======================================================= */

  function updateColumn(
    index:
      number,

    value:
      string,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        columns:
          current.columns.map(
            (
              column,
              columnIndex,
            ) =>
              columnIndex ===
              index
                ? value
                : column,
          ),
      }),
    );
  }

  function addColumn() {
    setForm(
      (
        current,
      ) => ({
        ...current,

        columns: [
          ...current.columns,
          `Measurement ${
            current.columns
              .length +
            1
          }`,
        ],

        rows:
          current.rows.map(
            (
              row,
            ) => ({
              ...row,

              values: [
                ...row.values,
                "",
              ],
            }),
          ),
      }),
    );
  }

  function removeColumn(
    index:
      number,
  ) {
    setForm(
      (
        current,
      ) => {
        if (
          current.columns
            .length <=
          1
        ) {
          return current;
        }

        return {
          ...current,

          columns:
            current.columns.filter(
              (
                _,
                columnIndex,
              ) =>
                columnIndex !==
                index,
            ),

          rows:
            current.rows.map(
              (
                row,
              ) => ({
                ...row,

                values:
                  row.values.filter(
                    (
                      _,
                      valueIndex,
                    ) =>
                      valueIndex !==
                      index,
                  ),
              }),
            ),
        };
      },
    );
  }

  /* =======================================================
     ROWS
     ======================================================= */

  function addRow() {
    setForm(
      (
        current,
      ) => ({
        ...current,

        rows: [
          ...current.rows,

          {
            size: "",

            values:
              current.columns.map(
                () => "",
              ),
          },
        ],
      }),
    );
  }

  function removeRow(
    index:
      number,
  ) {
    setForm(
      (
        current,
      ) => {
        if (
          current.rows
            .length <=
          1
        ) {
          return current;
        }

        return {
          ...current,

          rows:
            current.rows.filter(
              (
                _,
                rowIndex,
              ) =>
                rowIndex !==
                index,
            ),
        };
      },
    );
  }

  function updateRowSize(
    index:
      number,

    value:
      string,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        rows:
          current.rows.map(
            (
              row,
              rowIndex,
            ) =>
              rowIndex ===
              index
                ? {
                    ...row,
                    size:
                      value,
                  }
                : row,
          ),
      }),
    );
  }

  function updateValue(
    rowIndex:
      number,

    columnIndex:
      number,

    value:
      string,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        rows:
          current.rows.map(
            (
              row,
              index,
            ) => {
              if (
                index !==
                rowIndex
              ) {
                return row;
              }

              return {
                ...row,

                values:
                  row.values.map(
                    (
                      measurement,
                      measurementIndex,
                    ) =>
                      measurementIndex ===
                      columnIndex
                        ? value
                        : measurement,
                  ),
              };
            },
          ),
      }),
    );
  }

  /* =======================================================
     SAVE
     ======================================================= */

  async function save(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(
      true,
    );

    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          editing
            ? `/api/admin/size-charts/${editing.id}`
            : "/api/admin/size-charts",

          {
            method:
              editing
                ? "PATCH"
                : "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify(
                form,
              ),
          },
        );

      const data =
        (await response.json()) as
          ApiResponse;

      if (
        !response.ok ||
        !data.chart
      ) {
        throw new Error(
          data.error ??
            "Unable to save size chart.",
        );
      }

      setCharts(
        (
          current,
        ) => {
          const found =
            current.some(
              (
                chart,
              ) =>
                chart.id ===
                data.chart!
                  .id,
            );

          if (!found) {
            return [
              data.chart!,
              ...current,
            ].sort(
              (
                first,
                second,
              ) =>
                first.name.localeCompare(
                  second.name,
                ),
            );
          }

          return current
            .map(
              (
                chart,
              ) =>
                chart.id ===
                data.chart!
                  .id
                  ? data.chart!
                  : chart,
            )
            .sort(
              (
                first,
                second,
              ) =>
                first.name.localeCompare(
                  second.name,
                ),
            );
        },
      );

      setMessage(
        data.message ??
          "Size chart saved.",
      );

      setEditorOpen(
        false,
      );
    } catch (saveError) {
      setError(
        saveError instanceof
        Error
          ? saveError.message
          : "Unable to save size chart.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  /* =======================================================
     DELETE
     ======================================================= */

  async function remove(
    chart:
      AdminSizeChartRecord,
  ) {
    const accepted =
      window.confirm(
        chart.productCount >
          0
          ? `"${chart.name}" is used by ${chart.productCount} product(s). It will be archived instead of deleted. Continue?`
          : `Delete "${chart.name}"?`,
      );

    if (!accepted) {
      return;
    }

    setBusyId(
      chart.id,
    );

    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/size-charts/${chart.id}`,
          {
            method:
              "DELETE",
          },
        );

      const data =
        (await response.json()) as
          ApiResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "Unable to remove size chart.",
        );
      }

      if (
        data.mode ===
          "archived" &&
        data.chart
      ) {
        setCharts(
          (
            current,
          ) =>
            current.map(
              (
                item,
              ) =>
                item.id ===
                data.chart!
                  .id
                  ? data.chart!
                  : item,
            ),
        );
      } else {
        setCharts(
          (
            current,
          ) =>
            current.filter(
              (
                item,
              ) =>
                item.id !==
                chart.id,
            ),
        );
      }

      setMessage(
        data.message ??
          "Size chart removed.",
      );
    } catch (removeError) {
      setError(
        removeError instanceof
        Error
          ? removeError.message
          : "Unable to remove size chart.",
      );
    } finally {
      setBusyId(
        null,
      );
    }
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className={styles.manager}>
      <header className={styles.header}>
        <div>
          <span>
            Product Sizing
          </span>

          <h1>
            Size Charts
          </h1>

          <p>
            Create reusable
            measurement tables and
            assign the same chart to
            multiple products.
          </p>
        </div>

        <button
          type="button"
          className={styles.primary}
          onClick={
            createChart
          }
        >
          <Plus
            size={16}
          />

          Add Size Chart
        </button>
      </header>

      {error ? (
        <div className={styles.error}>
          {error}
        </div>
      ) : null}

      {message ? (
        <div className={styles.success}>
          <Check
            size={15}
          />

          {message}
        </div>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search
              size={15}
            />

            <input
              value={
                search
              }
              placeholder="Search size charts..."
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
            />
          </label>

          <span>
            {
              charts.length
            }{" "}
            charts
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  Chart
                </th>

                <th>
                  Unit
                </th>

                <th>
                  Measurements
                </th>

                <th>
                  Sizes
                </th>

                <th>
                  Products
                </th>

                <th>
                  Status
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(
                (
                  chart,
                ) => (
                  <tr
                    key={
                      chart.id
                    }
                  >
                    <td>
                      <strong>
                        {
                          chart.name
                        }
                      </strong>
                    </td>

                    <td>
                      {unitLabel(
                        chart.unit,
                      )}
                    </td>

                    <td>
                      {chart.columns.join(
                        ", ",
                      )}
                    </td>

                    <td>
                      {
                        chart.rows
                          .length
                      }
                    </td>

                    <td>
                      {
                        chart.productCount
                      }
                    </td>

                    <td>
                      <span
                        className={
                          chart.active
                            ? styles.active
                            : styles.archived
                        }
                      >
                        {chart.active
                          ? "Active"
                          : "Archived"}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          onClick={() =>
                            editChart(
                              chart,
                            )
                          }
                          aria-label="Edit size chart"
                        >
                          <Pencil
                            size={14}
                          />
                        </button>

                        <button
                          type="button"
                          disabled={
                            busyId ===
                            chart.id
                          }
                          onClick={() =>
                            remove(
                              chart,
                            )
                          }
                          aria-label="Remove size chart"
                        >
                          {busyId ===
                          chart.id ? (
                            <Loader2
                              size={14}
                              className={styles.spin}
                            />
                          ) : (
                            <Trash2
                              size={14}
                            />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editorOpen ? (
        <div className={styles.overlay}>
          <form
            className={styles.editor}
            onSubmit={
              save
            }
          >
            <div className={styles.editorHeader}>
              <div>
                <span>
                  {editing
                    ? "Edit"
                    : "Create"}
                </span>

                <h2>
                  {editing?.name ??
                    "New Size Chart"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditorOpen(
                    false,
                  )
                }
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <div className={styles.editorBody}>
              <div className={styles.twoColumns}>
                <label className={styles.field}>
                  <span>
                    Unique Chart Name
                  </span>

                  <input
                    value={
                      form.name
                    }
                    placeholder="Polo Regular Fit"
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          name:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label className={styles.field}>
                  <span>
                    Measurement Unit
                  </span>

                  <select
                    value={
                      form.unit
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          unit:
                            event.target
                              .value as
                              SizeChartUnit,
                        }),
                      )
                    }
                  >
                    <option value="IN">
                      Inches
                    </option>

                    <option value="CM">
                      Centimeters
                    </option>

                    <option value="NONE">
                      No Unit
                    </option>
                  </select>
                </label>
              </div>

              <label className={styles.field}>
                <span>
                  Note
                </span>

                <textarea
                  rows={3}
                  value={
                    form.note
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        note:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </label>

              <label className={styles.activeField}>
                <input
                  type="checkbox"
                  checked={
                    form.active
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        active:
                          event.target
                            .checked,
                      }),
                    )
                  }
                />

                Available for product assignment
              </label>

              <div className={styles.sectionHeading}>
                <div>
                  <h3>
                    Measurement Columns
                  </h3>

                  <p>
                    Example: Chest,
                    Length, Shoulder,
                    Sleeve.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    addColumn
                  }
                >
                  <Plus
                    size={13}
                  />

                  Column
                </button>
              </div>

              <div className={styles.columns}>
                {form.columns.map(
                  (
                    column,
                    index,
                  ) => (
                    <div
                      key={
                        index
                      }
                      className={styles.columnEditor}
                    >
                      <input
                        value={
                          column
                        }
                        onChange={(
                          event,
                        ) =>
                          updateColumn(
                            index,
                            event.target
                              .value,
                          )
                        }
                      />

                      <button
                        type="button"
                        disabled={
                          form.columns
                            .length ===
                          1
                        }
                        onClick={() =>
                          removeColumn(
                            index,
                          )
                        }
                      >
                        <X
                          size={13}
                        />
                      </button>
                    </div>
                  ),
                )}
              </div>

              <div className={styles.sectionHeading}>
                <div>
                  <h3>
                    Size Measurements
                  </h3>

                  <p>
                    Enter the real
                    measurements for
                    every size.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    addRow
                  }
                >
                  <Plus
                    size={13}
                  />

                  Size
                </button>
              </div>

              <div className={styles.measurementWrap}>
                <table className={styles.measurementTable}>
                  <thead>
                    <tr>
                      <th>
                        Size
                      </th>

                      {form.columns.map(
                        (
                          column,
                          index,
                        ) => (
                          <th
                            key={
                              index
                            }
                          >
                            {
                              column
                            }
                          </th>
                        ),
                      )}

                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {form.rows.map(
                      (
                        row,
                        rowIndex,
                      ) => (
                        <tr
                          key={
                            rowIndex
                          }
                        >
                          <td>
                            <input
                              value={
                                row.size
                              }
                              placeholder="M"
                              onChange={(
                                event,
                              ) =>
                                updateRowSize(
                                  rowIndex,
                                  event.target
                                    .value,
                                )
                              }
                            />
                          </td>

                          {form.columns.map(
                            (
                              _,
                              columnIndex,
                            ) => (
                              <td
                                key={
                                  columnIndex
                                }
                              >
                                <input
                                  value={
                                    row.values[
                                      columnIndex
                                    ] ??
                                    ""
                                  }
                                  placeholder="0"
                                  onChange={(
                                    event,
                                  ) =>
                                    updateValue(
                                      rowIndex,
                                      columnIndex,
                                      event.target
                                        .value,
                                    )
                                  }
                                />
                              </td>
                            ),
                          )}

                          <td>
                            <button
                              type="button"
                              className={styles.removeRow}
                              disabled={
                                form.rows
                                  .length ===
                                1
                              }
                              onClick={() =>
                                removeRow(
                                  rowIndex,
                                )
                              }
                            >
                              <Trash2
                                size={13}
                              />
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div className={styles.preview}>
                <div className={styles.previewHeading}>
                  <Ruler
                    size={16}
                  />

                  <strong>
                    Preview
                  </strong>

                  <span>
                    {unitLabel(
                      form.unit,
                    )}
                  </span>
                </div>

                <div className={styles.previewWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>
                          Size
                        </th>

                        {form.columns.map(
                          (
                            column,
                            index,
                          ) => (
                            <th
                              key={
                                index
                              }
                            >
                              {
                                column ||
                                "—"
                              }
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {form.rows.map(
                        (
                          row,
                          rowIndex,
                        ) => (
                          <tr
                            key={
                              rowIndex
                            }
                          >
                            <td>
                              {
                                row.size ||
                                "—"
                              }
                            </td>

                            {form.columns.map(
                              (
                                _,
                                columnIndex,
                              ) => (
                                <td
                                  key={
                                    columnIndex
                                  }
                                >
                                  {row.values[
                                    columnIndex
                                  ] ||
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
              </div>
            </div>

            <footer className={styles.editorFooter}>
              <button
                type="button"
                className={styles.cancel}
                onClick={() =>
                  setEditorOpen(
                    false,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className={styles.primary}
                disabled={
                  saving
                }
              >
                {saving ? (
                  <Loader2
                    size={14}
                    className={styles.spin}
                  />
                ) : (
                  <Check
                    size={14}
                  />
                )}

                {saving
                  ? "Saving..."
                  : "Save Size Chart"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function unitLabel(
  unit:
    SizeChartUnit,
) {
  if (
    unit ===
    "CM"
  ) {
    return "Centimeters";
  }

  if (
    unit ===
    "IN"
  ) {
    return "Inches";
  }

  return "No unit";
}