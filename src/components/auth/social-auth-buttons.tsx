"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import styles from "./customer-auth.module.css";

function getSocialErrorMessage(
  code:
    string | null,
) {
  switch (code) {
    case "cancelled":
      return "Social sign-in was cancelled.";

    case "invalid_state":
      return "The social sign-in session expired. Please try again.";

    case "provider_not_configured":
      return "This social sign-in method is not configured yet.";

    case "provider_error":
      return "Unable to complete social sign-in right now.";

    case "existing_email":
      return "An account already exists with this email. Sign in with your existing method.";

    case "account_unavailable":
    return "This account is not available for sign-in.";

    case "session_expired":
    return "Your social registration session has expired. Please try again.";

    default:
    return null;
  }
}

export function SocialAuthButtons({
  mode,
}: {
  mode:
    | "login"
    | "register";
}) {
  const searchParams =
    useSearchParams();

  const errorMessage =
    getSocialErrorMessage(
      searchParams.get(
        "social_error",
      ),
    );

  return (
    <div
      className={
        styles.socialSection
      }
    >
      {errorMessage ? (
        <div
          role="alert"
          className={
            styles.error
          }
        >
          {errorMessage}
        </div>
      ) : null}

      <div
        className={
          styles.socialButtons
        }
      >
        <Link
          href={`/api/auth/oauth/google?mode=${mode}`}
          className={
            styles.googleButton
          }
        >
          <span
            className={
              styles.googleIcon
            }
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              role="img"
              focusable="false"
            >
              <path
                fill="#4285F4"
                d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.873h5.382a4.6 4.6 0 0 1-1.996 3.018v2.509h3.227c1.891-1.741 2.987-4.309 2.987-7.355Z"
              />

              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.964-.895 6.618-2.418l-3.227-2.509c-.895.6-2.041.954-3.391.954-2.605 0-4.809-1.759-5.6-4.127H3.064v2.591A9.996 9.996 0 0 0 12 22Z"
              />

              <path
                fill="#FBBC05"
                d="M6.4 13.9A6.01 6.01 0 0 1 6.086 12c0-.659.114-1.3.314-1.9V7.509H3.064A9.997 9.997 0 0 0 2 12c0 1.614.386 3.141 1.064 4.491L6.4 13.9Z"
              />

              <path
                fill="#EA4335"
                d="M12 5.973c1.468 0 2.786.505 3.823 1.495l2.864-2.864C16.959 2.995 14.7 2 12 2a9.996 9.996 0 0 0-8.936 5.509L6.4 10.1C7.191 7.732 9.395 5.973 12 5.973Z"
              />
            </svg>
          </span>

          <span
            className={
              styles.googleButtonText
            }
          >
            Continue with Google
          </span>
        </Link>

      </div>

      <div
        className={
          styles.socialDivider
        }
      >
        <span>
          or continue with email
        </span>
      </div>
    </div>
  );
}