"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { GripVertical, Plus, Search, X } from "lucide-react";
import { formatBDT } from "@/lib/money";

type Row = Record<string, unknown>;
const meta: Record<string, { title: string; desc: string; action: string }> = {
  products: {
    title: "Products",
    desc: "Live catalog, variants, prices and availability.",
    action: "Add Product",
  },
  categories: {
    title: "Categories",
    desc: "Dynamic hierarchy for navigation and discovery.",
    action: "Add Category",
  },
  orders: {
    title: "Orders",
    desc: "Update fulfillment while preserving complete history.",
    action: "Export",
  },
  customers: {
    title: "Customers",
    desc: "Customer profiles, spending, activity and access.",
    action: "Export",
  },
  coupons: {
    title: "Offers & Coupons",
    desc: "Server-validated codes and automatic promotions.",
    action: "Create Coupon",
  },
  inventory: {
    title: "Inventory Management",
    desc: "Variant stock with an immutable transaction trail.",
    action: "Adjust Stock",
  },
  "homepage-builder": {
    title: "Homepage Builder",
    desc: "Reorder, enable and edit database-backed sections.",
    action: "Preview",
  },
  reports: {
    title: "Reports",
    desc: "Live commercial indicators from Neon.",
    action: "Refresh",
  },
  settings: {
    title: "Store Settings",
    desc: "Shipping, payments, contact and global controls.",
    action: "Save Settings",
  },
  integrations: {
    title: "Integrations",
    desc: "Configure provider-independent SMS, bKash and courier services.",
    action: "Add Integration",
  },
  activity: {
    title: "Activity Logs",
    desc: "Trace administrative and system mutations.",
    action: "Export",
  },
};

export function AdminModule({
  module,
  data,
}: {
  module: string;
  data: unknown;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const m = meta[module] ?? meta.products;
  const payload = useMemo(
    () =>
      data && !Array.isArray(data) ? (data as Record<string, unknown>) : {},
    [data],
  );
  const rows = useMemo(() => {
    if (Array.isArray(data)) return data as Row[];
    return Array.isArray(payload.rows) ? (payload.rows as Row[]) : [];
  }, [data, payload]);
  const [query, setQuery] = useState(searchParams.get("search") ?? "");
  const [drawer, setDrawer] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
      ),
    [rows, query],
  );
  async function save(resource: string, method: string, body: unknown) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/${resource}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error ?? "Request failed");
      return false;
    }
    setMessage(result.message ?? "Saved successfully");
    setDrawer(false);
    router.refresh();
    return true;
  }
  if (module === "settings")
    return (
      <Settings
        data={data as Record<string, unknown>}
        save={save}
        busy={busy}
        message={message}
      />
    );
  if (module === "homepage-builder")
    return <Homepage rows={rows} save={save} busy={busy} message={message} />;
  if (module === "reports")
    return <Reports data={data as Record<string, number>} />;
  return (
    <>
      <Header
        title={m.title}
        desc={m.desc}
        action={m.action}
        onAction={() =>
          module === "orders" || module === "customers" || module === "activity"
            ? window.print()
            : (setSelected(null), setDrawer(true))
        }
      />
      <div className="card" style={{ padding: 14, marginTop: 20 }}>
        <label
          style={{ position: "relative", display: "block", marginBottom: 12 }}
        >
          <Search
            size={15}
            style={{ position: "absolute", left: 10, top: 12 }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="field"
            style={{ minHeight: 38, paddingLeft: 34 }}
            placeholder={`Search ${m.title.toLowerCase()}…`}
          />
        </label>
        <div style={{ overflowX: "auto" }}>
          <ModuleTable
            module={module}
            rows={filtered}
            save={save}
            edit={(row) => {
              setSelected(row);
              setDrawer(true);
            }}
          />
        </div>
      </div>
      {module === "inventory" && Array.isArray(payload.history) && (
        <InventoryHistory rows={payload.history as Row[]} />
      )}
      {message && <Toast message={message} />}
      {drawer && (
        <ResourceDrawer
          module={module}
          close={() => setDrawer(false)}
          save={save}
          busy={busy}
          row={selected}
          rows={rows}
          categories={
            Array.isArray(payload.categories)
              ? (payload.categories as Row[])
              : module === "categories"
                ? rows
                : []
          }
        />
      )}
    </>
  );
}

function Header({
  title,
  desc,
  action,
  onAction,
}: {
  title: string;
  desc: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "start",
        gap: 20,
      }}
    >
      <div>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <p className="muted">{desc}</p>
      </div>
      <button onClick={onAction} className="btn btn-primary">
        <Plus size={15} />
        {action}
      </button>
    </div>
  );
}
function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 80,
        background: "#111",
        color: "white",
        padding: "13px 18px",
        boxShadow: "0 10px 30px #0004",
      }}
    >
      {message}
    </div>
  );
}

function ModuleTable({
  module,
  rows,
  save,
  edit,
}: {
  module: string;
  rows: Row[];
  save: (resource: string, method: string, body: unknown) => Promise<boolean>;
  edit: (row: Row) => void;
}) {
  if (module === "products")
    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Product</th>
            <th>Category</th>
            <th>SKU</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={String(p.id)}>
              <td>
                <Image src={String(p.image)} alt="" width={38} height={42} />
              </td>
              <td>
                <b>{String(p.name)}</b>
                <small className="muted" style={{ display: "block" }}>
                  {String(p.slug)} · ID {String(p.id)}
                </small>
              </td>
              <td>{String(p.category)}</td>
              <td>{String(p.sku)}</td>
              <td>{formatBDT(Number(p.price))}</td>
              <td>{String(p.stock)}</td>
              <td>
                <span
                  className={`badge ${p.status === "ACTIVE" ? "green" : "orange"}`}
                >
                  {String(p.status)}
                </span>
              </td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6 }}
                    onClick={() => edit(p)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6 }}
                    onClick={() =>
                      save("products", "POST", { duplicateId: p.id })
                    }
                  >
                    Duplicate
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6 }}
                    onClick={() =>
                      save("products", "PATCH", {
                        id: p.id,
                        status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                      })
                    }
                  >
                    {p.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6, color: "#b42318" }}
                    onClick={() =>
                      window.confirm(
                        "Delete this product? Historical products will be archived instead.",
                      ) && save("products", "DELETE", { id: p.id })
                    }
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  if (module === "categories")
    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Parent</th>
            <th>Products</th>
            <th>Navigation</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={String(c.id)}>
              <td>
                <b>{String(c.name)}</b>
                <small className="muted" style={{ display: "block" }}>
                  ID {String(c.id)}
                </small>
              </td>
              <td>{String(c.slug)}</td>
              <td>
                {c.parentId
                  ? String(
                      rows.find((x) => x.id === c.parentId)?.name ?? "Child",
                    )
                  : "Root"}
              </td>
              <td>{String(c.productCount)}</td>
              <td>{c.showInNavigation ? "Visible" : "Hidden"}</td>
              <td>
                <span className={`badge ${c.active ? "green" : "orange"}`}>
                  {c.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6 }}
                    onClick={() => edit(c)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6 }}
                    onClick={() =>
                      save("categories", "PATCH", {
                        id: c.id,
                        active: !c.active,
                      })
                    }
                  >
                    Toggle
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6, color: "#b42318" }}
                    onClick={() =>
                      window.confirm("Delete this category?") &&
                      save("categories", "DELETE", { id: c.id })
                    }
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  if (module === "orders")
    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Phone</th>
            <th>Items</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Update</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={String(o.id)}>
              <td>
                <Link
                  href={`/admin/orders/${String(o.id)}`}
                  style={{ color: "var(--orange)", fontWeight: 750 }}
                >
                  {String(o.number)}
                </Link>
              </td>
              <td>{String(o.customer)}</td>
              <td>{String(o.phone)}</td>
              <td>{String(o.items)}</td>
              <td>{formatBDT(Number(o.total))}</td>
              <td>
                {String(o.payment)} · {String(o.paymentStatus)}
              </td>
              <td>
                <span
                  className={`badge ${o.status === "DELIVERED" ? "green" : o.status === "CANCELLED" ? "red" : "blue"}`}
                >
                  {String(o.status)}
                </span>
              </td>
              <td>
                <select
                  className="field"
                  style={{ minHeight: 34, width: 150 }}
                  value={String(o.status)}
                  onChange={(e) =>
                    save("orders", "PATCH", {
                      id: o.id,
                      status: e.target.value,
                    })
                  }
                >
                  {[
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
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  if (module === "customers")
    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Contact</th>
            <th>Orders</th>
            <th>Total Spent</th>
            <th>Last Order</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={String(c.id)}>
              <td>
                <b>{String(c.name)}</b>
              </td>
              <td>
                {String(c.phone)}
                <br />
                <span className="muted">{String(c.email ?? "—")}</span>
              </td>
              <td>{String(c.orders)}</td>
              <td>{formatBDT(Number(c.totalSpent))}</td>
              <td>
                {c.lastOrder
                  ? new Date(String(c.lastOrder)).toLocaleDateString()
                  : "—"}
              </td>
              <td>
                <span
                  className={`badge ${c.status === "ACTIVE" ? "green" : "red"}`}
                >
                  {String(c.status)}
                </span>
              </td>
              <td>
                <button
                  className="btn btn-outline"
                  style={{ minHeight: 32, padding: 6 }}
                  onClick={() =>
                    save("customers", "PATCH", {
                      id: c.id,
                      status: c.status === "ACTIVE" ? "BLOCKED" : "ACTIVE",
                    })
                  }
                >
                  {c.status === "ACTIVE" ? "Block" : "Unblock"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  if (module === "coupons")
    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Title / Code</th>
            <th>Type</th>
            <th>Value</th>
            <th>Usage</th>
            <th>Validity</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={String(c.id)}>
              <td>
                <b>{String(c.title)}</b>
                <br />
                <span className="muted">{String(c.code ?? "Automatic")}</span>
              </td>
              <td>{String(c.type)}</td>
              <td>
                {c.type === "PERCENTAGE"
                  ? `${c.value}%`
                  : formatBDT(Number(c.value))}
              </td>
              <td>
                {String(c.usage)} / {String(c.usageLimit ?? "∞")}
              </td>
              <td>
                {new Date(String(c.validFrom)).toLocaleDateString()} –{" "}
                {c.validUntil
                  ? new Date(String(c.validUntil)).toLocaleDateString()
                  : "No expiry"}
              </td>
              <td>
                <span className={`badge ${c.active ? "green" : "orange"}`}>
                  {c.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6 }}
                    onClick={() => edit(c)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6 }}
                    onClick={() =>
                      save("coupons", "PATCH", {
                        id: c.id,
                        active: !c.active,
                      })
                    }
                  >
                    Toggle
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6, color: "#b42318" }}
                    onClick={() =>
                      window.confirm("Delete this coupon?") &&
                      save("coupons", "DELETE", { id: c.id })
                    }
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  if (module === "inventory")
    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Variant</th>
            <th>Stock</th>
            <th>Threshold</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={String(v.id)}>
              <td>
                <b>{String(v.product)}</b>
              </td>
              <td>{String(v.sku)}</td>
              <td>
                {String(v.color ?? "—")} / {String(v.size ?? "—")}
              </td>
              <td>{String(v.stock)}</td>
              <td>{String(v.lowStockThreshold)}</td>
              <td>
                <span
                  className={`badge ${Number(v.stock) === 0 ? "red" : Number(v.stock) <= Number(v.lowStockThreshold) ? "orange" : "green"}`}
                >
                  {Number(v.stock) === 0
                    ? "Out of Stock"
                    : Number(v.stock) <= Number(v.lowStockThreshold)
                      ? "Low Stock"
                      : "In Stock"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  if (module === "integrations")
    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Provider</th>
            <th>Mode</th>
            <th>Status</th>
            <th>Updated</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={String(x.id)}>
              <td>
                <b>{String(x.service)}</b>
              </td>
              <td>{String(x.provider)}</td>
              <td>{String(x.mode)}</td>
              <td>
                <span className={`badge ${x.enabled ? "green" : "orange"}`}>
                  {x.enabled ? "Enabled" : "Disabled"}
                </span>
              </td>
              <td>{new Date(String(x.updatedAt)).toLocaleString()}</td>
              <td>
                <button
                  className="btn btn-outline"
                  style={{ minHeight: 32, padding: 6 }}
                  onClick={() =>
                    save("integrations", "PATCH", {
                      id: x.id,
                      enabled: !x.enabled,
                    })
                  }
                >
                  Toggle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Actor</th>
          <th>Action</th>
          <th>Entity</th>
          <th>Details</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((x) => (
          <tr key={String(x.id)}>
            <td>{String(x.actor)}</td>
            <td>
              <b>{String(x.action)}</b>
            </td>
            <td>
              {String(x.entityType)}{" "}
              {x.entityId ? `#${String(x.entityId).slice(-6)}` : ""}
            </td>
            <td className="muted">
              {x.metadata ? JSON.stringify(x.metadata).slice(0, 80) : "—"}
            </td>
            <td>{new Date(String(x.createdAt)).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResourceDrawer({
  module,
  close,
  save,
  busy,
  row,
  rows,
  categories,
}: {
  module: string;
  close: () => void;
  save: (resource: string, method: string, body: unknown) => Promise<boolean>;
  busy: boolean;
  row: Row | null;
  rows: Row[];
  categories: Row[];
}) {
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(form);
    if (module === "products") {
      values.featured = form.has("featured") ? "true" : "false";
      values.newArrival = form.has("newArrival") ? "true" : "false";
      values.trending = form.has("trending") ? "true" : "false";
    }
    if (module === "categories") {
      values.showInNavigation = form.has("showInNavigation") ? "true" : "false";
      values.showOnHomepage = form.has("showOnHomepage") ? "true" : "false";
    }
    await save(
      module === "homepage-builder" ? "homepage" : module,
      row ? "PATCH" : "POST",
      row ? { ...values, id: row.id } : values,
    );
  }
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 50 }}
      onClick={close}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "min(460px,100%)",
          background: "white",
          padding: 24,
          overflow: "auto",
        }}
      >
        <button
          onClick={close}
          aria-label="Close"
          style={{ float: "right", border: 0, background: "none" }}
        >
          <X />
        </button>
        <h2>
          {row ? `Edit ${module.replaceAll("-", " ")}` : meta[module]?.action}
        </h2>
        <form onSubmit={submit} style={{ display: "grid", gap: 13 }}>
          {module === "products" && (
            <>
              <Field
                name="name"
                label="Product Name"
                value={String(row?.name ?? "")}
                required
              />
              <Field
                name="slug"
                label="Slug"
                value={String(row?.slug ?? "")}
                required
              />
              <Field
                name="shortDescription"
                label="Short Description"
                value={String(row?.shortDescription ?? "")}
              />
              <label>
                <span className="label">Description</span>
                <textarea
                  name="description"
                  className="field"
                  rows={5}
                  defaultValue={String(row?.description ?? "")}
                />
              </label>
              <Field
                name="regularPrice"
                label="Regular Price"
                type="number"
                value={String(row?.regularPrice ?? "")}
                required
              />
              <Field
                name="salePrice"
                label="Sale Price (optional)"
                type="number"
                value={String(row?.salePrice ?? "")}
              />
              <label>
                <span className="label">Primary Category</span>
                <select
                  name="categoryId"
                  className="field"
                  defaultValue={String(row?.categoryId ?? "")}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.name)}
                    </option>
                  ))}
                </select>
              </label>
              {!row && (
                <>
                  <Field name="sku" label="Initial Variant SKU" required />
                  <Field
                    name="stock"
                    label="Initial Stock"
                    type="number"
                    required
                  />
                  <Field name="size" label="Size" />
                  <Field name="color" label="Color" />
                  <Field
                    name="image"
                    label="Image URL"
                    value="/images/products/tshirt.svg"
                  />
                </>
              )}
              {row && (
                <details className="card" style={{ padding: 12 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 750 }}>
                    Add image or variant
                  </summary>
                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    <Field name="newImage" label="Additional Image URL" />
                    <Field name="variantSku" label="New Variant SKU" />
                    <Field
                      name="variantStock"
                      label="Opening Stock"
                      type="number"
                    />
                    <Field name="variantSize" label="Variant Size" />
                    <Field name="variantColor" label="Variant Color" />
                  </div>
                </details>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {["featured", "newArrival", "trending"].map((flag) => (
                  <label key={flag}>
                    <input
                      name={flag}
                      type="checkbox"
                      value="true"
                      defaultChecked={row?.[flag] === true}
                    />{" "}
                    {flag.replace(/([A-Z])/g, " $1")}
                  </label>
                ))}
              </div>
              <label>
                <span className="label">Status</span>
                <select
                  name="status"
                  className="field"
                  defaultValue={String(row?.status ?? "ACTIVE")}
                >
                  <option>ACTIVE</option>
                  <option>DRAFT</option>
                  <option>INACTIVE</option>
                  <option>ARCHIVED</option>
                </select>
              </label>
            </>
          )}
          {module === "categories" && (
            <>
              <Field
                name="name"
                label="Category Name"
                value={String(row?.name ?? "")}
                required
              />
              <Field
                name="slug"
                label="Slug"
                value={String(row?.slug ?? "")}
                required
              />
              <Field
                name="description"
                label="Description"
                value={String(row?.description ?? "")}
              />
              <label>
                <span className="label">Parent Category</span>
                <select
                  name="parentId"
                  className="field"
                  defaultValue={String(row?.parentId ?? "")}
                >
                  <option value="">Root category</option>
                  {categories
                    .filter((c) => c.id !== row?.id)
                    .map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {String(c.name)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <input
                  name="showInNavigation"
                  type="checkbox"
                  value="true"
                  defaultChecked={row?.showInNavigation === true}
                />{" "}
                Show in navigation
              </label>
              <label>
                <input
                  name="showOnHomepage"
                  type="checkbox"
                  value="true"
                  defaultChecked={row?.showOnHomepage === true}
                />{" "}
                Show on homepage
              </label>
            </>
          )}
          {module === "coupons" && (
            <>
              <Field
                name="title"
                label="Title"
                value={String(row?.title ?? "")}
                required
              />
              <label>
                <span className="label">Offer Kind</span>
                <select
                  name="kind"
                  className="field"
                  defaultValue={String(row?.kind ?? "CODE")}
                >
                  <option value="CODE">Discount Code</option>
                  <option value="AUTOMATIC">Automatic Offer</option>
                </select>
              </label>
              <Field name="code" label="Code" value={String(row?.code ?? "")} />
              <label>
                <span className="label">Discount Type</span>
                <select
                  name="type"
                  className="field"
                  defaultValue={String(row?.type ?? "PERCENTAGE")}
                >
                  <option>PERCENTAGE</option>
                  <option>FIXED</option>
                  <option>FREE_SHIPPING</option>
                </select>
              </label>
              <Field
                name="value"
                label="Value"
                type="number"
                value={String(row?.value ?? "")}
                required
              />
              <Field
                name="minimumOrder"
                label="Minimum Order"
                type="number"
                value={String(row?.minimumOrder ?? "")}
              />
              <Field
                name="maximumDiscount"
                label="Maximum Discount"
                type="number"
                value={String(row?.maximumDiscount ?? "")}
              />
              <Field
                name="usageLimit"
                label="Total Usage Limit"
                type="number"
                value={String(row?.usageLimit ?? "")}
              />
              <Field
                name="perCustomerLimit"
                label="Per-Customer Limit"
                type="number"
                value={String(row?.perCustomerLimit ?? "")}
              />
              <Field
                name="validUntil"
                label="Valid Until"
                type="date"
                value={
                  row?.validUntil ? String(row.validUntil).slice(0, 10) : ""
                }
              />
              <Field
                name="productIds"
                label="Limit to Product IDs (comma separated)"
                value={String(row?.productIds ?? "")}
              />
              <Field
                name="categoryIds"
                label="Limit to Category IDs (comma separated)"
                value={String(row?.categoryIds ?? "")}
              />
            </>
          )}
          {module === "inventory" && (
            <>
              <label>
                <span className="label">Product Variant</span>
                <select name="variantId" className="field" required>
                  <option value="">Select a variant</option>
                  {rows.map((v) => (
                    <option key={String(v.id)} value={String(v.id)}>
                      {String(v.sku)} — {String(v.product)} ({String(v.stock)}{" "}
                      in stock)
                    </option>
                  ))}
                </select>
              </label>
              <Field
                name="quantityChange"
                label="Quantity Change (+/-)"
                type="number"
                required
              />
              <Field name="reason" label="Reason" required />
            </>
          )}
          {module === "integrations" && (
            <>
              <label>
                <span className="label">Service</span>
                <select name="service" className="field">
                  <option>SMS</option>
                  <option>BKASH</option>
                  <option>COURIER</option>
                </select>
              </label>
              <Field name="provider" label="Provider" required />
              <label>
                <span className="label">Mode</span>
                <select name="mode" className="field">
                  <option>mock</option>
                  <option>sandbox</option>
                  <option>production</option>
                </select>
              </label>
            </>
          )}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      </aside>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  value,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  value?: string;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={value}
        className="field"
      />
    </label>
  );
}

function Settings({
  data,
  save,
  busy,
  message,
}: {
  data: Record<string, unknown>;
  save: (resource: string, method: string, body: unknown) => Promise<boolean>;
  busy: boolean;
  message: string;
}) {
  const shipping = (data.shipping ?? {}) as Record<string, unknown>;
  const payments = (data.payments ?? {}) as Record<string, unknown>;
  const general = (data.general ?? {}) as Record<string, unknown>;
  const contact = (data.contact ?? {}) as Record<string, unknown>;
  const social = (data.social ?? {}) as Record<string, unknown>;
  const other = (data.other ?? {}) as Record<string, unknown>;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await save("settings", "PUT", {
      shipping: {
        insideDhaka: Number(f.get("insideDhaka")),
        outsideDhaka: Number(f.get("outsideDhaka")),
        insideEstimate: f.get("insideEstimate"),
        outsideEstimate: f.get("outsideEstimate"),
      },
      payments: {
        codEnabled: f.get("codEnabled") === "on",
        bkashEnabled: f.get("bkashEnabled") === "on",
      },
      general: {
        ...general,
        storeName: f.get("storeName"),
        storeLive: f.get("storeLive") === "on",
        maintenanceMode: f.get("maintenanceMode") === "on",
        currency: "BDT",
        timezone: "Asia/Dhaka",
      },
      contact: {
        phone: f.get("contactPhone"),
        email: f.get("contactEmail"),
        address: f.get("contactAddress"),
        supportHours: f.get("supportHours"),
      },
      social: {
        facebook: f.get("facebook"),
        instagram: f.get("instagram"),
        youtube: f.get("youtube"),
        tiktok: f.get("tiktok"),
      },
      other: {
        itemsPerPage: Number(f.get("itemsPerPage")),
        cancellationHours: Number(f.get("cancellationHours")),
      },
    });
  }
  return (
    <>
      <Header
        title="Store Settings"
        desc="Changes here immediately affect checkout and storefront behavior."
        action="Save Settings"
        onAction={() => document.getElementById("settings-submit")?.click()}
      />
      <form
        onSubmit={submit}
        className="card"
        style={{ padding: 22, marginTop: 20 }}
      >
        <h3>General</h3>
        <Field
          name="storeName"
          label="Store Name"
          value={String(general.storeName ?? "Game On Garb")}
        />
        <label style={{ display: "block", margin: "12px 0" }}>
          <input
            name="storeLive"
            type="checkbox"
            defaultChecked={general.storeLive !== false}
          />{" "}
          Store is live
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          <input
            name="maintenanceMode"
            type="checkbox"
            defaultChecked={general.maintenanceMode === true}
          />{" "}
          Maintenance mode
        </label>
        <h3>Shipping & Delivery</h3>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Field
            name="insideDhaka"
            label="Inside Dhaka Charge"
            type="number"
            value={String(shipping.insideDhaka ?? 80)}
          />
          <Field
            name="outsideDhaka"
            label="Outside Dhaka Charge"
            type="number"
            value={String(shipping.outsideDhaka ?? 150)}
          />
          <Field
            name="insideEstimate"
            label="Inside Dhaka Estimate"
            value={String(shipping.insideEstimate ?? "1–2 working days")}
          />
          <Field
            name="outsideEstimate"
            label="Outside Dhaka Estimate"
            value={String(shipping.outsideEstimate ?? "3–5 working days")}
          />
        </div>
        <h3>Payment Methods</h3>
        <label
          className="card"
          style={{ display: "inline-block", padding: 14, marginRight: 10 }}
        >
          <input
            name="codEnabled"
            type="checkbox"
            defaultChecked={payments.codEnabled !== false}
          />{" "}
          Cash on Delivery
        </label>
        <h3>Contact Information</h3>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Field
            name="contactPhone"
            label="Support Phone"
            value={String(contact.phone ?? "")}
          />
          <Field
            name="contactEmail"
            label="Support Email"
            type="email"
            value={String(contact.email ?? "")}
          />
          <Field
            name="contactAddress"
            label="Store Address"
            value={String(contact.address ?? "")}
          />
          <Field
            name="supportHours"
            label="Support Hours"
            value={String(contact.supportHours ?? "")}
          />
        </div>
        <h3>Social Links</h3>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Field
            name="facebook"
            label="Facebook URL"
            type="url"
            value={String(social.facebook ?? "")}
          />
          <Field
            name="instagram"
            label="Instagram URL"
            type="url"
            value={String(social.instagram ?? "")}
          />
          <Field
            name="youtube"
            label="YouTube URL"
            type="url"
            value={String(social.youtube ?? "")}
          />
          <Field
            name="tiktok"
            label="TikTok URL"
            type="url"
            value={String(social.tiktok ?? "")}
          />
        </div>
        <h3>Other Settings</h3>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Field
            name="itemsPerPage"
            label="Items Per Page"
            type="number"
            value={String(other.itemsPerPage ?? general.itemsPerPage ?? 12)}
          />
          <Field
            name="cancellationHours"
            label="Cancellation Window (hours)"
            type="number"
            value={String(other.cancellationHours ?? 2)}
          />
        </div>
        <label
          className="card"
          style={{ display: "inline-block", padding: 14 }}
        >
          <input
            name="bkashEnabled"
            type="checkbox"
            defaultChecked={payments.bkashEnabled !== false}
          />{" "}
          bKash
        </label>
        <button
          id="settings-submit"
          className="btn btn-primary"
          style={{ display: "block", marginTop: 20 }}
          disabled={busy}
        >
          {busy ? "Saving…" : "Save Settings"}
        </button>
        {message && <p>{message}</p>}
      </form>
    </>
  );
}

function Homepage({
  rows,
  save,
  busy,
  message,
}: {
  rows: Row[];
  save: (resource: string, method: string, body: unknown) => Promise<boolean>;
  busy: boolean;
  message: string;
}) {
  const [sections, setSections] = useState(rows);
  const [editing, setEditing] = useState<Row | null>(null);
  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
    save("homepage", "PUT", {
      order: next.map((s, i) => ({ id: s.id, sortOrder: i })),
    });
  }
  return (
    <>
      <Header
        title="Homepage Builder"
        desc="Database-driven section visibility, copy and order."
        action="Preview"
        onAction={() => window.open("/", "_blank")}
      />
      <div className="card" style={{ padding: 12, marginTop: 20 }}>
        {sections.map((s, i) => (
          <div
            key={String(s.id)}
            style={{
              display: "grid",
              gridTemplateColumns: "30px 1fr auto auto auto auto",
              alignItems: "center",
              gap: 8,
              padding: 14,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <GripVertical color="#929793" />
            <div>
              <b>{String(s.name)}</b>
              <small className="muted" style={{ display: "block" }}>
                {String(s.type)} · Position {i + 1}
              </small>
            </div>
            <button
              className="btn btn-outline"
              style={{ minHeight: 32, padding: 6 }}
              onClick={() => setEditing(s)}
            >
              Edit
            </button>
            <button
              className="btn btn-outline"
              style={{ minHeight: 32, padding: 6 }}
              onClick={() =>
                save("homepage", "PATCH", { id: s.id, enabled: !s.enabled })
              }
            >
              {s.enabled ? "Hide" : "Show"}
            </button>
            <button
              className="btn btn-outline"
              style={{ minHeight: 32, padding: 6 }}
              onClick={() => move(i, -1)}
            >
              ↑
            </button>
            <button
              className="btn btn-outline"
              style={{ minHeight: 32, padding: 6 }}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
          </div>
        ))}
      </div>
      {editing && (
        <HomepageEditor
          section={editing}
          close={() => setEditing(null)}
          save={save}
          busy={busy}
        />
      )}
      {busy && <p>Saving…</p>}
      {message && <Toast message={message} />}
    </>
  );
}

function HomepageEditor({
  section,
  close,
  save,
  busy,
}: {
  section: Row;
  close: () => void;
  save: (resource: string, method: string, body: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const config =
    section.config &&
    typeof section.config === "object" &&
    !Array.isArray(section.config)
      ? (section.config as Record<string, unknown>)
      : {};
  const [heroSlides, setHeroSlides] = useState<Row[]>(
    Array.isArray(section.slides) ? (section.slides as Row[]) : [],
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await save("homepage", "PATCH", {
      id: section.id,
      ...Object.fromEntries(new FormData(e.currentTarget)),
    });
    close();
  }
  async function addSlide(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      await save("homepage", "POST", {
        sectionId: section.id,
        ...Object.fromEntries(new FormData(e.currentTarget)),
      })
    )
      e.currentTarget.reset();
  }
  async function updateSlide(e: FormEvent<HTMLFormElement>, slide: Row) {
    e.preventDefault();
    await save("homepage", "PATCH", {
      id: section.id,
      slideId: slide.id,
      ...Object.fromEntries(new FormData(e.currentTarget)),
    });
  }
  function moveSlide(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= heroSlides.length) return;
    const next = [...heroSlides];
    [next[index], next[target]] = [next[target], next[index]];
    setHeroSlides(next);
    save("homepage", "PUT", {
      slideOrder: next.map((slide, sortOrder) => ({ id: slide.id, sortOrder })),
    });
  }
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 70 }}
    >
      <aside
        style={{
          position: "absolute",
          inset: "0 0 0 auto",
          width: "min(520px, 100%)",
          background: "white",
          padding: 24,
          overflow: "auto",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          style={{ float: "right", border: 0, background: "none" }}
        >
          <X />
        </button>
        <h2>Edit {String(section.name)}</h2>
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <Field
            name="name"
            label="Internal Name"
            value={String(section.name)}
            required
          />
          <Field
            name="heading"
            label="Heading"
            value={String(section.heading ?? "")}
          />
          <Field
            name="subtitle"
            label="Subtitle"
            value={String(section.subtitle ?? "")}
          />
          <Field
            name="image"
            label="Image URL"
            value={String(section.image ?? "")}
          />
          <Field
            name="ctaLabel"
            label="CTA Label"
            value={String(section.ctaLabel ?? "")}
          />
          <Field
            name="ctaLink"
            label="CTA Destination"
            value={String(section.ctaLink ?? "")}
          />
          <Field
            name="productIds"
            label="Product IDs (comma separated, optional)"
            value={
              Array.isArray(config.productIds)
                ? config.productIds.join(", ")
                : ""
            }
          />
          <Field
            name="categoryIds"
            label="Category IDs (comma separated, optional)"
            value={
              Array.isArray(config.categoryIds)
                ? config.categoryIds.join(", ")
                : ""
            }
          />
          <button className="btn btn-primary" disabled={busy}>
            Save Section
          </button>
        </form>
        {section.type === "HERO" && (
          <>
            <h3 style={{ marginTop: 28 }}>Hero Slides</h3>
            {heroSlides.map((slide, index) => (
              <details
                className="card"
                style={{ padding: 12, marginBottom: 8 }}
                key={String(slide.id)}
              >
                <summary style={{ cursor: "pointer" }}>
                  <b>{String(slide.title)}</b>
                  <small className="muted" style={{ display: "block" }}>
                    {slide.enabled ? "Enabled" : "Hidden"} ·{" "}
                    {String(slide.ctaLabel ?? "No CTA")}
                  </small>
                </summary>
                <div style={{ display: "flex", gap: 6, margin: "10px 0" }}>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6 }}
                    onClick={() => moveSlide(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6 }}
                    onClick={() => moveSlide(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 32, padding: 6 }}
                    onClick={() =>
                      save("homepage", "PATCH", {
                        id: section.id,
                        slideId: slide.id,
                        enabled: !slide.enabled,
                      })
                    }
                  >
                    {slide.enabled ? "Hide" : "Show"}
                  </button>
                </div>
                <form
                  onSubmit={(event) => updateSlide(event, slide)}
                  style={{ display: "grid", gap: 8 }}
                >
                  <Field
                    name="title"
                    label="Title"
                    value={String(slide.title)}
                    required
                  />
                  <Field
                    name="subtitle"
                    label="Subtitle"
                    value={String(slide.subtitle ?? "")}
                  />
                  <Field
                    name="image"
                    label="Image URL"
                    value={String(slide.image)}
                    required
                  />
                  <Field
                    name="ctaLabel"
                    label="CTA Label"
                    value={String(slide.ctaLabel ?? "")}
                  />
                  <Field
                    name="ctaLink"
                    label="CTA Destination"
                    value={String(slide.ctaLink ?? "")}
                  />
                  <button className="btn btn-outline" disabled={busy}>
                    Save Slide
                  </button>
                </form>
              </details>
            ))}
            <form
              onSubmit={addSlide}
              style={{ display: "grid", gap: 10, marginTop: 16 }}
            >
              <h4 style={{ margin: 0 }}>Add Slide</h4>
              <Field name="title" label="Title" required />
              <Field name="subtitle" label="Subtitle" />
              <Field name="image" label="Background Image URL" required />
              <Field name="ctaLabel" label="CTA Label" />
              <Field name="ctaLink" label="CTA Destination" />
              <button className="btn btn-outline" disabled={busy}>
                Add Hero Slide
              </button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}

function Reports({ data }: { data: Record<string, number> }) {
  return (
    <>
      <Header
        title="Reports"
        desc="Live overview generated from current database records."
        action="Print"
        onAction={() => window.print()}
      />
      <div
        className="admin-kpis"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginTop: 20,
        }}
      >
        {[
          ["Orders", data.orders],
          ["Revenue", formatBDT(data.revenue)],
          ["Products", data.products],
          ["Customers", data.customers],
        ].map(([label, value]) => (
          <div className="card" style={{ padding: 22 }} key={String(label)}>
            <small className="muted">{String(label)}</small>
            <b style={{ display: "block", fontSize: 28, marginTop: 8 }}>
              {String(value)}
            </b>
          </div>
        ))}
      </div>
    </>
  );
}

function InventoryHistory({ rows }: { rows: Row[] }) {
  return (
    <section className="card" style={{ padding: 14, marginTop: 20 }}>
      <h2 style={{ margin: "4px 0 14px" }}>Inventory History</h2>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Product / SKU</th>
              <th>Movement</th>
              <th>Before → After</th>
              <th>Reason</th>
              <th>Actor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={String(x.id)}>
                <td>{new Date(String(x.createdAt)).toLocaleString()}</td>
                <td>
                  <b>{String(x.product)}</b>
                  <small className="muted" style={{ display: "block" }}>
                    {String(x.sku)} · {String(x.type)}
                  </small>
                </td>
                <td
                  style={{
                    color: Number(x.change) < 0 ? "#b42318" : "#16803b",
                  }}
                >
                  {Number(x.change) > 0 ? "+" : ""}
                  {String(x.change)}
                </td>
                <td>
                  {String(x.before)} → {String(x.after)}
                </td>
                <td>{String(x.reason)}</td>
                <td>{String(x.actor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
