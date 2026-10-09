"use client";

import Link from "next/link";

import {
  AlertCircle,
  ArrowDownUp,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldBan,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  UserRound,
  Users,
  WalletCards,
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

import {
  formatBDT,
} from "@/lib/money";

import styles from "./customer-manager.module.css";

/* =========================================================
   TYPES
   ========================================================= */

type CustomerStatus =
  | "ACTIVE"
  | "BLOCKED"
  | "PENDING";

type CustomerAddress = {
  id:
    string;

  label:
    string;

  fullName:
    string;

  phone:
    string;

  email:
    string |
    null;

  division:
    string;

  district:
    string;

  thana:
    string;

  address:
    string;

  isDefault:
    boolean;

  createdAt:
    string;
};

type CustomerOrder = {
  id:
    string;

  number:
    string;

  total:
    number;

  status:
    string;

  paymentStatus:
    string;

  paymentMethod:
    string;

  createdAt:
    string;
};

export type CustomerManagerItem = {
  id:
    string;

  userId:
    string |
    null;

  name:
    string;

  email:
    string |
    null;

  phone:
    string;

  status:
    CustomerStatus;

  notes:
    string |
    null;

  registered:
    boolean;

  createdAt:
    string;

  updatedAt:
    string;

  orderCount:
    number;

  validOrderCount:
    number;

  deliveredOrders:
    number;

  addressCount:
    number;

  totalSpent:
    number;

  lastOrderAt:
    string |
    null;

  addresses:
    CustomerAddress[];

  orders:
    CustomerOrder[];
};

type StatusFilter =
  | "ALL"
  | CustomerStatus;

type TypeFilter =
  | "ALL"
  | "REGISTERED"
  | "GUEST";

type SortOption =
  | "NEWEST"
  | "SPEND"
  | "ORDERS"
  | "LAST_ORDER";

/* =========================================================
   HELPERS
   ========================================================= */

function initials(
  name:
    string,
) {
  return name
    .trim()
    .split(
      /\s+/,
    )
    .slice(
      0,
      2,
    )
    .map(
      (
        part,
      ) =>
        part[0]
          ?.toUpperCase() ??
        "",
    )
    .join("") ||
    "C";
}

function formatDate(
  value:
    string |
    null,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    },
  ).format(
    new Date(
      value,
    ),
  );
}

function formatStatus(
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

/* =========================================================
   MANAGER
   ========================================================= */

export function CustomerManager({
  initialCustomers,
}: {
  initialCustomers:
    CustomerManagerItem[];
}) {
  const router =
    useRouter();

  const [
    customers,
    setCustomers,
  ] =
    useState(
      initialCustomers,
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "ALL",
    );

  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState<TypeFilter>(
      "ALL",
    );

  const [
    sort,
    setSort,
  ] =
    useState<SortOption>(
      "NEWEST",
    );

  const [
    selected,
    setSelected,
  ] =
    useState<CustomerManagerItem | null>(
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
      setCustomers(
        initialCustomers,
      );

      setSelected(
        (
          current,
        ) =>
          current
            ? initialCustomers.find(
                (
                  customer,
                ) =>
                  customer.id ===
                  current.id,
              ) ??
              null
            : null,
      );
    },
    [
      initialCustomers,
    ],
  );

  /* =======================================================
     KPIS
     ======================================================= */

  const stats =
    useMemo(
      () => {
        const active =
          customers.filter(
            (
              customer,
            ) =>
              customer.status ===
              "ACTIVE",
          ).length;

        const blocked =
          customers.filter(
            (
              customer,
            ) =>
              customer.status ===
              "BLOCKED",
          ).length;

        const repeat =
          customers.filter(
            (
              customer,
            ) =>
              customer.validOrderCount >=
              2,
          ).length;

        const totalValue =
          customers.reduce(
            (
              total,
              customer,
            ) =>
              total +
              customer.totalSpent,
            0,
          );

        return {
          total:
            customers.length,

          active,

          blocked,

          repeat,

          totalValue,
        };
      },
      [
        customers,
      ],
    );

  /* =======================================================
     FILTERING
     ======================================================= */

  const filtered =
    useMemo(
      () => {
        const cleanQuery =
          query
            .trim()
            .toLowerCase();

        const result =
          customers.filter(
            (
              customer,
            ) => {
              const matchesQuery =
                !cleanQuery ||
                [
                  customer.name,
                  customer.phone,
                  customer.email ??
                    "",
                ]
                  .join(
                    " ",
                  )
                  .toLowerCase()
                  .includes(
                    cleanQuery,
                  );

              const matchesStatus =
                statusFilter ===
                  "ALL" ||
                customer.status ===
                  statusFilter;

              const matchesType =
                typeFilter ===
                  "ALL" ||
                (
                  typeFilter ===
                    "REGISTERED" &&
                  customer.registered
                ) ||
                (
                  typeFilter ===
                    "GUEST" &&
                  !customer.registered
                );

              return (
                matchesQuery &&
                matchesStatus &&
                matchesType
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
              "SPEND"
            ) {
              return (
                second.totalSpent -
                first.totalSpent
              );
            }

            if (
              sort ===
              "ORDERS"
            ) {
              return (
                second.validOrderCount -
                first.validOrderCount
              );
            }

            if (
              sort ===
              "LAST_ORDER"
            ) {
              return (
                new Date(
                  second.lastOrderAt ??
                    0,
                ).getTime() -
                new Date(
                  first.lastOrderAt ??
                    0,
                ).getTime()
              );
            }

            return (
              new Date(
                second.createdAt,
              ).getTime() -
              new Date(
                first.createdAt,
              ).getTime()
            );
          },
        );
      },
      [
        customers,
        query,
        statusFilter,
        typeFilter,
        sort,
      ],
    );

  /* =======================================================
     MUTATION
     ======================================================= */

  async function updateCustomer(
    body:
      Record<
        string,
        unknown
      >,
  ) {
    setBusy(
      true,
    );

    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/customers",
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify(
                body,
              ),
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
            "Unable to update customer.",
        );
      }

      setMessage(
        result.message ??
          "Customer updated.",
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
          : "Unable to update customer.",
      );

      return false;
    } finally {
      setBusy(
        false,
      );
    }
  }

  async function toggleStatus(
    customer:
      CustomerManagerItem,
  ) {
    const nextStatus:
      CustomerStatus =
      customer.status ===
      "BLOCKED"
        ? "ACTIVE"
        : "BLOCKED";

    await updateCustomer({
      id:
        customer.id,

      status:
        nextStatus,
    });
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter(
      "ALL",
    );
    setTypeFilter(
      "ALL",
    );
    setSort(
      "NEWEST",
    );
  }

  const filtersActive =
    Boolean(
      query,
    ) ||
    statusFilter !==
      "ALL" ||
    typeFilter !==
      "ALL" ||
    sort !==
      "NEWEST";

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
            Customer Intelligence
          </span>

          <h1>
            Customers
          </h1>

          <p>
            Manage customer
            profiles, purchase
            value, account access
            and order activity.
          </p>
        </div>

        <div
          className={
            styles.headerSummary
          }
        >
          <Users
            size={
              18
            }
          />

          <span>
            {
              stats.total
            }{" "}
            customers
          </span>
        </div>
      </header>

      {message ? (
        <div
          className={
            styles.success
          }
        >
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
          <AlertCircle
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
          <div
            className={
              styles.kpiIcon
            }
          >
            <Users
              size={
                18
              }
            />
          </div>

          <div>
            <span>
              Total Customers
            </span>

            <strong>
              {
                stats.total
              }
            </strong>

            <small>
              All customer
              profiles
            </small>
          </div>
        </article>

        <article
          className={
            styles.kpiCard
          }
        >
          <div
            className={
              styles.kpiIcon
            }
          >
            <UserCheck
              size={
                18
              }
            />
          </div>

          <div>
            <span>
              Active
            </span>

            <strong>
              {
                stats.active
              }
            </strong>

            <small>
              Can use account
              normally
            </small>
          </div>
        </article>

        <article
          className={
            styles.kpiCard
          }
        >
          <div
            className={
              styles.kpiIcon
            }
          >
            <ShoppingBag
              size={
                18
              }
            />
          </div>

          <div>
            <span>
              Repeat Buyers
            </span>

            <strong>
              {
                stats.repeat
              }
            </strong>

            <small>
              2+ valid orders
            </small>
          </div>
        </article>

        <article
          className={
            styles.kpiCard
          }
        >
          <div
            className={
              styles.kpiIcon
            }
          >
            <WalletCards
              size={
                18
              }
            />
          </div>

          <div>
            <span>
              Customer Value
            </span>

            <strong>
              {formatBDT(
                stats.totalValue,
              )}
            </strong>

            <small>
              Lifetime valid
              order value
            </small>
          </div>
        </article>
      </section>

      {/* ===================================================
          FILTER TOOLBAR
          =================================================== */}

      <section
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
              16
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
            placeholder="Search name, phone or email..."
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
                  14
                }
              />
            </button>
          ) : null}
        </label>

        <select
          value={
            statusFilter
          }
          onChange={(
            event,
          ) =>
            setStatusFilter(
              event.target
                .value as StatusFilter,
            )
          }
        >
          <option value="ALL">
            All statuses
          </option>

          <option value="ACTIVE">
            Active
          </option>

          <option value="BLOCKED">
            Blocked
          </option>

          <option value="PENDING">
            Pending
          </option>
        </select>

        <select
          value={
            typeFilter
          }
          onChange={(
            event,
          ) =>
            setTypeFilter(
              event.target
                .value as TypeFilter,
            )
          }
        >
          <option value="ALL">
            All customers
          </option>

          <option value="REGISTERED">
            Registered
          </option>

          <option value="GUEST">
            Guest
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
            <option value="NEWEST">
              Newest
            </option>

            <option value="SPEND">
              Highest spend
            </option>

            <option value="ORDERS">
              Most orders
            </option>

            <option value="LAST_ORDER">
              Latest order
            </option>
          </select>
        </label>

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
      </section>

      {/* ===================================================
          TABLE
          =================================================== */}

      <section
        className={
          styles.tableCard
        }
      >
        <div
          className={
            styles.tableTop
          }
        >
          <div>
            <strong>
              Customer Directory
            </strong>

            <span>
              {
                filtered.length
              }{" "}
              shown
            </span>
          </div>
        </div>

        {filtered.length >
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
                    Customer
                  </th>

                  <th>
                    Contact
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Orders
                  </th>

                  <th>
                    Lifetime Value
                  </th>

                  <th>
                    Last Order
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
                {filtered.map(
                  (
                    customer,
                  ) => (
                    <tr
                      key={
                        customer.id
                      }
                    >
                      <td>
                        <div
                          className={
                            styles.customerCell
                          }
                        >
                          <span
                            className={
                              styles.avatar
                            }
                          >
                            {initials(
                              customer.name,
                            )}
                          </span>

                          <div>
                            <strong>
                              {
                                customer.name
                              }
                            </strong>

                            <span>
                              Joined{" "}
                              {formatDate(
                                customer.createdAt,
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.contactCell
                          }
                        >
                          <span>
                            {
                              customer.phone
                            }
                          </span>

                          <small>
                            {
                              customer.email ??
                              "No email"
                            }
                          </small>
                        </div>
                      </td>

                      <td>
                        <span
                          className={
                            customer.registered
                              ? styles.typeRegistered
                              : styles.typeGuest
                          }
                        >
                          {customer.registered
                            ? "Registered"
                            : "Guest"}
                        </span>
                      </td>

                      <td>
                        <div
                          className={
                            styles.numberCell
                          }
                        >
                          <strong>
                            {
                              customer.validOrderCount
                            }
                          </strong>

                          <span>
                            {
                              customer.deliveredOrders
                            }{" "}
                            delivered
                          </span>
                        </div>
                      </td>

                      <td>
                        <strong
                          className={
                            styles.money
                          }
                        >
                          {formatBDT(
                            customer.totalSpent,
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={
                            styles.lastOrder
                          }
                        >
                          {formatDate(
                            customer.lastOrderAt,
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            customer.status ===
                            "ACTIVE"
                              ? styles.statusActive
                              : customer.status ===
                                  "BLOCKED"
                                ? styles.statusBlocked
                                : styles.statusPending
                          }`}
                        >
                          {formatStatus(
                            customer.status,
                          )}
                        </span>
                      </td>

                      <td>
                        <div
                          className={
                            styles.actions
                          }
                        >
                          <button
                            type="button"
                            className={
                              styles.viewButton
                            }
                            onClick={() =>
                              setSelected(
                                customer,
                              )
                            }
                          >
                            <Eye
                              size={
                                14
                              }
                            />

                            View
                          </button>

                          <button
                            type="button"
                            className={
                              customer.status ===
                              "BLOCKED"
                                ? styles.activateButton
                                : styles.blockButton
                            }
                            disabled={
                              busy
                            }
                            onClick={() =>
                              void toggleStatus(
                                customer,
                              )
                            }
                          >
                            {customer.status ===
                            "BLOCKED" ? (
                              <ShieldCheck
                                size={
                                  14
                                }
                              />
                            ) : (
                              <ShieldBan
                                size={
                                  14
                                }
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
        ) : (
          <div
            className={
              styles.empty
            }
          >
            <Users
              size={
                30
              }
            />

            <strong>
              No customers found
            </strong>

            <p>
              Try changing the
              search or filters.
            </p>

            {filtersActive ? (
              <button
                type="button"
                onClick={
                  resetFilters
                }
              >
                Clear filters
              </button>
            ) : null}
          </div>
        )}
      </section>

      {selected ? (
        <CustomerDrawer
          customer={
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
          updateCustomer={
            updateCustomer
          }
        />
      ) : null}
    </div>
  );
}

/* =========================================================
   CUSTOMER DRAWER
   ========================================================= */

function CustomerDrawer({
  customer,
  busy,
  close,
  updateCustomer,
}: {
  customer:
    CustomerManagerItem;

  busy:
    boolean;

  close:
    () => void;

  updateCustomer:
    (
      body:
        Record<
          string,
          unknown
        >,
    ) =>
      Promise<boolean>;
}) {
  const [
    notes,
    setNotes,
  ] =
    useState(
      customer.notes ??
        "",
    );

  const [
    savingNotes,
    setSavingNotes,
  ] =
    useState(
      false,
    );

  async function saveNotes() {
    setSavingNotes(
      true,
    );

    await updateCustomer({
      id:
        customer.id,

      notes,
    });

    setSavingNotes(
      false,
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
          <div
            className={
              styles.drawerIdentity
            }
          >
            <span
              className={
                styles.drawerAvatar
              }
            >
              {initials(
                customer.name,
              )}
            </span>

            <div>
              <span>
                Customer Profile
              </span>

              <h2>
                {
                  customer.name
                }
              </h2>

              <small>
                {customer.registered
                  ? "Registered account"
                  : "Guest customer"}
              </small>
            </div>
          </div>

          <button
            type="button"
            className={
              styles.drawerClose
            }
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
          {/* CONTACT */}

          <section
            className={
              styles.drawerSection
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <UserRound
                size={
                  16
                }
              />

              <strong>
                Contact
              </strong>
            </div>

            <div
              className={
                styles.infoGrid
              }
            >
              <div>
                <Phone
                  size={
                    14
                  }
                />

                <span>
                  Phone
                </span>

                <strong>
                  {
                    customer.phone
                  }
                </strong>
              </div>

              <div>
                <Mail
                  size={
                    14
                  }
                />

                <span>
                  Email
                </span>

                <strong>
                  {
                    customer.email ??
                    "Not provided"
                  }
                </strong>
              </div>

              <div>
                <ShoppingBag
                  size={
                    14
                  }
                />

                <span>
                  Orders
                </span>

                <strong>
                  {
                    customer.validOrderCount
                  }
                </strong>
              </div>

              <div>
                <WalletCards
                  size={
                    14
                  }
                />

                <span>
                  Lifetime Value
                </span>

                <strong>
                  {formatBDT(
                    customer.totalSpent,
                  )}
                </strong>
              </div>
            </div>
          </section>

          {/* ADDRESSES */}

          <section
            className={
              styles.drawerSection
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <MapPin
                size={
                  16
                }
              />

              <strong>
                Addresses
              </strong>

              <span>
                {
                  customer.addressCount
                }
              </span>
            </div>

            {customer.addresses.length >
            0 ? (
              <div
                className={
                  styles.addressList
                }
              >
                {customer.addresses.map(
                  (
                    address,
                  ) => (
                    <article
                      key={
                        address.id
                      }
                      className={
                        styles.addressCard
                      }
                    >
                      <div
                        className={
                          styles.addressTop
                        }
                      >
                        <strong>
                          {
                            address.label
                          }
                        </strong>

                        {address.isDefault ? (
                          <span>
                            Default
                          </span>
                        ) : null}
                      </div>

                      <p>
                        {
                          address.address
                        }
                      </p>

                      <small>
                        {
                          address.thana
                        }
                        ,{" "}
                        {
                          address.district
                        }
                        ,{" "}
                        {
                          address.division
                        }
                      </small>

                      <small>
                        {
                          address.fullName
                        }{" "}
                        ·{" "}
                        {
                          address.phone
                        }
                      </small>
                    </article>
                  ),
                )}
              </div>
            ) : (
              <div
                className={
                  styles.miniEmpty
                }
              >
                No saved addresses.
              </div>
            )}
          </section>

          {/* ORDERS */}

          <section
            className={
              styles.drawerSection
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <Clock3
                size={
                  16
                }
              />

              <strong>
                Order History
              </strong>

              <span>
                {
                  customer.orderCount
                }
              </span>
            </div>

            {customer.orders.length >
            0 ? (
              <div
                className={
                  styles.orderList
                }
              >
                {customer.orders.map(
                  (
                    order,
                  ) => (
                    <Link
                      key={
                        order.id
                      }
                      href={`/admin/orders/${order.id}`}
                      className={
                        styles.orderRow
                      }
                    >
                      <div>
                        <strong>
                          {
                            order.number
                          }
                        </strong>

                        <span>
                          {formatDate(
                            order.createdAt,
                          )}{" "}
                          ·{" "}
                          {formatStatus(
                            order.status,
                          )}
                        </span>
                      </div>

                      <strong>
                        {formatBDT(
                          order.total,
                        )}
                      </strong>

                      <ChevronRight
                        size={
                          15
                        }
                      />
                    </Link>
                  ),
                )}
              </div>
            ) : (
              <div
                className={
                  styles.miniEmpty
                }
              >
                No order history.
              </div>
            )}
          </section>

          {/* NOTES */}

          <section
            className={
              styles.drawerSection
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <FileText
                size={
                  16
                }
              />

              <strong>
                Internal Notes
              </strong>
            </div>

            <textarea
              className={
                styles.notesField
              }
              rows={
                5
              }
              maxLength={
                2000
              }
              value={
                notes
              }
              placeholder="Add private customer notes..."
              onChange={(
                event,
              ) =>
                setNotes(
                  event.target
                    .value,
                )
              }
            />

            <div
              className={
                styles.notesFooter
              }
            >
              <span>
                {
                  notes.length
                }
                /2000
              </span>

              <button
                type="button"
                disabled={
                  busy ||
                  savingNotes
                }
                onClick={() =>
                  void saveNotes()
                }
              >
                {savingNotes
                  ? "Saving..."
                  : "Save Notes"}
              </button>
            </div>
          </section>

          {/* ACCESS */}

          <section
            className={
              styles.drawerSection
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <CircleUserRound
                size={
                  16
                }
              />

              <strong>
                Account Access
              </strong>
            </div>

            <div
              className={
                styles.accessCard
              }
            >
              <div>
                <span>
                  Current status
                </span>

                <strong>
                  {formatStatus(
                    customer.status,
                  )}
                </strong>
              </div>

              <button
                type="button"
                className={
                  customer.status ===
                  "BLOCKED"
                    ? styles.activateWide
                    : styles.blockWide
                }
                disabled={
                  busy
                }
                onClick={() =>
                  void updateCustomer({
                    id:
                      customer.id,

                    status:
                      customer.status ===
                      "BLOCKED"
                        ? "ACTIVE"
                        : "BLOCKED",
                  })
                }
              >
                {customer.status ===
                "BLOCKED" ? (
                  <>
                    <ShieldCheck
                      size={
                        15
                      }
                    />

                    Unblock Customer
                  </>
                ) : (
                  <>
                    <ShieldBan
                      size={
                        15
                      }
                    />

                    Block Customer
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}