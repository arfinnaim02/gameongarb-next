import Link from "next/link";

export const metadata = {
  title:
    "Terms & Conditions | Game On Garb",

  description:
    "Read the Game On Garb terms and conditions for accounts, orders, payments, delivery, returns, exchanges, and website use.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <div className="container legal-page-inner">
        <div className="legal-page-heading">
          <span className="eyebrow">
            Game On Garb
          </span>

          <h1 className="display">
            Terms & Conditions
          </h1>

          <p className="muted">
            Last updated: October 17, 2026
          </p>
        </div>

        <div className="legal-content">
          <section>
            <h2>
              1. Introduction
            </h2>

            <p>
              These Terms & Conditions govern your use of the
              Game On Garb website and your purchase of products
              from us.
            </p>

            <p>
              By using our website, creating an account, or
              placing an order, you agree to these terms.
            </p>
          </section>

          <section>
            <h2>
              2. Customer Accounts
            </h2>

            <p>
              Customers may create an account using supported
              registration methods, including email and password
              or supported social sign-in providers.
            </p>

            <p>
              You are responsible for providing accurate account
              information and keeping access to your account
              secure.
            </p>
          </section>

          <section>
            <h2>
              3. Product Information
            </h2>

            <p>
              We aim to display product descriptions, prices,
              sizes, colors, images, and availability as
              accurately as possible.
            </p>

            <p>
              Actual product color may vary slightly depending on
              lighting, photography, and device display settings.
            </p>
          </section>

          <section>
            <h2>
              4. Pricing
            </h2>

            <p>
              Product prices are displayed in Bangladeshi Taka
              (BDT) unless otherwise stated.
            </p>

            <p>
              Prices, discounts, offers, and availability may
              change without prior notice.
            </p>
          </section>

          <section>
            <h2>
              5. Orders
            </h2>

            <p>
              Placing an order does not guarantee acceptance.
              Orders may be reviewed, confirmed, cancelled, or
              declined where necessary.
            </p>

            <p>
              We may contact you to confirm an order, delivery
              details, product availability, or payment
              information.
            </p>
          </section>

          <section>
            <h2>
              6. Payment Methods
            </h2>

            <p>
              Available payment methods may include Cash on
              Delivery and bKash.
            </p>

            <p>
              Additional payment options may be introduced in the
              future.
            </p>
          </section>

          <section>
            <h2>
              7. Delivery Charges
            </h2>

            <p>
              The standard delivery charge is:
            </p>

            <ul>
              <li>
                Inside Dhaka: ৳80
              </li>

              <li>
                Outside Dhaka: ৳150
              </li>
            </ul>

            <p>
              Delivery charges may change during special
              campaigns, promotions, or courier adjustments.
            </p>
          </section>

          <section>
            <h2>
              8. Delivery
            </h2>

            <p>
              Estimated delivery times are provided as guidance
              and may vary depending on customer location,
              courier availability, weather, public holidays,
              operational conditions, or other circumstances
              outside our control.
            </p>

            <p>
              Customers are responsible for providing a correct
              phone number and delivery address.
            </p>
          </section>

          <section>
            <h2>
              9. Order Cancellation
            </h2>

            <p>
              Cancellation requests may be accepted before an
              order has reached a stage where shipment can no
              longer reasonably be stopped.
            </p>

            <p>
              Once an order has been handed over to the courier,
              cancellation options may be limited.
            </p>
          </section>

          <section>
            <h2>
              10. Returns and Exchanges
            </h2>

            <p>
              Return and exchange eligibility depends on the
              condition of the product, the nature of the issue,
              and the applicable Game On Garb return or exchange
              policy available at the time of purchase.
            </p>

            <p>
              Products should normally remain unused, unworn,
              unwashed, and in their original condition with
              packaging and tags where applicable.
            </p>

            <p>
              Certain products may not be eligible for return or
              exchange for hygiene, customization, clearance, or
              other stated reasons.
            </p>
          </section>

          <section>
            <h2>
              11. Promotions and Coupons
            </h2>

            <p>
              Promotional codes, discounts, campaigns, and
              coupons may have separate validity periods,
              eligibility conditions, product restrictions, or
              usage limits.
            </p>

            <p>
              Promotions cannot necessarily be combined unless
              specifically stated.
            </p>
          </section>

          <section>
            <h2>
              12. Website Use
            </h2>

            <p>
              You agree not to misuse the website, attempt
              unauthorized access, interfere with website
              security, submit fraudulent orders, abuse
              promotions, or use the service for unlawful
              purposes.
            </p>
          </section>

          <section>
            <h2>
              13. Intellectual Property
            </h2>

            <p>
              The Game On Garb name, branding, website content,
              graphics, photographs, product presentation, and
              other original content may not be copied,
              reproduced, or commercially reused without
              permission where protected by applicable law.
            </p>
          </section>

          <section>
            <h2>
              14. Limitation of Liability
            </h2>

            <p>
              To the extent permitted by applicable law, Game On
              Garb will not be responsible for indirect,
              incidental, or consequential losses arising from
              website use, delivery delays, third-party service
              interruptions, or circumstances outside our
              reasonable control.
            </p>
          </section>

          <section>
            <h2>
              15. Changes to These Terms
            </h2>

            <p>
              We may update these Terms & Conditions when our
              services, policies, or business practices change.
            </p>

            <p>
              The current version will be published on this page.
            </p>
          </section>

          <section>
            <h2>
              16. Contact
            </h2>

            <p>
              For questions about these terms, orders, or
              customer service, contact:
            </p>

            <p>
              Email:{" "}
              <a href="mailto:gameongarb@gmail.com">
                gameongarb@gmail.com
              </a>
            </p>

            <p>
              Store: Shop-03, Road-08, Mirpur-02, opposite Gate-2
              of the National Cricket Stadium, Mirpur, Dhaka,
              Bangladesh.
            </p>
          </section>

          <div className="legal-back">
            <Link href="/">
              Back to Game On Garb
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}