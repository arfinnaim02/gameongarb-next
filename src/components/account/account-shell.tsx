"use client";

import Link from "next/link";

import {
  Heart,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  Settings,
  ShoppingBag,
  Ticket,
  UserRound,
} from "lucide-react";

import {
  usePathname,
} from "next/navigation";

import type {
  ReactNode,
} from "react";

import styles from "./account-shell.module.css";

type AccountShellProps = {
  user: {
    name:
      string;

    email:
      string;

    phone:
      string | null;
  };

  children:
    ReactNode;
};

const links = [
  {
    icon:
      LayoutDashboard,

    label:
      "Dashboard",

    href:
      "/account",
  },

  {
    icon:
      ShoppingBag,

    label:
      "My Orders",

    href:
      "/account/orders",
  },

  {
    icon:
      MapPin,

    label:
      "Addresses",

    href:
      "/account/addresses",
  },

  {
    icon:
      Heart,

    label:
      "Wishlist",

    href:
      "/account/wishlist",
  },

  {
    icon:
      Ticket,

    label:
      "Coupons",

    href:
      "/account/coupons",
  },

  {
    icon:
      Settings,

    label:
      "Settings",

    href:
      "/account/settings",
  },
] as const;

function initials(
  name:
    string,
) {
  return name
    .trim()
    .split(/\s+/)
    .slice(
      0,
      2,
    )
    .map(
      (
        part,
      ) =>
        part[0]?.toUpperCase(),
    )
    .join("") ||
    "GO";
}

export function AccountShell({
  user,
  children,
}: AccountShellProps) {
  const pathname =
    usePathname();

  function active(
    href:
      string,
  ) {
    if (
      href ===
      "/account"
    ) {
      return (
        pathname ===
        "/account"
      );
    }

    return pathname.startsWith(
      href,
    );
  }

  const navigation = (
    <>
      {links.map(
        (
          item,
        ) => {
          const Icon =
            item.icon;

          const isActive =
            active(
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
              className={`${styles.navLink} ${
                isActive
                  ? styles.navLinkActive
                  : ""
              }`}
              aria-current={
                isActive
                  ? "page"
                  : undefined
              }
            >
              <Icon
                size={17}
                strokeWidth={
                  1.8
                }
              />

              <span>
                {
                  item.label
                }
              </span>
            </Link>
          );
        },
      )}
    </>
  );

  return (
    <div className={styles.accountPage}>
      <div className={`container ${styles.accountLayout}`}>
        {/* =================================================
            DESKTOP SIDEBAR
            ================================================= */}

        <aside className={styles.sidebar}>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>
              {
                initials(
                  user.name,
                )
              }
            </div>

            <div className={styles.profileCopy}>
              <span>
                Customer Account
              </span>

              <strong>
                {
                  user.name
                }
              </strong>

              <small>
                {
                  user.email
                }
              </small>
            </div>
          </div>

          <nav
            className={styles.navigation}
            aria-label="Customer account"
          >
            {
              navigation
            }
          </nav>

          <div className={styles.sidebarBottom}>
            <Link
              href="/contact"
              className={styles.supportLink}
            >
              <LifeBuoy
                size={17}
              />

              Need Help?
            </Link>

            <form
              action="/api/auth/logout?next=%2Faccount%2Flogin%3Floggedout%3D1"
              method="post"
            >
              <button
                type="submit"
                className={styles.logoutButton}
              >
                <LogOut
                  size={17}
                />

                Log Out
              </button>
            </form>
          </div>
        </aside>

        {/* =================================================
            MOBILE ACCOUNT HEADER
            ================================================= */}

        <div className={styles.mobileHeader}>
          <div className={styles.mobileProfile}>
            <div className={styles.mobileAvatar}>
              <UserRound
                size={18}
              />
            </div>

            <div>
              <strong>
                {
                  user.name
                }
              </strong>

              <span>
                My Account
              </span>
            </div>
          </div>

          <form
            action="/api/auth/logout?next=%2Faccount%2Flogin%3Floggedout%3D1"
            method="post"
          >
            <button
              type="submit"
              className={styles.mobileLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut
                size={17}
              />
            </button>
          </form>
        </div>

        <nav
          className={styles.mobileNav}
          aria-label="Customer account navigation"
        >
          {
            navigation
          }
        </nav>

        {/* =================================================
            CONTENT
            ================================================= */}

        <main className={styles.content}>
          {
            children
          }
        </main>
      </div>
    </div>
  );
}