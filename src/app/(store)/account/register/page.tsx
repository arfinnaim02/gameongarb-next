import {
  Heart,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

import {
  Suspense,
} from "react";

import {
  RegisterForm,
} from "@/components/auth/auth-forms";

import styles from "@/components/auth/customer-auth.module.css";

export default function RegisterPage() {
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
              Join
              <br />
              The Game.
            </h2>

            <p>
              Create your account
              for a faster,
              personalized shopping
              experience.
            </p>
          </div>

          <div
            className={
              styles.benefits
            }
          >
            <div>
              <PackageCheck
                size={16}
              />

              <span>
                Track your orders
              </span>
            </div>

            <div>
              <Heart
                size={16}
              />

              <span>
                Save your wishlist
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
              Create Account
            </span>

            <h1>
              Get Started
            </h1>

            <p
              className={
                styles.description
              }
            >
              Create an account to
              save addresses, track
              orders and keep your
              wishlist synchronized.
            </p>
          </div>

          <Suspense fallback={null}>
            <RegisterForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}