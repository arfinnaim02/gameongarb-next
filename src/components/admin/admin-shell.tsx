"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Activity,
  Boxes,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  Gauge,
  Home,
  Images,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  TicketPercent,
  Users,
  Warehouse,
} from "lucide-react";

import { Logo } from "@/components/shared/logo";

type AdminShellProps = {
  children: React.ReactNode;

  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
};

type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    title: "Commerce",
    items: [
      {
        label: "Products",
        href: "/admin/products",
        icon: Package,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: Tags,
      },
      {
        label: "Orders",
        href: "/admin/orders",
        icon: ShoppingBag,
      },
      {
        label: "Customers",
        href: "/admin/customers",
        icon: Users,
      },
      {
        label: "Inventory",
        href: "/admin/inventory",
        icon: Warehouse,
      },
    ],
  },

  {
    title: "Appearance",
    items: [
      {
        label: "Homepage Builder",
        href: "/admin/homepage",
        icon: Home,
      },
      {
        label: "Hero Slides",
        href: "/admin/homepage/hero",
        icon: Images,
      },
    ],
  },

  {
    title: "Marketing",
    items: [
      {
        label: "Offers & Coupons",
        href: "/admin/coupons",
        icon: TicketPercent,
      },
    ],
  },

  {
    title: "System",
    items: [
      {
        label: "Activity Logs",
        href: "/admin/activity",
        icon: Activity,
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

export function AdminShell({
  children,
  user,
}: AdminShellProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  function isExactOrChildActive(
    href: string,
  ) {
    /*
     * Special handling:
     * We don't want Homepage Builder and Hero Slides
     * both looking equally active when we're specifically
     * inside /admin/homepage/hero.
     */
    if (
      href === "/admin/homepage"
    ) {
      return (
        pathname ===
        "/admin/homepage"
      );
    }

    return isActive(href);
  }

  const currentItem =
    navigationGroups
      .flatMap(
        (group) =>
          group.items,
      )
      .filter((item) =>
        isActive(item.href),
      )
      .sort(
        (a, b) =>
          b.href.length -
          a.href.length,
      )[0];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
        <div className="admin-sidebar-logo">
          <Logo admin />
        </div>

          <div className="admin-sidebar-brand-copy">
            <strong>
              Admin Panel
            </strong>

            <span>
              Game On Garb
            </span>
          </div>
        </div>

        <nav
          className="admin-nav"
          aria-label="Admin navigation"
        >
          {navigationGroups.map(
            (group) => (
              <div
                key={
                  group.title
                }
                className="admin-nav-group"
              >
                <div className="admin-nav-group-title">
                  {group.title}
                </div>

                <div className="admin-nav-group-links">
                  {group.items.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      const active =
                        isExactOrChildActive(
                          item.href,
                        );

                      return (
                        <Link
                          key={
                            item.href
                          }
                          href={
                            item.href
                          }
                          className={`admin-nav-link ${
                            active
                              ? "is-active"
                              : ""
                          }`}
                        >
                          <Icon
                            size={
                              17
                            }
                            strokeWidth={
                              1.8
                            }
                          />

                          <span>
                            {
                              item.label
                            }
                          </span>

                          {active ? (
                            <ChevronRight
                              size={
                                14
                              }
                              className="admin-nav-current-icon"
                            />
                          ) : null}
                        </Link>
                      );
                    },
                  )}
                </div>
              </div>
            ),
          )}
        </nav>

        <div className="admin-sidebar-footer">
          <Link
            href="/"
            target="_blank"
            className="admin-sidebar-store-link"
          >
            <ExternalLink
              size={16}
            />

            <span>
              View Store
            </span>
          </Link>

          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">
              <CircleUserRound
                size={19}
              />
            </div>

            <div className="admin-sidebar-user-copy">
              <strong>
                {user?.name ||
                  "Administrator"}
              </strong>

              <span>
                {user?.role ||
                  "ADMIN"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-header">
          <div className="admin-header-left">
            <div className="admin-header-page-icon">
              <Gauge
                size={17}
              />
            </div>

            <div>
              <span className="admin-header-eyebrow">
                Game On Garb
              </span>

              <strong className="admin-header-page-title">
                {currentItem?.label ||
                  "Admin"}
              </strong>
            </div>
          </div>

          <div className="admin-header-right">
            <Link
              href="/"
              target="_blank"
              className="admin-header-store-button"
            >
              <ExternalLink
                size={15}
              />

              View Store
            </Link>

            <div className="admin-header-user">
              <div className="admin-header-user-copy">
                <strong>
                  {user?.name ||
                    "Administrator"}
                </strong>

                <span>
                  {user?.email ||
                    user?.role ||
                    "Admin"}
                </span>
              </div>

              <div className="admin-header-avatar">
                {getInitials(
                  user?.name,
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}

function getInitials(
  name?: string | null,
) {
  if (!name?.trim()) {
    return "A";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase(),
    )
    .join("");
}