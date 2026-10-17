"use client";

import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  FormEvent,
  useState,
} from "react";

import styles from "./customer-auth.module.css";

import {
  SocialAuthButtons,
} from "./social-auth-buttons";

/* =========================================================
   SHARED MUTATION STATE
   ========================================================= */

function useMutation() {
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

  return {
    busy,
    setBusy,
    message,
    setMessage,
    error,
    setError,
  };
}

/* =========================================================
   REGISTER
   ========================================================= */

export function RegisterForm() {
  const state =
    useMutation();

  const router =
    useRouter();

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      state.busy
    ) {
      return;
    }

    state.setBusy(
      true,
    );

    state.setError(
      "",
    );

    state.setMessage(
      "",
    );

    try {
      const formData =
        new FormData(
          event.currentTarget,
        );

      const values = {
        name:
          formData.get(
            "name",
          ),

        phone:
          formData.get(
            "phone",
          ),

        email:
          formData.get(
            "email",
          ),

        password:
          formData.get(
            "password",
          ),

        confirmPassword:
          formData.get(
            "confirmPassword",
          ),
      };

      const response =
        await fetch(
          "/api/auth/register",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify(
                values,
              ),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        state.setError(
          result.error ??
            "Registration failed.",
        );

        return;
      }

      router.replace(
        "/account",
      );

      router.refresh();
    } catch {
      state.setError(
        "Registration failed. Please try again.",
      );
    } finally {
      state.setBusy(
        false,
      );
    }
  }

  return (
    <form
      onSubmit={
        submit
      }
      className={
        styles.form
      }
    >
            <SocialAuthButtons
        mode="register"
      />
      <label
        className={
          styles.field
        }
      >
        <span>
          Full Name
        </span>

        <div
          className={
            styles.inputWrap
          }
        >
          <UserRound
            size={17}
          />

          <input
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            required
            minLength={2}
            maxLength={100}
          />
        </div>
      </label>

      <div
        className={
          styles.twoFields
        }
      >
        <label
          className={
            styles.field
          }
        >
          <span>
            Phone Number
          </span>

          <div
            className={
              styles.inputWrap
            }
          >
            <Phone
              size={17}
            />

            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              pattern="01[0-9]{9}"
              placeholder="01XXXXXXXXX"
              required
            />
          </div>
        </label>

        <label
          className={
            styles.field
          }
        >
          <span>
            Email Address
          </span>

          <div
            className={
              styles.inputWrap
            }
          >
            <Mail
              size={17}
            />

            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              maxLength={180}
            />
          </div>
        </label>
      </div>

      <label
        className={
          styles.field
        }
      >
        <span>
          Password
        </span>

        <div
          className={
            styles.inputWrap
          }
        >
          <LockKeyhole
            size={17}
          />

          <input
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            minLength={8}
            maxLength={100}
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            required
          />

          <button
            type="button"
            className={
              styles.passwordToggle
            }
            onClick={() =>
              setShowPassword(
                (
                  current,
                ) =>
                  !current,
              )
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showPassword ? (
              <EyeOff
                size={16}
              />
            ) : (
              <Eye
                size={16}
              />
            )}
          </button>
        </div>
      </label>

      <label
        className={
          styles.field
        }
      >
        <span>
          Confirm Password
        </span>

        <div
          className={
            styles.inputWrap
          }
        >
          <LockKeyhole
            size={17}
          />

          <input
            name="confirmPassword"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            minLength={8}
            maxLength={100}
            autoComplete="new-password"
            placeholder="Enter password again"
            required
          />

          <button
            type="button"
            className={
              styles.passwordToggle
            }
            onClick={() =>
              setShowConfirmPassword(
                (
                  current,
                ) =>
                  !current,
              )
            }
            aria-label={
              showConfirmPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showConfirmPassword ? (
              <EyeOff
                size={16}
              />
            ) : (
              <Eye
                size={16}
              />
            )}
          </button>
        </div>
      </label>

      {state.error ? (
        <div
          role="alert"
          className={
            styles.error
          }
        >
          {
            state.error
          }
        </div>
      ) : null}

      <button
        type="submit"
        className={
          styles.submit
        }
        disabled={
          state.busy
        }
      >
        {state.busy ? (
          <>
            <Loader2
              size={16}
              className={
                styles.spin
              }
            />

            Creating Account
          </>
        ) : (
          "Create Account"
        )}
      </button>

      <div
        className={
          styles.divider
        }
      >
        <span>
          Already have an account?
        </span>
      </div>

      <Link
        href="/account/login"
        className={
          styles.secondaryAction
        }
      >
        Sign In Instead
      </Link>

      <p
        className={
          styles.terms
        }
      >
        By creating an account,
        you agree to Game On Garb&apos;s
        store policies and terms.
      </p>
    </form>
  );
}

/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

export function ForgotPasswordForm() {
  const state =
    useMutation();

  const [
    resetUrl,
    setResetUrl,
  ] =
    useState("");

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      state.busy
    ) {
      return;
    }

    state.setBusy(
      true,
    );

    state.setError(
      "",
    );

    state.setMessage(
      "",
    );

    try {
      const email =
        new FormData(
          event.currentTarget,
        ).get(
          "email",
        );

      const response =
        await fetch(
          "/api/auth/password-reset",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                email,
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        state.setError(
          result.error ??
            "Unable to request password reset.",
        );

        return;
      }

      state.setMessage(
        result.message ??
          "Password reset instructions created.",
      );

      setResetUrl(
        result.resetUrl ??
          "",
      );
    } catch {
      state.setError(
        "Unable to request password reset.",
      );
    } finally {
      state.setBusy(
        false,
      );
    }
  }

  return (
    <form
      onSubmit={
        submit
      }
      className={
        styles.form
      }
    >
      <label
        className={
          styles.field
        }
      >
        <span>
          Account Email
        </span>

        <div
          className={
            styles.inputWrap
          }
        >
          <Mail
            size={17}
          />

          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>
      </label>

      {state.error ? (
        <div
          role="alert"
          className={
            styles.error
          }
        >
          {
            state.error
          }
        </div>
      ) : null}

      {state.message ? (
        <div
          className={
            styles.success
          }
        >
          {
            state.message
          }
        </div>
      ) : null}

      {resetUrl ? (
        <Link
          href={
            resetUrl
          }
          className={
            styles.secondaryAction
          }
        >
          Open Reset Link
        </Link>
      ) : null}

      <button
        type="submit"
        className={
          styles.submit
        }
        disabled={
          state.busy
        }
      >
        {state.busy ? (
          <>
            <Loader2
              size={16}
              className={
                styles.spin
              }
            />

            Creating Instructions
          </>
        ) : (
          "Request Password Reset"
        )}
      </button>

      <div
        className={
          styles.divider
        }
      >
        <span>
          Remembered your password?
        </span>
      </div>

      <Link
        href="/account/login"
        className={
          styles.secondaryAction
        }
      >
        Back to Sign In
      </Link>
    </form>
  );
}

/* =========================================================
   RESET PASSWORD
   ========================================================= */

export function ResetPasswordForm() {
  const state =
    useMutation();

  const searchParams =
    useSearchParams();

  const router =
    useRouter();

  const token =
    searchParams.get(
      "token",
    ) ??
    "";

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      state.busy ||
      !token
    ) {
      return;
    }

    state.setBusy(
      true,
    );

    state.setError(
      "",
    );

    state.setMessage(
      "",
    );

    try {
      const password =
        new FormData(
          event.currentTarget,
        ).get(
          "password",
        );

      const response =
        await fetch(
          "/api/auth/password-reset",
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                token,
                password,
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        state.setError(
          result.error ??
            "Unable to reset password.",
        );

        return;
      }

      state.setMessage(
        result.message ??
          "Password updated successfully.",
      );

      window.setTimeout(
        () => {
          router.replace(
            "/account/login",
          );

          router.refresh();
        },
        1200,
      );
    } catch {
      state.setError(
        "Unable to reset password.",
      );
    } finally {
      state.setBusy(
        false,
      );
    }
  }

  return (
    <form
      onSubmit={
        submit
      }
      className={
        styles.form
      }
    >
      {!token ? (
        <div
          role="alert"
          className={
            styles.error
          }
        >
          This password reset link
          is invalid or missing its
          token.
        </div>
      ) : null}

      <label
        className={
          styles.field
        }
      >
        <span>
          New Password
        </span>

        <div
          className={
            styles.inputWrap
          }
        >
          <LockKeyhole
            size={17}
          />

          <input
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            minLength={8}
            maxLength={100}
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            required
          />

          <button
            type="button"
            className={
              styles.passwordToggle
            }
            onClick={() =>
              setShowPassword(
                (
                  current,
                ) =>
                  !current,
              )
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showPassword ? (
              <EyeOff
                size={16}
              />
            ) : (
              <Eye
                size={16}
              />
            )}
          </button>
        </div>
      </label>

      {state.error ? (
        <div
          role="alert"
          className={
            styles.error
          }
        >
          {
            state.error
          }
        </div>
      ) : null}

      {state.message ? (
        <div
          className={
            styles.success
          }
        >
          {
            state.message
          }
        </div>
      ) : null}

      <button
        type="submit"
        className={
          styles.submit
        }
        disabled={
          state.busy ||
          !token
        }
      >
        {state.busy ? (
          <>
            <Loader2
              size={16}
              className={
                styles.spin
              }
            />

            Updating Password
          </>
        ) : (
          "Update Password"
        )}
      </button>

      <Link
        href="/account/login"
        className={
          styles.secondaryAction
        }
      >
        Back to Sign In
      </Link>
    </form>
  );
}