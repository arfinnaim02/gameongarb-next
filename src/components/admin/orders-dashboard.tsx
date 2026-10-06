"use client";



import Link from "next/link";



import {

  useRouter,

  useSearchParams,

} from "next/navigation";



import {

  type FormEvent,

  useMemo,

  useState,

} from "react";



import {

  ChevronLeft,

  ChevronRight,

  Download,

  ExternalLink,

  FilterX,

  PackageCheck,

  RefreshCw,

  Search,

} from "lucide-react";



import {

  formatBDT,

} from "@/lib/money";



import styles from "./orders-dashboard.module.css";



export type OrderDashboardRow = {

  id: string;



  number: string;



  customer: string;



  phone: string;



  district: string;



  address: string;



  itemCount: number;



  total: number;



  payment:

    "COD" |

    "BKASH";



  paymentStatus:

    string;



  status:

    string;



  date:

    string;



  courier:

    string |

    null;



  courierStatus:

    string |

    null;



  trackingId:

    string |

    null;



  risk: {

    status:

      "PENDING" |

      "LOW" |

      "MEDIUM" |

      "HIGH" |

      "VERY_HIGH";



    score:

      number |

      null;

  };

};



export type OrdersDashboardData = {

  rows:

    OrderDashboardRow[];



  stats: {

    total:

      number;



    new:

      number;



    confirmed:

      number;



    packing:

      number;



    ready:

      number;



    shipped:

      number;



    delivered:

      number;



    problem:

      number;



    today:

      number;



    todayRevenue:

      number;

  };



  pagination: {

    page:

      number;



    pageSize:

      number;



    total:

      number;



    totalPages:

      number;

  };



  filters: {

    search:

      string;



    status:

      string;



    payment:

      string;



    paymentStatus:

      string;



    courier:

      string;



    area:

      string;



    period:

      string;



    sort:

      string;

  };

};



const STATUS_TABS = [

  {

    label:

      "All",

    value:

      "",

    key:

      "total",

  },



  {

    label:

      "New",

    value:

      "NEW",

    key:

      "new",

  },



  {

    label:

      "Confirmed",

    value:

      "CONFIRMED",

    key:

      "confirmed",

  },



  {

    label:

      "Packing",

    value:

      "PACKING",

    key:

      "packing",

  },



  {

    label:

      "Ready",

    value:

      "READY_TO_SHIP",

    key:

      "ready",

  },



  {

    label:

      "Shipped",

    value:

      "SHIPPED",

    key:

      "shipped",

  },



  {

    label:

      "Delivered",

    value:

      "DELIVERED",

    key:

      "delivered",

  },



  {

    label:

      "Problem",

    value:

      "PROBLEM",

    key:

      "problem",

  },

] as const;



const EDITABLE_ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PACKING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "FAILED_DELIVERY",
];

const TRANSITIONS:
  Record<
    string,
    string[]
  > = {
  NEW:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "NEW",
    ),

  CONFIRMED:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "CONFIRMED",
    ),

  PACKING:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "PACKING",
    ),

  READY_TO_SHIP:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "READY_TO_SHIP",
    ),

  SHIPPED:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "SHIPPED",
    ),

  CANCELLED:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "CANCELLED",
    ),

  RETURN_REQUESTED:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "RETURN_REQUESTED",
    ),

  RETURNED:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "RETURNED",
    ),

  FAILED_DELIVERY:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "FAILED_DELIVERY",
    ),

  DELIVERED: [],
};


const BULK_STATUS_OPTIONS = [
  "NEW",
  "CONFIRMED",
  "PACKING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
  "RETURN_REQUESTED",
  "RETURNED",
] as const;



function humanize(

  value: string,

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

        letter,

      ) =>

        letter.toUpperCase(),

    );

}



function formatOrderDate(

  value: string,

) {

  return new Intl.DateTimeFormat(

    "en-BD",

    {

      timeZone:

        "Asia/Dhaka",



      day:

        "numeric",



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



function escapeCsv(

  value:

    string |

    number |

    null,

) {

  const string =

    String(

      value ??

        "",

    );



  return `"${string.replaceAll(

    '"',

    '""',

  )}"`;

}



export function OrdersDashboard({

  data,

}: {

  data:

    OrdersDashboardData;

}) {

  const router =

    useRouter();



  const searchParams =

    useSearchParams();



  const [

    search,

    setSearch,

  ] =

    useState(

      data.filters

        .search,

    );



  const [

    selected,

    setSelected,

  ] =

    useState<

      Set<string>

    >(

      new Set(),

    );



  const [

    busyOrder,

    setBusyOrder,

  ] =

    useState<

      string |

      null

    >(

      null,

    );



  const [

    bulkBusy,

    setBulkBusy,

  ] =

    useState(

      false,

    );



  const [

    bulkTargetStatus,

    setBulkTargetStatus,

  ] =

    useState(

      "",

    );



  const [

    message,

    setMessage,

  ] =

    useState(

      "",

    );



  const [

    error,

    setError,

  ] =

    useState(

      "",

    );



  const allSelected =

    data.rows.length >

      0 &&

    data.rows.every(

      (

        row,

      ) =>

        selected.has(

          row.id,

        ),

    );



  const selectedRows =

    useMemo(

      () =>

        data.rows.filter(

          (

            row,

          ) =>

            selected.has(

              row.id,

            ),

        ),

      [

        data.rows,

        selected,

      ],

    );



    const eligibleBulkRows =

  useMemo(

    () => {

      if (

        !bulkTargetStatus

      ) {

        return [];

      }



      return selectedRows.filter(

        (

          row,

        ) =>

          (

            TRANSITIONS[

              row.status

            ] ??

            []

          ).includes(

            bulkTargetStatus,

          ),

      );

    },

    [

      selectedRows,

      bulkTargetStatus,

    ],

  );



  function updateQuery(

    key:

      string,

    value:

      string,

  ) {

    const params =

      new URLSearchParams(

        searchParams.toString(),

      );



    if (

      value

    ) {

      params.set(

        key,

        value,

      );

    } else {

      params.delete(

        key,

      );

    }



    if (

      key !==

      "page"

    ) {

      params.delete(

        "page",

      );

    }



    router.push(

      `/admin/orders${

        params.toString()

          ? `?${params.toString()}`

          : ""

      }`,

    );

  }



  function applySearch(

    event:

      FormEvent<HTMLFormElement>,

  ) {

    event.preventDefault();



    updateQuery(

      "search",

      search.trim(),

    );

  }



  function clearFilters() {

    setSearch(

      "",

    );



    setSelected(

      new Set(),

    );



    router.push(

      "/admin/orders",

    );

  }



  function toggleAll() {

    if (

      allSelected

    ) {

      setSelected(

        new Set(),

      );



      return;

    }



    setSelected(

      new Set(

        data.rows.map(

          (

            row,

          ) =>

            row.id,

        ),

      ),

    );

  }



  function toggleOne(

    id: string,

  ) {

    setSelected(

      (

        current,

      ) => {

        const next =

          new Set(

            current,

          );



        if (

          next.has(

            id,

          )

        ) {

          next.delete(

            id,

          );

        } else {

          next.add(

            id,

          );

        }



        return next;

      },

    );

  }



  async function updateStatus(

    id:

      string,

    status:

      string,

  ) {

    setBusyOrder(

      id,

    );



    setError(

      "",

    );



    setMessage(

      "",

    );



    try {

      const response =

        await fetch(

          "/api/admin/orders",

          {

            method:

              "PATCH",



            headers: {

              "content-type":

                "application/json",

            },



            body:

              JSON.stringify({

                id,

                status,

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

            "Unable to update order.",

        );

      }



      setMessage(

        result.message ??

          "Order updated.",

      );



      router.refresh();

    } catch (

      requestError

    ) {

      setError(

        requestError instanceof

          Error

          ? requestError.message

          : "Unable to update order.",

      );

    } finally {

      setBusyOrder(

        null,

      );

    }

  }



async function updateSelectedStatus() {

  if (

    !bulkTargetStatus

  ) {

    setError(

      "Select a status for the selected orders.",

    );



    return;

  }



  const eligibleOrders =

    selectedRows.filter(

      (

        row,

      ) =>

        (

          TRANSITIONS[

            row.status

          ] ??

          []

        ).includes(

          bulkTargetStatus,

        ),

    );



  const skipped =

    selectedRows.length -

    eligibleOrders.length;



  if (

    eligibleOrders.length ===

    0

  ) {

    setError(

      `None of the selected orders can move to ${humanize(

        bulkTargetStatus,

      )} from their current status.`,

    );



    return;

  }



  const targetLabel =

    humanize(

      bulkTargetStatus,

    );



  const warning =

    bulkTargetStatus ===

    "CANCELLED"

      ? "\n\nCancelling eligible orders will restore their inventory."

      : "";



  const skipNotice =

    skipped >

    0

      ? `\n\n${skipped} selected order${

          skipped ===

          1

            ? ""

            : "s"

        } cannot make this transition and will be skipped.`

      : "";



  if (

    !window.confirm(

      `Move ${eligibleOrders.length} selected order${

        eligibleOrders.length ===

        1

          ? ""

          : "s"

      } to ${targetLabel}?${skipNotice}${warning}`,

    )

  ) {

    return;

  }



  setBulkBusy(

    true,

  );



  setError(

    "",

  );



  setMessage(

    "",

  );



  let completed =

    0;



  const failed:

    string[] =

    [];



  try {

    for (

      const order

      of eligibleOrders

    ) {

      try {

        const response =

          await fetch(

            "/api/admin/orders",

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

                    order.id,



                  status:

                    bulkTargetStatus,

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

              `Unable to update ${order.number}.`,

          );

        }



        completed +=

          1;

      } catch {

        failed.push(

          order.number,

        );

      }

    }



    if (

      completed >

      0

    ) {

      setMessage(

        `${completed} order${

          completed ===

          1

            ? ""

            : "s"

        } moved to ${targetLabel}${

          skipped >

          0

            ? `. ${skipped} ineligible order${

                skipped ===

                1

                  ? ""

                  : "s"

              } skipped`

            : ""

        }.`,

      );

    }



    if (

      failed.length >

      0

    ) {

      setError(

        `Could not update ${failed.length} order${

          failed.length ===

          1

            ? ""

            : "s"

        }: ${failed.join(

          ", ",

        )}`,

      );

    }



    if (

      failed.length ===

      0

    ) {

      setSelected(

        new Set(),

      );



      setBulkTargetStatus(

        "",

      );

    }



    router.refresh();

  } finally {

    setBulkBusy(

      false,

    );

  }

}

  function exportCsv() {

    const rowsToExport =

      selectedRows.length >

      0

        ? selectedRows

        : data.rows;



    if (

      rowsToExport.length ===

      0

    ) {

      return;

    }



    const headers = [

      "Order",

      "Date",

      "Customer",

      "Phone",

      "District",

      "Address",

      "Items",

      "Total",

      "Payment Method",

      "Payment Status",

      "Order Status",

      "Courier",

      "Courier Status",

      "Tracking ID",

    ];



    const lines = [

      headers

        .map(

          escapeCsv,

        )

        .join(

          ",",

        ),



      ...rowsToExport.map(

        (

          row,

        ) =>

          [

            row.number,

            formatOrderDate(

              row.date,

            ),

            row.customer,

            row.phone,

            row.district,

            row.address,

            row.itemCount,

            row.total,

            row.payment,

            row.paymentStatus,

            row.status,

            row.courier,

            row.courierStatus,

            row.trackingId,

          ]

            .map(

              escapeCsv,

            )

            .join(

              ",",

            ),

      ),

    ];



    const blob =

      new Blob(

        [

          "\uFEFF",

          lines.join(

            "\n",

          ),

        ],

        {

          type:

            "text/csv;charset=utf-8",

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

      `game-on-garb-orders-${new Date()

        .toISOString()

        .slice(

          0,

          10,

        )}.csv`;



    link.click();



    URL.revokeObjectURL(

      url,

    );

  }



  function setStatusTab(

    value:

      string,

  ) {

    const params =

      new URLSearchParams(

        searchParams.toString(),

      );



    params.delete(

      "page",

    );



    if (

      value ===

      "PROBLEM"

    ) {

      params.delete(

        "status",

      );



      params.set(

        "problem",

        "1",

      );

    } else {

      params.delete(

        "problem",

      );



      if (

        value

      ) {

        params.set(

          "status",

          value,

        );

      } else {

        params.delete(

          "status",

        );

      }

    }



    router.push(

      `/admin/orders${

        params.toString()

          ? `?${params.toString()}`

          : ""

      }`,

    );

  }



  const currentProblem =

    searchParams.get(

      "problem",

    ) ===

    "1";



  return (

    <div

      className={

        styles.page

      }

    >

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

            Order Operations

          </span>



          <h1>

            Orders

          </h1>



          <p>

            Review,

            confirm,

            fulfil and

            monitor every

            Game On Garb

            order from one

            workspace.

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

              styles.secondaryButton

            }

            onClick={

              exportCsv

            }

          >

            <Download

              size={

                16

              }

            />



            Export CSV

          </button>



          <button

            type="button"

            className={

              styles.iconButton

            }

            aria-label="Refresh orders"

            onClick={() =>

              router.refresh()

            }

          >

            <RefreshCw

              size={

                17

              }

            />

          </button>

        </div>

      </header>



      <section

        className={

          styles.kpiGrid

        }

      >

        <article

          className={

            styles.kpi

          }

        >

          <span>

            Today

          </span>



          <strong>

            {

              data.stats

                .today

            }

          </strong>



          <small>

            orders received

          </small>

        </article>



        <article

          className={

            styles.kpi

          }

        >

          <span>

            Today&apos;s

            Value

          </span>



          <strong>

            {formatBDT(

              data.stats

                .todayRevenue,

            )}

          </strong>



          <small>

            excluding

            cancelled

          </small>

        </article>



        <article

          className={

            styles.kpi

          }

        >

          <span>

            Needs Action

          </span>



          <strong>

            {

              data.stats

                .new

            }

          </strong>



          <small>

            new orders

          </small>

        </article>



        <article

          className={`${styles.kpi} ${styles.problemKpi}`}

        >

          <span>

            Problems

          </span>



          <strong>

            {

              data.stats

                .problem

            }

          </strong>



          <small>

            cancelled /

            failed /

            returns

          </small>

        </article>

      </section>



      <nav

        className={

          styles.tabs

        }

        aria-label="Order status filters"

      >

        {STATUS_TABS.map(

          (

            tab,

          ) => {

            const count =

              data.stats[

                tab.key

              ];



            const active =

              tab.value ===

              "PROBLEM"

                ? currentProblem

                : !currentProblem &&

                  data.filters

                    .status ===

                    tab.value;



            return (

              <button

                key={

                  tab.value ||

                  "all"

                }

                type="button"

                className={

                  active

                    ? styles.activeTab

                    : styles.tab

                }

                onClick={() =>

                  setStatusTab(

                    tab.value,

                  )

                }

              >

                <span>

                  {

                    tab.label

                  }

                </span>



                <strong>

                  {count}

                </strong>

              </button>

            );

          },

        )}

      </nav>



      <section

        className={

          styles.filterCard

        }

      >

        <form

          className={

            styles.searchForm

          }

          onSubmit={

            applySearch

          }

        >

          <Search

            size={

              17

            }

          />



          <input

            value={

              search

            }

            onChange={(

              event,

            ) =>

              setSearch(

                event.target

                  .value,

              )

            }

            placeholder="Search order, customer, phone, district or address"

          />



          <button

            type="submit"

          >

            Search

          </button>

        </form>



        <div

          className={

            styles.filters

          }

        >

          <select

            value={

              data.filters

                .payment

            }

            onChange={(

              event,

            ) =>

              updateQuery(

                "payment",

                event.target

                  .value,

              )

            }

          >

            <option value="">

              All Payments

            </option>



            <option value="COD">

              COD

            </option>



            <option value="BKASH">

              bKash

            </option>

          </select>



          <select

            value={

              data.filters

                .paymentStatus

            }

            onChange={(

              event,

            ) =>

              updateQuery(

                "paymentStatus",

                event.target

                  .value,

              )

            }

          >

            <option value="">

              Payment Status

            </option>



            <option value="PENDING">

              Pending

            </option>



            <option value="PROCESSING">

              Processing

            </option>



            <option value="PAID">

              Paid

            </option>



            <option value="FAILED">

              Failed

            </option>



            <option value="REFUNDED">

              Refunded

            </option>

          </select>



          <select

            value={

              data.filters

                .courier

            }

            onChange={(

              event,

            ) =>

              updateQuery(

                "courier",

                event.target

                  .value,

              )

            }

          >

            <option value="">

              All Couriers

            </option>



            <option value="UNASSIGNED">

              Not Assigned

            </option>



            <option value="STEADFAST">

              Steadfast

            </option>



            <option value="PATHAO">

              Pathao

            </option>

          </select>



          <select

            value={

              data.filters

                .area

            }

            onChange={(

              event,

            ) =>

              updateQuery(

                "area",

                event.target

                  .value,

              )

            }

          >

            <option value="">

              All Areas

            </option>



            <option value="DHAKA">

              Dhaka

            </option>



            <option value="OUTSIDE_DHAKA">

              Outside Dhaka

            </option>

          </select>



          <select

            value={

              data.filters

                .period

            }

            onChange={(

              event,

            ) =>

              updateQuery(

                "period",

                event.target

                  .value,

              )

            }

          >

            <option value="">

              All Dates

            </option>



            <option value="TODAY">

              Today

            </option>



            <option value="7D">

              Last 7 Days

            </option>



            <option value="30D">

              Last 30 Days

            </option>

          </select>



          <select

            value={

              data.filters

                .sort

            }

            onChange={(

              event,

            ) =>

              updateQuery(

                "sort",

                event.target

                  .value,

              )

            }

          >

            <option value="">

              Newest First

            </option>



            <option value="OLDEST">

              Oldest First

            </option>



            <option value="AMOUNT_HIGH">

              Amount: High

            </option>



            <option value="AMOUNT_LOW">

              Amount: Low

            </option>

          </select>



          <button

            type="button"

            className={

              styles.clearButton

            }

            onClick={

              clearFilters

            }

          >

            <FilterX

              size={

                15

              }

            />



            Clear

          </button>

        </div>

      </section>



{selected.size >

0 ? (

  <section

    className={

      styles.bulkBar

    }

  >

    <div

      className={

        styles.bulkSummary

      }

    >

      <div

        className={

          styles.bulkCount

        }

      >

        {

          selected.size

        }

      </div>



      <div>

        <strong>

          {selected.size ===

          1

            ? "1 order selected"

            : `${selected.size} orders selected`}

        </strong>



        <span>

          {bulkTargetStatus

            ? `${eligibleBulkRows.length} eligible for ${humanize(

                bulkTargetStatus,

              )}`

            : "Choose a status to update selected orders"}

        </span>

      </div>

    </div>



    <div

      className={

        styles.bulkActions

      }

    >

      <div

        className={

          styles.bulkStatusSelect

        }

      >

        <PackageCheck

          size={

            15

          }

        />



        <select

          value={

            bulkTargetStatus

          }

          disabled={

            bulkBusy

          }

          onChange={(

            event,

          ) =>

            setBulkTargetStatus(

              event.target

                .value,

            )

          }

          aria-label="Bulk order status"

        >

          <option value="">

            Move selected to...

          </option>



          {BULK_STATUS_OPTIONS.map(

            (

              status,

            ) => (

              <option

                key={

                  status

                }

                value={

                  status

                }

              >

                {humanize(

                  status,

                )}

              </option>

            ),

          )}

        </select>

      </div>



      <button

        type="button"

        className={

          styles.bulkApplyButton

        }

        onClick={

          updateSelectedStatus

        }

        disabled={

          bulkBusy ||

          !bulkTargetStatus ||

          eligibleBulkRows.length ===

            0

        }

      >

        <PackageCheck

          size={

            16

          }

        />



        {bulkBusy

          ? "Updating..."

          : bulkTargetStatus

            ? `Apply to ${eligibleBulkRows.length}`

            : "Apply Status"}

      </button>



      <button

        type="button"

        className={

          styles.bulkExportButton

        }

        onClick={

          exportCsv

        }

        disabled={

          bulkBusy

        }

      >

        <Download

          size={

            16

          }

        />



        Export Selected

      </button>



      <button

        type="button"

        className={

          styles.bulkClearButton

        }

        disabled={

          bulkBusy

        }

        onClick={() => {

          setSelected(

            new Set(),

          );



          setBulkTargetStatus(

            "",

          );

        }}

      >

        Clear

      </button>

    </div>

  </section>

) : null}



      {message ? (

        <div

          className={

            styles.success

          }

        >

          {message}

        </div>

      ) : null}



      {error ? (

        <div

          className={

            styles.error

          }

        >

          {error}

        </div>

      ) : null}



      <section

        className={

          styles.tableCard

        }

      >

        <div

          className={

            styles.tableHeader

          }

        >

          <div>

            <strong>

              {

                data.pagination

                  .total

              }{" "}

              orders

            </strong>



            <span>

              Page{" "}

              {

                data.pagination

                  .page

              }{" "}

              of{" "}

              {

                data.pagination

                  .totalPages

              }

            </span>

          </div>

        </div>



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

                <th

                  className={

                    styles.checkboxCell

                  }

                >

                  <input

                    type="checkbox"

                    checked={

                      allSelected

                    }

                    onChange={

                      toggleAll

                    }

                    aria-label="Select all orders on this page"

                  />

                </th>



                <th>

                  Order

                </th>



                <th>

                  Customer

                </th>



                <th>

                  Area

                </th>



                <th>

                  Items

                </th>



                <th>

                  Total

                </th>



                <th>

                  Payment

                </th>



                <th>

                  Risk

                </th>



                <th>

                  Courier

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

              {data.rows.map(

                (

                  row,

                ) => {

                  const transitions =

                    TRANSITIONS[

                      row.status

                    ] ??

                    [];



                  return (

                    <tr

                      key={

                        row.id

                      }

                    >

                      <td

                        className={

                          styles.checkboxCell

                        }

                      >

                        <input

                          type="checkbox"

                          checked={

                            selected.has(

                              row.id,

                            )

                          }

                          onChange={() =>

                            toggleOne(

                              row.id,

                            )

                          }

                          aria-label={`Select ${row.number}`}

                        />

                      </td>



                      <td>

                        <Link

                          href={`/admin/orders/${row.id}`}

                          className={

                            styles.orderLink

                          }

                        >

                          {

                            row.number

                          }



                          <ExternalLink

                            size={

                              12

                            }

                          />

                        </Link>



                        <small

                          className={

                            styles.muted

                          }

                        >

                          {formatOrderDate(

                            row.date,

                          )}

                        </small>

                      </td>



                      <td>

                        <strong

                          className={

                            styles.customerName

                          }

                        >

                          {

                            row.customer

                          }

                        </strong>



                        <a

                          className={

                            styles.phone

                          }

                          href={`tel:${row.phone}`}

                        >

                          {

                            row.phone

                          }

                        </a>

                      </td>



                      <td>

                        <strong>

                          {

                            row.district

                          }

                        </strong>



                        <small

                          className={

                            styles.address

                          }

                          title={

                            row.address

                          }

                        >

                          {

                            row.address

                          }

                        </small>

                      </td>



                      <td>

                        <span

                          className={

                            styles.itemCount

                          }

                        >

                          {

                            row.itemCount

                          }

                        </span>

                      </td>



                      <td>

                        <strong

                          className={

                            styles.amount

                          }

                        >

                          {formatBDT(

                            row.total,

                          )}

                        </strong>

                      </td>



                      <td>

                        <span

                          className={

                            styles.paymentMethod

                          }

                        >

                          {

                            row.payment

                          }

                        </span>



                        <small

                          className={

                            row.paymentStatus ===

                            "PAID"

                              ? styles.paymentPaid

                              : styles.muted

                          }

                        >

                          {humanize(

                            row.paymentStatus,

                          )}

                        </small>

                      </td>



                      <td>

                        <span

                          className={

                            styles.riskPending

                          }

                        >

                          Pending

                        </span>



                        <small

                          className={

                            styles.muted

                          }

                        >

                          Phase 2C

                        </small>

                      </td>



                      <td>

                        {row.courier ? (

                          <>

                            <strong

                              className={

                                styles.courierName

                              }

                            >

                              {

                                row.courier

                              }

                            </strong>



                            <small

                              className={

                                styles.muted

                              }

                            >

                              {row.courierStatus

                                ? humanize(

                                    row.courierStatus,

                                  )

                                : "Created"}

                            </small>

                          </>

                        ) : (

                          <span

                            className={

                              styles.unassigned

                            }

                          >

                            Not assigned

                          </span>

                        )}

                      </td>



                      <td>

                        <span

                          className={`${styles.status} ${styles[`status_${row.status}`] ?? ""}`}

                        >

                          {humanize(

                            row.status,

                          )}

                        </span>

                      </td>



                      <td>

                        <div

                          className={

                            styles.actions

                          }

                        >

                          <Link

                            href={`/admin/orders/${row.id}`}

                            className={

                              styles.viewButton

                            }

                          >

                            View

                          </Link>



                          {transitions.length >

                          0 ? (

                            <select

                              value=""

                              disabled={

                                busyOrder ===

                                row.id

                              }

                              onChange={(

                                event,

                              ) => {

                                const value =

                                  event.target

                                    .value;



                                if (

                                  !value

                                ) {

                                  return;

                                }



                                void updateStatus(

                                  row.id,

                                  value,

                                );

                              }}

                            >

                              <option value="">

                                {busyOrder ===

                                row.id

                                  ? "Updating..."

                                  : "Update"}

                              </option>



                              {transitions.map(

                                (

                                  transition,

                                ) => (

                                  <option

                                    key={

                                      transition

                                    }

                                    value={

                                      transition

                                    }

                                  >

                                    {humanize(

                                      transition,

                                    )}

                                  </option>

                                ),

                              )}

                            </select>

                          ) : null}

                        </div>

                      </td>

                    </tr>

                  );

                },

              )}

            </tbody>

          </table>



          {data.rows.length ===

          0 ? (

            <div

              className={

                styles.empty

              }

            >

              <Search

                size={

                  26

                }

              />



              <strong>

                No orders

                found

              </strong>



              <p>

                Try changing

                your search or

                filters.

              </p>



              <button

                type="button"

                onClick={

                  clearFilters

                }

              >

                Clear Filters

              </button>

            </div>

          ) : null}

        </div>



        <footer

          className={

            styles.pagination

          }

        >

          <span>

            Showing{" "}

            {data.rows.length ===

            0

              ? 0

              : (data.pagination

                    .page -

                  1) *

                  data.pagination

                    .pageSize +

                1}

            –

            {Math.min(

              data.pagination

                .page *

                data.pagination

                  .pageSize,

              data.pagination

                .total,

            )}{" "}

            of{" "}

            {

              data.pagination

                .total

            }

          </span>



          <div>

            <button

              type="button"

              disabled={

                data.pagination

                  .page <=

                1

              }

              onClick={() =>

                updateQuery(

                  "page",

                  String(

                    data.pagination

                      .page -

                      1,

                  ),

                )

              }

            >

              <ChevronLeft

                size={

                  16

                }

              />



              Previous

            </button>



            <span>

              {

                data.pagination

                  .page

              }{" "}

              /{" "}

              {

                data.pagination

                  .totalPages

              }

            </span>



            <button

              type="button"

              disabled={

                data.pagination

                  .page >=

                data.pagination

                  .totalPages

              }

              onClick={() =>

                updateQuery(

                  "page",

                  String(

                    data.pagination

                      .page +

                      1,

                  ),

                )

              }

            >

              Next



              <ChevronRight

                size={

                  16

                }

              />

            </button>

          </div>

        </footer>

      </section>

    </div>

  );

}