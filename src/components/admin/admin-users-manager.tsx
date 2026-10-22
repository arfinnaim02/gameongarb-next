"use client";

import {
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  X,
} from "lucide-react";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import type {
  AdminRole,
} from "@/lib/roles";

type AdminStatus =
  | "ACTIVE"
  | "BLOCKED"
  | "PENDING";

type AdminUser = {
  id:
    string;

  name:
    string;

  email:
    string;

  phone:
    string | null;

  role:
    AdminRole;

  status:
    AdminStatus;

  sessionCount:
    number;

  createdAt:
    string;

  updatedAt:
    string;
};

type Props = {
  currentUser: {
    id:
      string;

    role:
      AdminRole;
  };

  initialUsers:
    AdminUser[];
};

export function AdminUsersManager({
  currentUser,
  initialUsers,
}: Props) {
  const router =
    useRouter();

  const [
    users,
    setUsers,
  ] =
    useState(
      initialUsers,
    );

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    editing,
    setEditing,
  ] =
    useState<
      AdminUser |
      null
    >(null);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

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

  const assignableRoles:
    AdminRole[] =
    currentUser.role ===
    "SUPER_ADMIN"
      ? [
          "SUPER_ADMIN",
          "ADMIN",
          "MANAGER",
          "STAFF",
        ]
      : [
          "MANAGER",
          "STAFF",
        ];

  function canManage(
    user:
      AdminUser,
  ) {
    if (
      user.id ===
      currentUser.id
    ) {
      return false;
    }

    if (
      currentUser.role ===
      "SUPER_ADMIN"
    ) {
      return true;
    }

    return (
      currentUser.role ===
        "ADMIN" &&
      (
        user.role ===
          "MANAGER" ||
        user.role ===
          "STAFF"
      )
    );
  }

  async function readResponse(
    response:
      Response,
  ) {
    const text =
      await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(
        text,
      ) as Record<
        string,
        unknown
      >;
    } catch {
      return {
        error:
          text.slice(
            0,
            300,
          ),
      };
    }
  }

  async function createUser(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const form =
        new FormData(
          event.currentTarget,
        );

      const response =
        await fetch(
          "/api/admin/users",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                name:
                  form.get(
                    "name",
                  ),

                email:
                  form.get(
                    "email",
                  ),

                phone:
                  form.get(
                    "phone",
                  ),

                password:
                  form.get(
                    "password",
                  ),

                role:
                  form.get(
                    "role",
                  ),
              }),
          },
        );

      const result =
        await readResponse(
          response,
        );

      if (
        !response.ok
      ) {
        setError(
          String(
            result.error ??
              "Unable to create user.",
          ),
        );

        return;
      }

      const user =
        result.user as
          AdminUser;

      setUsers(
        (
          current,
        ) => [
          ...current,
          user,
        ],
      );

      setCreating(
        false,
      );

      setMessage(
        String(
          result.message ??
            "User created.",
        ),
      );

      router.refresh();
    } catch {
      setError(
        "Unable to create user.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      busy ||
      !editing
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const form =
        new FormData(
          event.currentTarget,
        );

      const password =
        String(
          form.get(
            "password",
          ) ??
            "",
        ).trim();

      const response =
        await fetch(
          `/api/admin/users/${editing.id}`,
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                name:
                  form.get(
                    "name",
                  ),

                phone:
                  form.get(
                    "phone",
                  ),

                role:
                  form.get(
                    "role",
                  ),

                status:
                  form.get(
                    "status",
                  ),

                ...(password
                  ? {
                      password,
                    }
                  : {}),
              }),
          },
        );

      const result =
        await readResponse(
          response,
        );

      if (
        !response.ok
      ) {
        setError(
          String(
            result.error ??
              "Unable to update user.",
          ),
        );

        return;
      }

      const updated =
        result.user as
          AdminUser;

      setUsers(
        (
          current,
        ) =>
          current.map(
            (
              user,
            ) =>
              user.id ===
              updated.id
                ? updated
                : user,
          ),
      );

      setEditing(
        null,
      );

      setMessage(
        String(
          result.message ??
            "User updated.",
        ),
      );

      router.refresh();
    } catch {
      setError(
        "Unable to update user.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function revokeSessions(
    user:
      AdminUser,
  ) {
    if (
      busy ||
      !canManage(
        user,
      )
    ) {
      return;
    }

    if (
      !window.confirm(
        `Sign ${user.name} out from all devices?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/users/${user.id}/revoke-sessions`,
          {
            method:
              "POST",
          },
        );

      const result =
        await readResponse(
          response,
        );

      if (
        !response.ok
      ) {
        setError(
          String(
            result.error ??
              "Unable to revoke sessions.",
          ),
        );

        return;
      }

      setUsers(
        (
          current,
        ) =>
          current.map(
            (
              item,
            ) =>
              item.id ===
              user.id
                ? {
                    ...item,
                    sessionCount:
                      0,
                  }
                : item,
          ),
      );

      setMessage(
        String(
          result.message ??
            "Sessions revoked.",
        ),
      );
    } catch {
      setError(
        "Unable to revoke sessions.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        style={{
          display:
            "flex",

          alignItems:
            "flex-start",

          justifyContent:
            "space-between",

          gap:
            16,

          flexWrap:
            "wrap",

          marginBottom:
            20,
        }}
      >
        <div>
          <span className="eyebrow">
            Access Control
          </span>

          <h1
            style={{
              margin:
                "7px 0 5px",

              fontSize:
                "clamp(1.6rem, 3vw, 2.35rem)",
            }}
          >
            Admin Users
          </h1>

          <p
            className="muted"
            style={{
              margin:
                0,
            }}
          >
            Create staff accounts,
            assign roles and control
            admin access.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setCreating(
              true,
            );

            setEditing(
              null,
            );

            setError("");
          }}
        >
          <Plus
            size={16}
          />

          Add User
        </button>
      </div>

      {message ? (
        <div
          className="card"
          style={{
            padding:
              12,

            marginBottom:
              14,

            borderColor:
              "#b7dfc6",

            background:
              "#f2fbf5",

            color:
              "#1d6b3b",
          }}
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          className="card"
          style={{
            padding:
              12,

            marginBottom:
              14,

            borderColor:
              "#efc2c2",

            background:
              "#fff5f5",

            color:
              "#a52b2b",
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        className="card"
        style={{
          overflow:
            "hidden",
        }}
      >
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
                  User
                </th>

                <th>
                  Role
                </th>

                <th>
                  Status
                </th>

                <th>
                  Sessions
                </th>

                <th>
                  Created
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map(
                (
                  user,
                ) => {
                  const manageable =
                    canManage(
                      user,
                    );

                  return (
                    <tr
                      key={
                        user.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            user.name
                          }
                        </strong>

                        <small
                          className="muted"
                          style={{
                            display:
                              "block",
                          }}
                        >
                          {
                            user.email
                          }
                        </small>

                        {user.phone ? (
                          <small
                            className="muted"
                            style={{
                              display:
                                "block",
                            }}
                          >
                            {
                              user.phone
                            }
                          </small>
                        ) : null}
                      </td>

                      <td>
                        <RoleBadge
                          role={
                            user.role
                          }
                        />
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            user.status
                          }
                        />
                      </td>

                      <td>
                        {
                          user.sessionCount
                        }
                      </td>

                      <td>
                        {new Date(
                          user.createdAt,
                        ).toLocaleDateString()}
                      </td>

                      <td>
                        <div
                          style={{
                            display:
                              "flex",

                            gap:
                              6,

                            flexWrap:
                              "wrap",
                          }}
                        >
                          {manageable ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{
                                  minHeight:
                                    34,

                                  padding:
                                    "6px 10px",
                                }}
                                onClick={() => {
                                  setEditing(
                                    user,
                                  );

                                  setCreating(
                                    false,
                                  );

                                  setError(
                                    "",
                                  );
                                }}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{
                                  minHeight:
                                    34,

                                  padding:
                                    "6px 10px",
                                }}
                                disabled={
                                  busy ||
                                  user.sessionCount ===
                                    0
                                }
                                onClick={() =>
                                  revokeSessions(
                                    user,
                                  )
                                }
                              >
                                <RefreshCw
                                  size={14}
                                />

                                Sign Out
                              </button>
                            </>
                          ) : (
                            <small className="muted">
                              {user.id ===
                              currentUser.id
                                ? "Current account"
                                : "Protected"}
                            </small>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </section>

      {creating ? (
        <UserDrawer
          title="Create Admin User"
          close={() =>
            setCreating(
              false,
            )
          }
        >
          <form
            onSubmit={
              createUser
            }
            style={{
              display:
                "grid",

              gap:
                14,
            }}
          >
            <TextField
              name="name"
              label="Full Name"
              required
            />

            <TextField
              name="email"
              label="Email Address"
              type="email"
              required
            />

            <TextField
              name="phone"
              label="Phone Number"
              placeholder="01XXXXXXXXX"
            />

            <SelectField
              name="role"
              label="Role"
              options={
                assignableRoles
              }
            />

            <TextField
              name="password"
              label="Temporary Password"
              type="password"
              minLength={8}
              required
            />

            <button
              className="btn btn-primary"
              disabled={
                busy
              }
            >
              <UserRoundCheck
                size={16}
              />

              {busy
                ? "Creating…"
                : "Create User"}
            </button>
          </form>
        </UserDrawer>
      ) : null}

      {editing ? (
        <UserDrawer
          title={`Manage ${editing.name}`}
          close={() =>
            setEditing(
              null,
            )
          }
        >
          <form
            onSubmit={
              updateUser
            }
            style={{
              display:
                "grid",

              gap:
                14,
            }}
          >
            <TextField
              name="name"
              label="Full Name"
              defaultValue={
                editing.name
              }
              required
            />

            <div>
              <label className="label">
                Email Address
              </label>

              <div
                className="field"
                style={{
                  background:
                    "#f5f6f4",

                  color:
                    "#717671",
                }}
              >
                {
                  editing.email
                }
              </div>
            </div>

            <TextField
              name="phone"
              label="Phone Number"
              defaultValue={
                editing.phone ??
                ""
              }
              placeholder="01XXXXXXXXX"
            />

            <SelectField
              name="role"
              label="Role"
              defaultValue={
                editing.role
              }
              options={
                assignableRoles
              }
            />

            <SelectField
              name="status"
              label="Account Status"
              defaultValue={
                editing.status ===
                "BLOCKED"
                  ? "BLOCKED"
                  : "ACTIVE"
              }
              options={[
                "ACTIVE",
                "BLOCKED",
              ]}
            />

            <TextField
              name="password"
              label="New Password"
              type="password"
              minLength={8}
              placeholder="Leave blank to keep current password"
            />

            <div
              className="card"
              style={{
                padding:
                  12,

                background:
                  "#fff9f5",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  gap:
                    8,

                  alignItems:
                    "center",
                }}
              >
                <KeyRound
                  size={16}
                />

                <strong>
                  Security
                </strong>
              </div>

              <small
                className="muted"
                style={{
                  display:
                    "block",

                  marginTop:
                    5,
                }}
              >
                Changing the role,
                password or account
                status will sign this
                user out from all
                devices.
              </small>
            </div>

            <button
              className="btn btn-primary"
              disabled={
                busy
              }
            >
              <ShieldCheck
                size={16}
              />

              {busy
                ? "Saving…"
                : "Save Changes"}
            </button>
          </form>
        </UserDrawer>
      ) : null}
    </>
  );
}

function UserDrawer({
  title,
  close,
  children,
}: {
  title:
    string;

  close:
    () => void;

  children:
    React.ReactNode;
}) {
  return (
    <div
      style={{
        position:
          "fixed",

        inset:
          0,

        zIndex:
          1500,

        background:
          "rgb(0 0 0 / 46%)",
      }}
      onMouseDown={
        close
      }
    >
      <aside
        style={{
          position:
            "absolute",

          inset:
            "0 0 0 auto",

          width:
            "min(480px, 100%)",

          padding:
            24,

          overflowY:
            "auto",

          background:
            "#fff",
        }}
        onMouseDown={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            gap:
              12,

            marginBottom:
              24,
          }}
        >
          <div>
            <span className="eyebrow">
              Access Control
            </span>

            <h2
              style={{
                margin:
                  "6px 0 0",
              }}
            >
              {title}
            </h2>
          </div>

          <button
            type="button"
            aria-label="Close"
            className="btn btn-outline"
            style={{
              width:
                38,

              minHeight:
                38,

              padding:
                0,
            }}
            onClick={
              close
            }
          >
            <X
              size={17}
            />
          </button>
        </div>

        {children}
      </aside>
    </div>
  );
}

function TextField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label:
    string;
}) {
  return (
    <label>
      <span className="label">
        {label}
      </span>

      <input
        {...props}
        className="field"
      />
    </label>
  );
}

function SelectField({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label:
    string;

  options:
    readonly string[];
}) {
  return (
    <label>
      <span className="label">
        {label}
      </span>

      <select
        {...props}
        className="field"
      >
        {options.map(
          (
            option,
          ) => (
            <option
              key={
                option
              }
              value={
                option
              }
            >
              {formatRole(
                option,
              )}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

function RoleBadge({
  role,
}: {
  role:
    AdminRole;
}) {
  return (
    <span
      className="badge orange"
    >
      <ShieldCheck
        size={12}
      />

      {formatRole(
        role,
      )}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status:
    AdminStatus;
}) {
  if (
    status ===
    "ACTIVE"
  ) {
    return (
      <span className="badge green">
        <UserRoundCheck
          size={12}
        />

        Active
      </span>
    );
  }

  return (
    <span className="badge red">
      <UserRoundX
        size={12}
      />

      {status ===
      "BLOCKED"
        ? "Blocked"
        : "Pending"}
    </span>
  );
}

function formatRole(
  role:
    string,
) {
  return role
    .toLowerCase()
    .split("_")
    .map(
      (
        part,
      ) =>
        part.charAt(
          0,
        ).toUpperCase() +
        part.slice(
          1,
        ),
    )
    .join(" ");
}