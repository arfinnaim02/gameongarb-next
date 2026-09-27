import { notFound } from "next/navigation";
import type { Metadata } from "next";
const pages: Record<
  string,
  {
    title: string;
    intro: string;
    sections: { heading: string; body: string }[];
  }
> = {
  about: {
    title: "Our Story",
    intro: "More than what you wear. It’s a movement. It’s a mindset.",
    sections: [
      {
        heading: "Built in Bangladesh",
        body: "Game On Garb brings together sports, fashion and everyday style for people who live with passion.",
      },
      {
        heading: "Experience the Thrill",
        body: "We design versatile, modern pieces that feel at home in training, at work and everywhere between.",
      },
    ],
  },
  contact: {
    title: "Contact Us",
    intro: "Our support team is ready to help.",
    sections: [
      {
        heading: "Customer Support",
        body: "Phone: 01712-345678 · Email: support@gameongarb.com · Hours: 10:00 AM–10:00 PM (daily).",
      },
    ],
  },
  "size-guide": {
    title: "Size Guide",
    intro: "Find your Game On Garb fit.",
    sections: [
      {
        heading: "How to measure",
        body: "Measure your chest, waist and hips with a relaxed tape, then compare those measurements with the product-specific chart.",
      },
      {
        heading: "Need help?",
        body: "Contact support with your measurements and the product name for personalized guidance.",
      },
    ],
  },
  shipping: {
    title: "Shipping Information",
    intro: "Simple delivery across Bangladesh.",
    sections: [
      {
        heading: "Standard Delivery",
        body: "Inside Dhaka and outside-Dhaka charges are calculated from current store settings during checkout. Estimated delivery windows are shown before you place the order.",
      },
    ],
  },
  returns: {
    title: "Return & Exchange Policy",
    intro: "A straightforward exchange process.",
    sections: [
      {
        heading: "Eligibility",
        body: "Unused items with original tags may be eligible for exchange within the period shown on your order confirmation. Some product categories may be excluded for hygiene reasons.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "We handle your information carefully.",
    sections: [
      {
        heading: "Information we use",
        body: "We use order, delivery and account information to fulfil purchases, support customers, prevent abuse and meet legal obligations.",
      },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    intro: "Terms for using Game On Garb.",
    sections: [
      {
        heading: "Orders",
        body: "Orders are subject to stock availability, price verification and successful payment or COD confirmation.",
      },
    ],
  },
  faq: {
    title: "Frequently Asked Questions",
    intro: "Quick answers for shopping with us.",
    sections: [
      {
        heading: "Can I order without an account?",
        body: "Yes. Guest checkout is fully supported.",
      },
      {
        heading: "Which payment methods are available?",
        body: "Cash on Delivery and bKash are available when enabled by the store.",
      },
    ],
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ content: string }>;
}): Promise<Metadata> {
  const { content } = await params;
  return { title: pages[content]?.title ?? "Game On Garb" };
}
export default async function Content({
  params,
}: {
  params: Promise<{ content: string }>;
}) {
  const { content } = await params;
  const page = pages[content];
  if (!page) notFound();
  return (
    <div
      className="container"
      style={{ padding: "60px 0 80px", maxWidth: 850 }}
    >
      <span className="eyebrow">Game On Garb</span>
      <h1
        className="display"
        style={{ fontSize: "clamp(3rem,7vw,5rem)", margin: "12px 0" }}
      >
        {page.title}
      </h1>
      <p style={{ fontSize: 20 }}>{page.intro}</p>
      {page.sections.map((s) => (
        <section
          key={s.heading}
          style={{ padding: "24px 0", borderTop: "1px solid var(--line)" }}
        >
          <h2>{s.heading}</h2>
          <p className="muted" style={{ lineHeight: 1.8 }}>
            {s.body}
          </p>
        </section>
      ))}
    </div>
  );
}
