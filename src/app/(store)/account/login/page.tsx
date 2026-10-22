import {
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

import {
  Suspense,
} from "react";

import {
  LoginForm,
} from "@/components/auth/login-form";

import styles from "@/components/auth/customer-auth.module.css";

export default function LoginPage() {
  return (
    <main
      className={
        styles.page
      }
    >
      <section
        className={
          styles.shell
        }
      >
        <div
          className={
            styles.brandPanel
          }
        >
          <div
            className={
              styles.brandTop
            }
          >
            <span>
              GameOn Garb
            </span>

            <h2>
              Welcome
              <br />
              Back.
            </h2>

            <p>
              Sign in to manage
              your orders, saved
              addresses, wishlist
              and shopping history.
            </p>
          </div>

          <div
            className={
              styles.benefits
            }
          >
            <div>
              <ShoppingBag
                size={16}
              />

              <span>
                Track every order
              </span>
            </div>

            <div>
              <Truck
                size={16}
              />

              <span>
                Faster checkout
              </span>
            </div>

            <div>
              <ShieldCheck
                size={16}
              />

              <span>
                Secure account
              </span>
            </div>
          </div>
        </div>

        <div
          className={
            styles.formPanel
          }
        >
          <div
            className={
              styles.formHeading
            }
          >
            <span
              className={
                styles.eyebrow
              }
            >
              Account Access
            </span>

            <h1>
              Sign In
            </h1>

            <p
              className={
                styles.description
              }
            >
              Enter your account
              details to continue
              shopping with Game On
              Garb.
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}