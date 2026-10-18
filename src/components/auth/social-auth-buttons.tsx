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
            G
          </span>

          <span>
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