/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Banknote,
  Check,
  CircleAlert,
  CreditCard,
  Loader2,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Tag,
  Truck,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  cartKey,
  useStore,
} from "@/components/shared/store-provider";

import {
  deliveryFee,
  detectDeliveryZone,
} from "@/lib/business";

import {
  formatBDT,
} from "@/lib/money";

import styles from "./checkout-client.module.css";

/* =========================================================
   TYPES
   ========================================================= */

type PublicSettings = {
  insideDhaka: number;
  outsideDhaka: number;

  codEnabled: boolean;
  bkashEnabled: boolean;
};

type PaymentMethod =
  | "COD"
  | "BKASH";

type CheckoutForm = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
};

type CheckoutField =
  keyof CheckoutForm;

type FieldErrors =
  Partial<
    Record<
      CheckoutField,
      string
    >
  >;

type CheckoutResponse = {
  orderNumber?: string;
  paymentMode?: string;
  error?: string;

  fields?: Record<
    string,
    string[] | undefined
  >;
};

type CouponResponse = {
  code?: string | null;
  couponId?: string;
  title?: string;
  discount?: number;
  error?: string;
};

/* =========================================================
   CONSTANTS
   ========================================================= */

const INITIAL_FORM:
  CheckoutForm = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
};


/* =========================================================
   CHECKOUT
   ========================================================= */

export function CheckoutClient() {
  const {
    cart,
    clear,
  } =
    useStore();

  const router =
    useRouter();

  const [
    settings,
    setSettings,
  ] =
    useState<PublicSettings | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<CheckoutForm>(
      INITIAL_FORM,
    );

  const [
    fieldErrors,
    setFieldErrors,
  ] =
    useState<FieldErrors>(
      {},
    );

  const [
    payment,
    setPayment,
  ] =
    useState<PaymentMethod>(
      "COD",
    );

  const [
    coupon,
    setCoupon,
  ] =
    useState("");

  const [
    couponOk,
    setCouponOk,
  ] =
    useState(false);

  const [
    couponError,
    setCouponError,
  ] =
    useState("");

  const [
    automaticCouponId,
    setAutomaticCouponId,
  ] =
    useState("");

  const [
    couponTitle,
    setCouponTitle,
  ] =
    useState("");

  const [
    couponDiscountValue,
    setCouponDiscountValue,
  ] =
    useState(0);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  /* =======================================================
     SETTINGS
     ======================================================= */

  useEffect(() => {
    let cancelled =
      false;

    fetch(
      "/api/settings/public",
      {
        cache:
          "no-store",
      },
    )
      .then(
        async (
          response,
        ) => {
          if (
            !response.ok
          ) {
            throw new Error(
              "Unable to load checkout settings.",
            );
          }

          return response.json();
        },
      )
      .then(
        (
          result:
            PublicSettings,
        ) => {
          if (
            !cancelled
          ) {
            setSettings(
              result,
            );
          }
        },
      )
      .catch(
        () => {
          if (
            !cancelled
          ) {
            setError(
              "Unable to load delivery and payment settings. Please refresh the page.",
            );
          }
        },
      );

    return () => {
      cancelled =
        true;
    };
  }, []);

  /* =======================================================
     PAYMENT FALLBACK
     ======================================================= */

  useEffect(() => {
    if (
      !settings
    ) {
      return;
    }

    if (
      payment ===
        "COD" &&
      !settings.codEnabled &&
      settings.bkashEnabled
    ) {
      setPayment(
        "BKASH",
      );

      return;
    }

    if (
      payment ===
        "BKASH" &&
      !settings.bkashEnabled &&
      settings.codEnabled
    ) {
      setPayment(
        "COD",
      );
    }
  }, [
    payment,
    settings,
  ]);

  /* =======================================================
     TOTALS
     ======================================================= */

  const subtotal =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            line,
          ) =>
            total +
            line.product
              .price *
              line.quantity,

          0,
        ),

      [
        cart,
      ],
    );

  const deliveryZone =
    useMemo(
      () =>
        detectDeliveryZone(
          form.address,
        ),

      [
        form.address,
      ],
    );

  const shippingResolved =
    Boolean(
      settings &&
      deliveryZone,
    );

  const fee =
    settings &&
    deliveryZone
      ? deliveryFee(
          form.address,
          settings,
        )
      : 0;

  const discount =
    couponOk
      ? Math.min(
          couponDiscountValue,
          subtotal +
            fee,
        )
      : 0;

  const total =
    Math.max(
      0,
      subtotal +
        fee -
        discount,
    );

  const paymentAvailable =
    Boolean(
      settings &&
      (
        settings.codEnabled ||
        settings.bkashEnabled
      ),
    );

  /* =======================================================
     CART SIGNATURE
     ======================================================= */

  const cartSignature =
    useMemo(
      () =>
        cart
          .map(
            (
              line,
            ) =>
              `${line.product.id}:${line.size}:${line.color}:${line.quantity}`,
          )
          .join("|"),

      [
        cart,
      ],
    );

  /* =======================================================
     AUTOMATIC COUPON
     ======================================================= */

  useEffect(() => {
    if (
      !settings ||
      !cart.length ||
      !deliveryZone ||
      form.address.trim()
        .length <
        10
    ) {
      return;
    }

    let cancelled =
      false;

    const timer =
      window.setTimeout(
        () => {
          fetch(
            "/api/coupons/validate",
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  address:
                    form.address,

                  items:
                    cart.map(
                      (
                        line,
                      ) => ({
                        productId:
                          line.product
                            .id,

                        size:
                          line.size,

                        color:
                          line.color,

                        quantity:
                          line.quantity,
                      }),
                    ),
                }),
            },
          )
            .then(
              async (
                response,
              ) => ({
                response,

                result:
                  (await response.json()) as
                    CouponResponse,
              }),
            )
            .then(
              ({
                response,
                result,
              }) => {
                if (
                  cancelled ||
                  !response.ok ||
                  !result.couponId
                ) {
                  return;
                }

                setCoupon(
                  "",
                );

                setAutomaticCouponId(
                  result.couponId,
                );

                setCouponTitle(
                  result.title ??
                    "Automatic offer",
                );

                setCouponDiscountValue(
                  result.discount ??
                    0,
                );

                setCouponOk(
                  true,
                );

                setCouponError(
                  "",
                );
              },
            )
            .catch(
              () =>
                undefined,
            );
        },

        450,
      );

    return () => {
      cancelled =
        true;

      window.clearTimeout(
        timer,
      );
    };
  }, [
    cart,
    cartSignature,
    deliveryZone,
    form.address,
    settings,
  ]);

  /* =======================================================
     FIELD HELPERS
     ======================================================= */

  function clearFieldError(
    field:
      CheckoutField,
  ) {
    setFieldErrors(
      (
        current,
      ) => {
        if (
          !current[
            field
          ]
        ) {
          return current;
        }

        const next = {
          ...current,
        };

        delete next[
          field
        ];

        return next;
      },
    );
  }

  function updateField<
    Key extends
      CheckoutField,
  >(
    field:
      Key,

    value:
      CheckoutForm[Key],
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        [field]:
          value,
      }),
    );

    clearFieldError(
      field,
    );

    setError(
      "",
    );
  }

  function updateAddress(
    value: string,
  ) {
    updateField(
      "address",
      value,
    );

    /*
     * Address changes can affect
     * shipping and free-shipping
     * discounts, so any applied coupon
     * must be recalculated.
     */
    setCouponOk(
      false,
    );

    setCouponDiscountValue(
      0,
    );

    setAutomaticCouponId(
      "",
    );

    setCouponTitle(
      "",
    );

    setCouponError(
      "",
    );
  }

  /* =======================================================
     CLIENT VALIDATION
     ======================================================= */

  function validateForm() {
    const errors:
      FieldErrors = {};

    if (
      form.fullName.trim()
        .length <
      2
    ) {
      errors.fullName =
        "Please enter your full name.";
    }

    if (
      !/^01\d{9}$/.test(
        form.phone,
      )
    ) {
      errors.phone =
        "Enter a valid 11-digit Bangladesh phone number.";
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim(),
      )
    ) {
      errors.email =
        "Enter a valid email address.";
    }

    if (
      form.address.trim()
        .length <
      10
    ) {
      errors.address =
        "Enter your full delivery address including area, city and district.";
    }

    return errors;
  }

  /* =======================================================
     COUPON
     ======================================================= */

  async function applyCoupon() {
    setCouponError(
      "",
    );

    if (
      form.address.trim()
        .length <
      10
    ) {
      setFieldErrors(
        (
          current,
        ) => ({
          ...current,

          address:
            "Enter your delivery address before applying a coupon.",
        }),
      );

      setCouponError(
        "Delivery address is required before applying a coupon.",
      );

      return;
    }

    if (
      !coupon.trim()
    ) {
      setCouponError(
        "Enter a coupon code.",
      );

      return;
    }

    try {
      const response =
        await fetch(
          "/api/coupons/validate",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                code:
                  coupon.trim(),

                address:
                  form.address,

                items:
                  cart.map(
                    (
                      line,
                    ) => ({
                      productId:
                        line.product
                          .id,

                      size:
                        line.size,

                      color:
                        line.color,

                      quantity:
                        line.quantity,
                    }),
                  ),
              }),
          },
        );

      const result =
        (await response.json()) as
          CouponResponse;

      if (
        !response.ok
      ) {
        setCouponOk(
          false,
        );

        setCouponDiscountValue(
          0,
        );

        setCouponError(
          result.error ??
            "Coupon could not be applied.",
        );

        return;
      }

      setAutomaticCouponId(
        "",
      );

      setCouponTitle(
        result.title ??
          result.code ??
          "Offer",
      );

      setCouponDiscountValue(
        result.discount ??
          0,
      );

      setCouponOk(
        true,
      );

      setCouponError(
        "",
      );
    } catch {
      setCouponError(
        "Unable to validate the coupon. Please try again.",
      );
    }
  }

  function removeCoupon() {
    setCouponOk(
      false,
    );

    setCouponDiscountValue(
      0,
    );

    setAutomaticCouponId(
      "",
    );

    setCouponTitle(
      "",
    );

    setCoupon(
      "",
    );

    setCouponError(
      "",
    );
  }

  /* =======================================================
     SUBMIT
     ======================================================= */

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(
      "",
    );

    const errors =
      validateForm();

    setFieldErrors(
      errors,
    );

    if (
      Object.keys(
        errors,
      ).length >
      0
    ) {
      setError(
        "Please complete the highlighted fields.",
      );

      window.requestAnimationFrame(
        () => {
          document
            .querySelector(
              '[aria-invalid="true"]',
            )
            ?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "center",
            });
        },
      );

      return;
    }

    if (
      !cart.length
    ) {
      setError(
        "Your cart is empty.",
      );

      return;
    }

    if (
      !settings
    ) {
      setError(
        "Checkout settings are still loading. Please wait a moment.",
      );

      return;
    }

    if (
      !paymentAvailable
    ) {
      setError(
        "No payment method is currently available.",
      );

      return;
    }

    setSaving(
      true,
    );

    try {
      const response =
        await fetch(
          "/api/orders",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                fullName:
                  form.fullName.trim(),

                phone:
                  form.phone,

                email:
                  form.email.trim() ||
                  undefined,

                address:
                  form.address.trim(),

                paymentMethod:
                  payment,

                couponCode:
                  couponOk &&
                  !automaticCouponId
                    ? coupon.trim()
                    : undefined,

                automaticCouponId:
                  couponOk
                    ? automaticCouponId ||
                      undefined
                    : undefined,

                items:
                  cart.map(
                    (
                      line,
                    ) => ({
                      productId:
                        line.product
                          .id,

                      size:
                        line.size,

                      color:
                        line.color,

                      quantity:
                        line.quantity,
                    }),
                  ),
              }),
          },
        );

      const data =
        (await response
          .json()
          .catch(
            () => ({
              error:
                "Order could not be placed.",
            }),
          )) as
          CheckoutResponse;

      if (
        !response.ok
      ) {
        if (
          data.fields
        ) {
          const serverErrors:
            FieldErrors = {};

          const fields: CheckoutField[] =
            [
              "fullName",
              "phone",
              "email",
              "address",
            ];

          for (
            const field
            of fields
          ) {
            const message =
              data.fields[
                field
              ]?.[0];

            if (
              message
            ) {
              serverErrors[
                field
              ] =
                message;
            }
          }

          setFieldErrors(
            (
              current,
            ) => ({
              ...current,
              ...serverErrors,
            }),
          );
        }

        setError(
          data.error ??
            "Order could not be placed.",
        );

        return;
      }

      if (
        !data.orderNumber
      ) {
        setError(
          "Order confirmation could not be created.",
        );

        return;
      }

      clear();

      router.push(
        data.paymentMode ===
          "cod"
          ? `/checkout/success/${data.orderNumber}`
          : `/payment/bkash/${data.orderNumber}`,
      );
    } catch {
      setError(
        "Unable to place your order. Please check your connection and try again.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main className={styles.page}>
      <div className={styles.container}>

        {/* =================================================
            TITLE
            ================================================= */}

        <header className={styles.pageHeader}>
          <span>
            Secure Checkout
          </span>

          <h1>
            Complete Your Order
          </h1>

          <p>
            Enter your delivery
            information, choose how
            you want to pay, and
            review your order.
          </p>
        </header>

        {/* =================================================
            ERROR
            ================================================= */}

        {error ? (
          <div
            className={styles.errorBanner}
            role="alert"
          >
            <CircleAlert
              size={17}
            />

            <span>
              {
                error
              }
            </span>
          </div>
        ) : null}

        {/* =================================================
            FORM
            ================================================= */}

        <form
          className={styles.layout}
          onSubmit={
            submit
          }
          noValidate
        >
          <div className={styles.leftColumn}>
            {/* =============================================
                CUSTOMER / DELIVERY
                ============================================= */}

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionNumber}>
                  1
                </span>

                <div>
                  <h2>
                    Delivery Details
                  </h2>

                  <p>
                    We only need one
                    complete address.
                  </p>
                </div>
              </div>

              <div className={styles.fields}>
                {/* =========================================
                    NAME
                    ========================================= */}

                <label className={styles.field}>
                  <span className={styles.label}>
                    Full Name
                    <b>
                      *
                    </b>
                  </span>

                  <input
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    value={
                      form.fullName
                    }
                    aria-invalid={
                      Boolean(
                        fieldErrors.fullName,
                      )
                    }
                    className={`${styles.control} ${
                      fieldErrors.fullName
                        ? styles.invalid
                        : ""
                    }`}
                    placeholder="Your full name"
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "fullName",
                        event.target
                          .value,
                      )
                    }
                  />

                  {fieldErrors.fullName ? (
                    <small className={styles.fieldError}>
                      {
                        fieldErrors.fullName
                      }
                    </small>
                  ) : null}
                </label>

                {/* =========================================
                    PHONE
                    ========================================= */}

                <label className={styles.field}>
                  <span className={styles.label}>
                    Phone Number
                    <b>
                      *
                    </b>
                  </span>

                  <input
                    type="tel"
                    name="phone"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={
                      11
                    }
                    value={
                      form.phone
                    }
                    aria-invalid={
                      Boolean(
                        fieldErrors.phone,
                      )
                    }
                    className={`${styles.control} ${
                      fieldErrors.phone
                        ? styles.invalid
                        : ""
                    }`}
                    placeholder="01XXXXXXXXX"
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "phone",

                        event.target
                          .value
                          .replace(
                            /\D/g,
                            "",
                          )
                          .slice(
                            0,
                            11,
                          ),
                      )
                    }
                  />

                  {fieldErrors.phone ? (
                    <small className={styles.fieldError}>
                      {
                        fieldErrors.phone
                      }
                    </small>
                  ) : null}
                </label>

                {/* =========================================
                    EMAIL
                    ========================================= */}

                <label className={`${styles.field} ${styles.fullField}`}>
                  <span className={styles.label}>
                    Email Address

                    <em>
                      Optional
                    </em>
                  </span>

                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={
                      form.email
                    }
                    aria-invalid={
                      Boolean(
                        fieldErrors.email,
                      )
                    }
                    className={`${styles.control} ${
                      fieldErrors.email
                        ? styles.invalid
                        : ""
                    }`}
                    placeholder="you@example.com"
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "email",
                        event.target
                          .value,
                      )
                    }
                  />

                  {fieldErrors.email ? (
                    <small className={styles.fieldError}>
                      {
                        fieldErrors.email
                      }
                    </small>
                  ) : null}
                </label>

                {/* =========================================
                    ADDRESS
                    ========================================= */}

                <label className={`${styles.field} ${styles.fullField}`}>
                  <span className={styles.label}>
                    Delivery Address
                    <b>
                      *
                    </b>
                  </span>

                  <textarea
                    name="address"
                    rows={4}
                    autoComplete="street-address"
                    value={
                      form.address
                    }
                    aria-invalid={
                      Boolean(
                        fieldErrors.address,
                      )
                    }
                    className={`${styles.control} ${styles.textarea} ${
                      fieldErrors.address
                        ? styles.invalid
                        : ""
                    }`}
                    placeholder="House/Road, Area, City, District"
                    onChange={(
                      event,
                    ) =>
                      updateAddress(
                        event.target
                          .value,
                      )
                    }
                  />

                  {fieldErrors.address ? (
                    <small className={styles.fieldError}>
                      {
                        fieldErrors.address
                      }
                    </small>
                  ) : (
                    <small className={styles.fieldHint}>
                      Example: House
                      12, Road 5,
                      Mirpur 1,
                      Dhaka. Include
                      your city or
                      district clearly.
                    </small>
                  )}
                </label>
              </div>

              {/* ===========================================
                  AUTOMATIC DELIVERY RATE
                  =========================================== */}

              <div
                className={`${styles.deliveryBox} ${
                  deliveryZone ===
                  "INSIDE_DHAKA"
                    ? styles.deliveryDhaka
                    : deliveryZone ===
                        "OUTSIDE_DHAKA"
                      ? styles.deliveryOutside
                      : ""
                }`}
              >
                <div className={styles.deliveryIcon}>
                  <Truck
                    size={19}
                    strokeWidth={
                      1.6
                    }
                  />
                </div>

                <div className={styles.deliveryCopy}>
                  <strong>
                    {shippingResolved
                      ? deliveryZone ===
                        "INSIDE_DHAKA"
                        ? "Inside Dhaka Delivery"
                        : "Outside Dhaka Delivery"
                      : "Delivery Charge"}
                  </strong>

                  <span>
                    {shippingResolved
                      ? deliveryZone ===
                        "INSIDE_DHAKA"
                        ? "Dhaka detected from your address."
                        : "Outside Dhaka detected from your address."
                      : "Enter your complete address and we’ll calculate it automatically."}
                  </span>
                </div>

                <strong className={styles.deliveryPrice}>
                  {shippingResolved
                    ? formatBDT(
                        fee,
                      )
                    : "—"}
                </strong>
              </div>

              {settings ? (
                <div className={styles.deliveryRates}>
                  <MapPin
                    size={13}
                  />

                  Inside Dhaka{" "}
                  <strong>
                    {formatBDT(
                      settings.insideDhaka,
                    )}
                  </strong>

                  <span>
                    ·
                  </span>

                  Outside Dhaka{" "}
                  <strong>
                    {formatBDT(
                      settings.outsideDhaka,
                    )}
                  </strong>
                </div>
              ) : (
                <div className={styles.deliveryRates}>
                  <Loader2
                    size={13}
                    className={styles.spin}
                  />

                  Loading delivery
                  settings…
                </div>
              )}
            </section>

            {/* =============================================
                PAYMENT
                ============================================= */}

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionNumber}>
                  2
                </span>

                <div>
                  <h2>
                    Payment Method
                  </h2>

                  <p>
                    Choose your
                    preferred payment
                    option.
                  </p>
                </div>
              </div>

              <div className={styles.paymentGrid}>
                {settings?.codEnabled !==
                false ? (
                  <label
                    className={`${styles.paymentOption} ${
                      payment ===
                      "COD"
                        ? styles.paymentSelected
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="COD"
                      checked={
                        payment ===
                        "COD"
                      }
                      onChange={() =>
                        setPayment(
                          "COD",
                        )
                      }
                    />

                    <span className={styles.paymentIcon}>
                      <Banknote
                        size={21}
                        strokeWidth={
                          1.5
                        }
                      />
                    </span>

                    <span className={styles.paymentCopy}>
                      <strong>
                        Cash on
                        Delivery
                      </strong>

                      <small>
                        Pay when your
                        order arrives.
                      </small>
                    </span>

                    <span className={styles.radioMark} />
                  </label>
                ) : null}

                {settings?.bkashEnabled ? (
                  <label
                    className={`${styles.paymentOption} ${
                      payment ===
                      "BKASH"
                        ? styles.paymentSelected
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="BKASH"
                      checked={
                        payment ===
                        "BKASH"
                      }
                      onChange={() =>
                        setPayment(
                          "BKASH",
                        )
                      }
                    />

                    <span className={styles.paymentIcon}>
                      <CreditCard
                        size={21}
                        strokeWidth={
                          1.5
                        }
                      />
                    </span>

                    <span className={styles.paymentCopy}>
                      <strong>
                        bKash
                      </strong>

                      <small>
                        Continue to
                        secure bKash
                        payment.
                      </small>
                    </span>

                    <span className={styles.radioMark} />
                  </label>
                ) : null}
              </div>

              {settings &&
              !paymentAvailable ? (
                <div className={styles.paymentWarning}>
                  No payment method
                  is currently
                  available. Please
                  contact the store.
                </div>
              ) : null}
            </section>

            {/* =============================================
                SAFE CHECKOUT NOTE
                ============================================= */}

            <div className={styles.safeNote}>
              <PackageCheck
                size={18}
                strokeWidth={
                  1.5
                }
              />

              <div>
                <strong>
                  Order verified
                  before placement
                </strong>

                <span>
                  Stock, product
                  prices, coupons and
                  delivery charges
                  are checked again
                  securely by the
                  server.
                </span>
              </div>
            </div>
          </div>

          {/* =================================================
              SUMMARY
              ================================================= */}

          <aside className={styles.summary}>
            <div className={styles.summaryHeader}>
              <div>
                <span>
                  Review
                </span>

                <h2>
                  Order Summary
                </h2>
              </div>

              <strong>
                {cart.reduce(
                  (
                    count,
                    line,
                  ) =>
                    count +
                    line.quantity,

                  0,
                )}{" "}
                items
              </strong>
            </div>

            {/* =============================================
                PRODUCTS
                ============================================= */}

            <div className={styles.summaryItems}>
              {cart.map(
                (
                  line,
                ) => (
                  <article
                    key={cartKey(
                      line.product
                        .id,
                      line.size,
                      line.color,
                    )}
                    className={styles.summaryItem}
                  >
                    <div className={styles.summaryImage}>
                      <Image
                        src={
                          line.product
                            .image
                        }
                        alt={
                          line.product
                            .alt
                        }
                        fill
                        sizes="66px"
                      />

                      <span>
                        {
                          line.quantity
                        }
                      </span>
                    </div>

                    <div className={styles.summaryProduct}>
                      <Link
                        href={`/product/${line.product.slug}`}
                      >
                        {
                          line.product
                            .name
                        }
                      </Link>

                      <small>
                        {line.color
                          ? line.color
                          : "Default"}

                        {line.size
                          ? ` · ${line.size}`
                          : ""}
                      </small>
                    </div>

                    <strong className={styles.summaryItemPrice}>
                      {formatBDT(
                        line.product
                          .price *
                          line.quantity,
                      )}
                    </strong>
                  </article>
                ),
              )}

              {!cart.length ? (
                <div className={styles.emptyCart}>
                  Your cart is empty.

                  <Link href="/shop">
                    Continue Shopping
                  </Link>
                </div>
              ) : null}
            </div>

            {/* =============================================
                COUPON
                ============================================= */}

            <div className={styles.coupon}>
              <div className={styles.couponLabel}>
                <Tag
                  size={13}
                />

                Coupon
              </div>

              <div className={styles.couponForm}>
                <input
                  type="text"
                  value={
                    coupon
                  }
                  disabled={
                    couponOk
                  }
                  placeholder="Coupon code"
                  onChange={(
                    event,
                  ) => {
                    setCoupon(
                      event.target
                        .value
                        .toUpperCase(),
                    );

                    setCouponError(
                      "",
                    );
                  }}
                />

                <button
                  type="button"
                  disabled={
                    couponOk
                  }
                  onClick={
                    applyCoupon
                  }
                >
                  Apply
                </button>
              </div>

              {couponError ? (
                <p className={styles.couponError}>
                  {
                    couponError
                  }
                </p>
              ) : null}

              {couponOk ? (
                <div className={styles.couponSuccess}>
                  <Check
                    size={14}
                  />

                  <div>
                    <strong>
                      {
                        couponTitle
                      }
                    </strong>

                    <span>
                      You save{" "}
                      {formatBDT(
                        discount,
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={
                      removeCoupon
                    }
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>

            {/* =============================================
                TOTALS
                ============================================= */}

            <div className={styles.totals}>
              <div>
                <span>
                  Subtotal
                </span>

                <strong>
                  {formatBDT(
                    subtotal,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Delivery
                </span>

                <strong>
                  {shippingResolved
                    ? formatBDT(
                        fee,
                      )
                    : "Enter address"}
                </strong>
              </div>

              {discount >
              0 ? (
                <div className={styles.discountRow}>
                  <span>
                    Discount
                  </span>

                  <strong>
                    −{" "}
                    {formatBDT(
                      discount,
                    )}
                  </strong>
                </div>
              ) : null}
            </div>

            <div className={styles.totalRow}>
              <div>
                <span>
                  Total
                </span>

                <small>
                  Final amount
                </small>
              </div>

              <strong>
                {formatBDT(
                  total,
                )}
              </strong>
            </div>

            {/* =============================================
                PLACE ORDER
                ============================================= */}

            <button
              type="submit"
              className={styles.placeOrder}
              disabled={
                saving ||
                !settings ||
                !paymentAvailable ||
                !cart.length
              }
            >
              {saving ? (
                <Loader2
                  size={17}
                  className={styles.spin}
                />
              ) : (
                <LockKeyhole
                  size={17}
                />
              )}

              <span>
                {saving
                  ? "Placing Order…"
                  : payment ===
                      "BKASH"
                    ? "Continue to bKash"
                    : "Place Order"}
              </span>

              {!saving ? (
                <strong>
                  {formatBDT(
                    total,
                  )}
                </strong>
              ) : null}
            </button>

            <p className={styles.summaryNote}>
              By placing your order
              you confirm that your
              contact and delivery
              information are
              correct.
            </p>
          </aside>
        </form>
      </div>
    </main>
  );
}