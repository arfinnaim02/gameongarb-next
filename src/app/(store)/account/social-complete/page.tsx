import {
  ShieldCheck,
  Smartphone,
} from "lucide-react";


import {
  SocialCompleteForm,
} from "@/components/auth/social-complete-form";

import styles from "@/components/auth/customer-auth.module.css";

export const dynamic =
  "force-dynamic";

export default async function SocialCompletePage() {

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
              Almost There
            </span>

            <h2>
              One
              <br />
              Last Step.
            </h2>

            <p>
              Your social account
              has been verified.
              Add your phone number
              to finish creating
              your GameOn Garb
              account.
            </p>
          </div>

          <div
            className={
              styles.benefits
            }
          >
            <div>
              <Smartphone
                size={16}
              />

              <span>
                Delivery updates
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
              Social Registration
            </span>

            <h1>
              Complete Account
            </h1>

            <p
              className={
                styles.description
              }
            >
              Enter your phone
              number to complete
              registration.
            </p>
          </div>

          <SocialCompleteForm />
        </div>
      </section>
    </main>
  );
}