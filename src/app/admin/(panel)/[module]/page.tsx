import { notFound } from "next/navigation";
import { AdminModule } from "@/components/admin/admin-module";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/business";
import { requireAdmin } from "@/lib/session";

const allowed = [
  "products",
  "categories",
  "orders",
  "customers",
  "coupons",
  "inventory",
  "homepage-builder",
  "reports",
  "settings",
  "integrations",
  "activity",
];
export const dynamic = "force-dynamic";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  if (!allowed.includes(module)) notFound();
  const user = await requireAdmin();
  const permission =
    module === "homepage-builder"
      ? "homepage"
      : module === "categories"
        ? "products"
        : module === "activity"
          ? "settings"
          : module;
  if (!hasPermission(user.role, permission)) notFound();
  return <AdminModule module={module} data={await loadModule(module)} />;
}

async function loadModule(module: string) {
  if (module === "products") {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: true,
          categories: { include: { category: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.category.findMany({
        where: { active: true },
        orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
        select: { id: true, name: true, parentId: true },
      }),
    ]);
    return {
      rows: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        shortDescription: p.shortDescription ?? "",
        description: p.description ?? "",
        categoryId: p.categories[0]?.categoryId ?? "",
        category: p.categories[0]?.category.name ?? "Uncategorized",
        sku: p.variants[0]?.sku ?? "—",
        price: Number(p.salePrice ?? p.regularPrice),
        regularPrice: Number(p.regularPrice),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        stock: p.variants.reduce((n, v) => n + v.stock, 0),
        status: p.status,
        image: p.images[0]?.url ?? "/images/products/tshirt.svg",
        featured: p.featured,
        newArrival: p.newArrival,
        trending: p.trending,
      })),
      categories,
    };
  }
  if (module === "categories")
    return db.category
      .findMany({
        orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
        include: { _count: { select: { products: true } } },
      })
      .then((rows) =>
        rows.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          productCount: c._count.products,
        })),
      );
  if (module === "orders")
    return db.order
      .findMany({
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
      })
      .then((rows) =>
        rows.map((o) => ({
          id: o.id,
          number: o.number,
          customer: o.customerName,
          phone: o.phone,
          items: o._count.items,
          total: Number(o.total),
          payment: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          status: o.status,
          date: o.createdAt.toISOString(),
        })),
      );
  if (module === "customers")
    return db.customer
      .findMany({
        include: {
          orders: { select: { total: true, createdAt: true } },
          _count: { select: { orders: true, addresses: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      .then((rows) =>
        rows.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          status: c.status,
          orders: c._count.orders,
          addresses: c._count.addresses,
          totalSpent: c.orders.reduce((n, o) => n + Number(o.total), 0),
          lastOrder:
            c.orders
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
              ?.createdAt.toISOString() ?? null,
        })),
      );
  if (module === "coupons")
    return db.coupon
      .findMany({
        include: {
          _count: { select: { usage: true } },
          products: { select: { productId: true } },
          categories: { select: { categoryId: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      .then((rows) =>
        rows.map((c) => ({
          id: c.id,
          title: c.title,
          code: c.code,
          kind: c.kind,
          type: c.type,
          value: Number(c.value),
          minimumOrder: c.minimumOrder ? Number(c.minimumOrder) : null,
          maximumDiscount: c.maximumDiscount ? Number(c.maximumDiscount) : null,
          usage: c._count.usage,
          usageLimit: c.usageLimit,
          perCustomerLimit: c.perCustomerLimit,
          validFrom: c.validFrom.toISOString(),
          validUntil: c.validUntil?.toISOString() ?? null,
          active: c.active,
          productIds: c.products.map((scope) => scope.productId).join(", "),
          categoryIds: c.categories.map((scope) => scope.categoryId).join(", "),
        })),
      );
  if (module === "inventory") {
    const [variants, history] = await Promise.all([
      db.productVariant.findMany({
        include: { product: true },
        orderBy: { sku: "asc" },
      }),
      db.inventoryTransaction.findMany({
        include: { variant: { include: { product: true } }, createdBy: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    return {
      rows: variants.map((v) => ({
        id: v.id,
        product: v.product.name,
        productId: v.productId,
        sku: v.sku,
        size: v.size,
        color: v.color,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        active: v.active,
      })),
      history: history.map((x) => ({
        id: x.id,
        sku: x.variant.sku,
        product: x.variant.product.name,
        change: x.quantityChange,
        before: x.beforeQuantity,
        after: x.afterQuantity,
        type: x.type,
        reason: x.reason,
        actor: x.createdBy?.name ?? "System",
        createdAt: x.createdAt.toISOString(),
      })),
    };
  }
  if (module === "homepage-builder")
    return db.homepageSection
      .findMany({
        include: { slides: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      })
      .then((rows) =>
        rows.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
      );
  if (module === "settings")
    return db.storeSetting
      .findMany()
      .then((rows) => Object.fromEntries(rows.map((x) => [x.key, x.value])));
  if (module === "integrations")
    return db.integration
      .findMany({ orderBy: { service: "asc" } })
      .then((rows) =>
        rows.map((x) => ({
          id: x.id,
          service: x.service,
          provider: x.provider,
          enabled: x.enabled,
          mode: x.mode,
          config: x.config,
          updatedAt: x.updatedAt.toISOString(),
        })),
      );
  if (module === "activity")
    return db.activityLog
      .findMany({
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
      .then((rows) =>
        rows.map((x) => ({
          id: x.id,
          actor: x.actor?.name ?? "System",
          action: x.action,
          entityType: x.entityType,
          entityId: x.entityId,
          metadata: x.metadata,
          createdAt: x.createdAt.toISOString(),
        })),
      );
  if (module === "reports") {
    const [orders, revenue, products, customers] = await Promise.all([
      db.order.count(),
      db.order.aggregate({ _sum: { total: true } }),
      db.product.count(),
      db.customer.count(),
    ]);
    return {
      orders,
      revenue: Number(revenue._sum.total ?? 0),
      products,
      customers,
    };
  }
  return [];
}
