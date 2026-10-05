"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  LockKeyhole,
  MapPinned,
  Save,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import styles from "./account-section.module.css";

export function AccountForm({
  resource,
  defaults = {},
}: {
  resource:
    | "addresses"
    | "settings";

  defaults?:
    Record<
      string,
      string
    >;
}) {
  const router =
    useRouter();

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState(false);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      busy
    ) {
      return;
    }

    setBusy(
      true,
    );

    setMessage(
      "",
    );

    setSuccess(
      false,
    );

    try {
      const formData =
        new FormData(
          event.currentTarget,
        );

      const body =
        Object.fromEntries(
          formData,
        ) as Record<
          string,
          FormDataEntryValue
        >;

      /*
       * Empty optional password
       * fields must not be sent.
       *
       * The API treats password as
       * optional, but an empty string
       * would fail minLength(8).
       */
      if (
        resource ===
        "settings"
      ) {
        if (
          !String(
            body.password ??
              "",
          ).trim()
        ) {
          delete body.password;
        }

        if (
          !String(
            body.currentPassword ??
              "",
          ).trim()
        ) {
          delete body.currentPassword;
        }
      }

      const response =
        await fetch(
          `/api/account/${resource}`,
          {
            method:
              "POST",

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
        await response.json();

      if (
        !response.ok
      ) {
        setMessage(
          result.error ??
            "Could not save your changes.",
        );

        return;
      }

      setSuccess(
        true,
      );

      setMessage(
        result.message ??
          (
            resource ===
            "addresses"
              ? "Address saved successfully."
              : "Account updated successfully."
          ),
      );

      if (
        resource ===
        "addresses"
      ) {
        event.currentTarget.reset();
      } else {
        /*
         * Always clear passwords
         * after a successful profile
         * update.
         */
        const currentPassword =
          event.currentTarget.elements.namedItem(
            "currentPassword",
          ) as HTMLInputElement | null;

        const password =
          event.currentTarget.elements.namedItem(
            "password",
          ) as HTMLInputElement | null;

        if (
          currentPassword
        ) {
          currentPassword.value =
            "";
        }

        if (
          password
        ) {
          password.value =
            "";
        }
      }

      router.refresh();
    } catch {
      setMessage(
        "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  const isAddress =
    resource ===
    "addresses";

  return (
    <section className={styles.formCard}>
      <header className={styles.formHeader}>
        <div className={styles.formHeaderCopy}>
          <span>
            {isAddress
              ? "Delivery"
              : "Customer Profile"}
          </span>

          <strong>
            {isAddress
              ? "Add New Address"
              : "Update Profile"}
          </strong>

          <small>
            {isAddress
              ? "Save another location for faster checkout."
              : "Manage your contact details and password."}
          </small>
        </div>

        <div className={styles.formHeaderIcon}>
          {isAddress ? (
            <MapPinned
              size={18}
            />
          ) : (
            <LockKeyhole
              size={18}
            />
          )}
        </div>
      </header>

      <form
        onSubmit={
          submit
        }
        className={styles.form}
      >
        {isAddress ? (
          <div className={styles.formGrid}>
            <Field
              name="label"
              label="Address Label"
              defaultValue="Home"
              placeholder="Home, Office..."
            />

            <Field
              name="fullName"
              label="Receiver Name"
              defaultValue={
                defaults.fullName
              }
              autoComplete="name"
            />

            <Field
              name="phone"
              label="Phone Number"
              defaultValue={
                defaults.phone
              }
              placeholder="01XXXXXXXXX"
              autoComplete="tel"
              pattern="01[0-9]{9}"
            />

            <Field
              name="division"
              label="Division"
              placeholder="Dhaka"
            />

            <Field
              name="district"
              label="District"
              placeholder="Dhaka"
            />

            <Field
              name="thana"
              label="Thana / Upazila"
              placeholder="Mirpur"
            />

            <Field
              name="address"
              label="Full Address"
              placeholder="House, road, area and nearby landmark"
              className={
                styles.fieldFull
              }
            />
          </div>
        ) : (
          <>
            <div className={styles.formGrid}>
              <Field
                name="name"
                label="Full Name"
                defaultValue={
                  defaults.name
                }
                autoComplete="name"
              />

              <Field
                name="phone"
                label="Phone Number"
                defaultValue={
                  defaults.phone
                }
                autoComplete="tel"
                pattern="01[0-9]{9}"
              />

              <Field
                name="email"
                label="Email Address"
                defaultValue={
                  defaults.email
                }
                type="email"
                required={
                  false
                }
                readOnly
                className={
                  styles.fieldFull
                }
                help="Your login email is currently fixed to this account."
              />
            </div>

            <div className={styles.passwordSection}>
              <div className={styles.passwordHeading}>
                <strong>
                  Change Password
                </strong>

                <span>
                  Leave both fields
                  empty if you do not
                  want to change your
                  password.
                </span>
              </div>

              <div className={styles.formGrid}>
                <Field
                  name="currentPassword"
                  label="Current Password"
                  type="password"
                  required={
                    false
                  }
                  autoComplete="current-password"
                  placeholder="Current password"
                />

                <Field
                  name="password"
                  label="New Password"
                  type="password"
                  required={
                    false
                  }
                  minLength={
                    8
                  }
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>
          </>
        )}

        <div className={styles.formFooter}>
          <div>
            {message ? (
              <p
                role="status"
                className={`${styles.formStatus} ${
                  !success
                    ? styles.formStatusError
                    : ""
                }`}
              >
                {
                  message
                }
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className={styles.saveButton}
            disabled={
              busy
            }
          >
            <Save
              size={14}
            />

            {busy
              ? "Saving..."
              : isAddress
                ? "Save Address"
                : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* =========================================================
   FIELD
   ========================================================= */

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required = true,
  readOnly = false,
  className = "",
  help,
  ...inputProps
}: {
  name:
    string;

  label:
    string;

  defaultValue?:
    string;

  type?:
    string;

  required?:
    boolean;

  readOnly?:
    boolean;

  className?:
    string;

  help?:
    string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  | "name"
  | "type"
  | "defaultValue"
  | "required"
  | "readOnly"
>) {
  return (
    <label
      className={`${styles.field} ${className}`}
    >
      <span>
        {
          label
        }
      </span>

      <input
        {...inputProps}
        name={
          name
        }
        type={
          type
        }
        defaultValue={
          defaultValue
        }
        required={
          required
        }
        readOnly={
          readOnly
        }
        className={
          readOnly
            ? styles.readonly
            : undefined
        }
      />

      {help ? (
        <small>
          {
            help
          }
        </small>
      ) : null}
    </label>
  );
}