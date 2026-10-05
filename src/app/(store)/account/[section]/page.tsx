import Link from "next/link";

import {
  CheckCircle2,
  Heart,
  MapPin,
  Percent,
  ShieldCheck,
  ShoppingBag,
  Tag,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  AccountForm,
} from "@/components/account/account-form";

import {
  AddressActions,
} from "@/components/account/address-actions";

import styles from "@/components/account/account-section.module.css";

import {
  ProductCard,
} from "@/components/product/product-card";

import {
  toStoreProduct,
} from "@/lib/catalog";

import {
  db,
  withDatabaseRetry,
} from "@/lib/db";

import {
  requireCustomer,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

/* =========================================================
   PAGE
   ========================================================= */

export default async function AccountSection({
  params,
}: {
  params:
    Promise<{
      section:
        string;
    }>;
}) {
  const {
    section,
  } =
    await params;

  const {
    user,
    customer,
  } =
    await requireCustomer();

  /* =======================================================
     WISHLIST
     ======================================================= */

  if (
    section ===
    "wishlist"
  ) {
    const wishlist =
      await withDatabaseRetry(
        () =>
          db.wishlist.findUnique({
            where: {
              customerId:
                customer.id,
            },

            include: {
              items: {
                where: {
                  product: {
                    status:
                      "ACTIVE",
                  },
                },

                orderBy: {
                  createdAt:
                    "desc",
                },

                include: {
                  product: {
                    include: {
                      images:
                        true,

                      variants:
                        true,

                      categories: {
                        include: {
                          category:
                            true,
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
      );

    const products =
      wishlist?.items.map(
        (
          item,
        ) =>
          toStoreProduct(
            item.product,
          ),
      ) ??
      [];

    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>
            Saved Favourites
          </span>

          <h1>
            My Wishlist
          </h1>

          <p>
            Products you save are
            kept with your Game On
            Garb account so you can
            quickly return to them
            later.
          </p>
        </header>

        <div className={styles.summaryBar}>
          <div className={styles.summaryCopy}>
            <strong>
              Your saved products
            </strong>

            <span>
              Wishlist availability
              can change as stock is
              updated.
            </span>
          </div>

          <div className={styles.summaryCount}>
            {
              products.length
            }
          </div>
        </div>

        {products.length >
        0 ? (
          <div className={styles.wishlistGrid}>
            {products.map(
              (
                product,
              ) => (
                <ProductCard
                  key={
                    product.id
                  }
                  product={
                    product
                  }
                />
              ),
            )}
          </div>
        ) : (
          <EmptyState
            icon={
              Heart
            }
            title="Your wishlist is empty"
            text="Save products you love and they will appear here."
            action="Explore Products"
          />
        )}
      </div>
    );
  }

  /* =======================================================
     ADDRESSES
     ======================================================= */

  if (
    section ===
    "addresses"
  ) {
    const addresses =
      await withDatabaseRetry(
        () =>
          db.address.findMany({
            where: {
              customerId:
                customer.id,
            },

            orderBy: [
              {
                isDefault:
                  "desc",
              },

              {
                createdAt:
                  "desc",
              },
            ],
          }),
      );

    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>
            Delivery Information
          </span>

          <h1>
            Saved Addresses
          </h1>

          <p>
            Save delivery locations
            for faster checkout.
            Your default address
            appears first.
          </p>
        </header>

        <div className={styles.summaryBar}>
          <div className={styles.summaryCopy}>
            <strong>
              Delivery addresses
            </strong>

            <span>
              Keep your phone and
              location accurate for
              smoother courier
              delivery.
            </span>
          </div>

          <div className={styles.summaryCount}>
            {
              addresses.length
            }
          </div>
        </div>

        {addresses.length >
        0 ? (
          <div className={styles.addressGrid}>
            {addresses.map(
              (
                address,
              ) => (
                <article
                  key={
                    address.id
                  }
                  className={`${styles.addressCard} ${
                    address.isDefault
                      ? styles.addressDefault
                      : ""
                  }`}
                >
                  <div className={styles.addressTop}>
                    <div className={styles.addressLabel}>
                      <span className={styles.addressIcon}>
                        <MapPin
                          size={15}
                        />
                      </span>

                      {
                        address.label
                      }
                    </div>

                    {address.isDefault ? (
                      <span className={styles.defaultBadge}>
                        Default
                      </span>
                    ) : null}
                  </div>

                  <p className={styles.addressPerson}>
                    <strong>
                      {
                        address.fullName
                      }
                    </strong>

                    <br />

                    {
                      address.phone
                    }
                  </p>

                  <p className={styles.addressLocation}>
                    {
                      address.address
                    }
                    <br />

                    {
                      address.thana
                    }
                    {", "}
                    {
                      address.district
                    }
                    {", "}
                    {
                      address.division
                    }
                  </p>

                  <AddressActions
                    id={
                      address.id
                    }
                    isDefault={
                      address.isDefault
                    }
                  />
                </article>
              ),
            )}
          </div>
        ) : (
          <EmptyState
            icon={
              MapPin
            }
            title="No saved addresses"
            text="Add your first delivery address below."
            hideAction
          />
        )}

        <AccountForm
          resource="addresses"
          defaults={{
            fullName:
              customer.name,

            phone:
              customer.phone,
          }}
        />
      </div>
    );
  }

  /* =======================================================
     COUPONS
     ======================================================= */

  if (
    section ===
    "coupons"
  ) {
    const now =
      new Date();

    const coupons =
      await withDatabaseRetry(
        () =>
          db.coupon.findMany({
            where: {
              active:
                true,

              validFrom: {
                lte:
                  now,
              },

              OR: [
                {
                  validUntil:
                    null,
                },

                {
                  validUntil: {
                    gte:
                      now,
                  },
                },
              ],
            },

            orderBy: [
              {
                validUntil:
                  "asc",
              },

              {
                createdAt:
                  "desc",
              },
            ],
          }),
      );

    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>
            Savings & Offers
          </span>

          <h1>
            My Coupons
          </h1>

          <p>
            Active Game On Garb
            coupon codes and
            automatic promotions
            currently available for
            your orders.
          </p>
        </header>

        <div className={styles.summaryBar}>
          <div className={styles.summaryCopy}>
            <strong>
              Available offers
            </strong>

            <span>
              Coupon eligibility is
              checked again at
              checkout based on
              order value and
              product rules.
            </span>
          </div>

          <div className={styles.summaryCount}>
            {
              coupons.length
            }
          </div>
        </div>

        {coupons.length >
        0 ? (
          <div className={styles.couponGrid}>
            {coupons.map(
              (
                coupon,
              ) => {
                const offer =
                  coupon.type ===
                  "PERCENTAGE"
                    ? `${Number(
                        coupon.value,
                      )}% OFF`
                    : coupon.type ===
                        "FREE_SHIPPING"
                      ? "FREE DELIVERY"
                      : coupon.type ===
                          "FIXED"
                        ? `৳${Number(
                            coupon.value,
                          ).toLocaleString(
                            "en-BD",
                          )} OFF`
                        : "SPECIAL OFFER";

                const expiry =
                  coupon.validUntil
                    ? coupon.validUntil.toLocaleDateString(
                        "en-BD",
                        {
                          day:
                            "numeric",

                          month:
                            "short",

                          year:
                            "numeric",
                        },
                      )
                    : "No fixed expiry";

                return (
                  <article
                    key={
                      coupon.id
                    }
                    className={styles.couponCard}
                  >
                    <div>
                      <div className={styles.couponTop}>
                        <span className={styles.couponIcon}>
                          <Percent
                            size={17}
                          />
                        </span>

                        <strong className={styles.couponValue}>
                          {
                            offer
                          }
                        </strong>
                      </div>

                      <h2 className={styles.couponTitle}>
                        {
                          coupon.title
                        }
                      </h2>

                      {coupon.description ? (
                        <p className={styles.couponDescription}>
                          {
                            coupon.description
                          }
                        </p>
                      ) : null}
                    </div>

                    <div className={styles.couponBottom}>
                      <div className={styles.couponCode}>
                        <span>
                          {
                            coupon.code
                              ? "Coupon Code"
                              : "Offer Type"
                          }
                        </span>

                        <strong>
                          {coupon.code ??
                            "AUTOMATIC"}
                        </strong>
                      </div>

                      <div className={styles.couponExpiry}>
                        {coupon.minimumOrder ? (
                          <>
                            Min. order ৳
                            {Number(
                              coupon.minimumOrder,
                            ).toLocaleString(
                              "en-BD",
                            )}
                            <br />
                          </>
                        ) : null}

                        {coupon.validUntil
                          ? `Valid until ${expiry}`
                          : expiry}
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        ) : (
          <EmptyState
            icon={
              Tag
            }
            title="No active coupons"
            text="Current promotions and coupon codes will appear here."
            action="Continue Shopping"
          />
        )}
      </div>
    );
  }

  /* =======================================================
     SETTINGS
     ======================================================= */

  if (
    section ===
    "settings"
  ) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>
            Profile & Security
          </span>

          <h1>
            Account Settings
          </h1>

          <p>
            Keep your customer
            information current and
            update your password
            whenever needed.
          </p>
        </header>

        <div className={styles.settingsGrid}>
          <AccountForm
            resource="settings"
            defaults={{
              name:
                user.name,

              phone:
                user.phone ??
                customer.phone,

              email:
                user.email,
            }}
          />

          <aside className={styles.securityCard}>
            <div className={styles.securityIcon}>
              <ShieldCheck
                size={18}
              />
            </div>

            <h3>
              Account Security
            </h3>

            <p>
              Your password is
              never displayed.
              Changing it requires
              your current
              password.
            </p>

            <div className={styles.securityList}>
              <div className={styles.securityItem}>
                <CheckCircle2
                  size={13}
                />

                <span>
                  Secure HTTP-only
                  login session
                </span>
              </div>

              <div className={styles.securityItem}>
                <CheckCircle2
                  size={13}
                />

                <span>
                  Customer orders
                  are restricted to
                  your account
                </span>
              </div>

              <div className={styles.securityItem}>
                <CheckCircle2
                  size={13}
                />

                <span>
                  Current password
                  required before
                  password changes
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  notFound();
}

/* =========================================================
   EMPTY
   ========================================================= */

function EmptyState({
  icon: Icon,
  title,
  text,
  action = "Browse Shop",
  hideAction = false,
}: {
  icon:
    typeof Heart;

  title:
    string;

  text:
    string;

  action?:
    string;

  hideAction?:
    boolean;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <Icon
          size={22}
        />
      </div>

      <h2>
        {
          title
        }
      </h2>

      <p>
        {
          text
        }
      </p>

      {!hideAction ? (
        <Link
          href="/shop"
          className="btn btn-primary"
        >
          <ShoppingBag
            size={14}
          />

          {
            action
          }
        </Link>
      ) : null}
    </div>
  );
}