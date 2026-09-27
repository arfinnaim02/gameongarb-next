import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
const demoProducts = [
  [
    "p1",
    "Game On Training Jersey",
    "game-on-training-jersey",
    1290,
    "Sports",
    "GO-TJ-001",
    42,
  ],
  [
    "p2",
    "Classic Polo - Sand",
    "classic-polo-sand",
    1190,
    "Polo",
    "PL-002",
    18,
  ],
  [
    "p3",
    "Logo T-Shirt - Black",
    "logo-tshirt-black",
    990,
    "T-Shirts",
    "TS-003",
    30,
  ],
  [
    "p4",
    "Performance Shorts",
    "performance-shorts",
    1190,
    "Sports",
    "SH-004",
    8,
  ],
  ["p5", "Urban Sneakers", "urban-sneakers", 2490, "Shoes", "SHO-005", 36],
  ["p6", "Game On Hoodie", "game-on-hoodie", 1990, "Hoodies", "HD-006", 15],
  ["p7", "Logo Cap", "logo-cap", 790, "Accessories", "CAP-007", 210],
  [
    "p8",
    "Everyday Backpack",
    "everyday-backpack",
    1790,
    "Accessories",
    "BAG-008",
    78,
  ],
] as const;
async function main() {
  const adminHash = await bcrypt.hash("GameOnAdmin123!", 12);
  const customerHash = await bcrypt.hash("GameOnCustomer123!", 12);
  await db.user.upsert({
    where: { email: "admin@gameongarb.local" },
    update: { passwordHash: adminHash },
    create: {
      id: "admin-local",
      name: "Game On Admin",
      email: "admin@gameongarb.local",
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
    },
  });
  const customerUser = await db.user.upsert({
    where: { email: "customer@gameongarb.local" },
    update: { passwordHash: customerHash },
    create: {
      id: "customer-user-local",
      name: "Tanvir Hossain",
      email: "customer@gameongarb.local",
      phone: "01712345678",
      passwordHash: customerHash,
      role: "CUSTOMER",
    },
  });
  await db.customer.upsert({
    where: { phone: "01712345678" },
    update: { userId: customerUser.id },
    create: {
      id: "customer-local",
      userId: customerUser.id,
      name: "Tanvir Hossain",
      email: "customer@gameongarb.local",
      phone: "01712345678",
      addresses: {
        create: {
          label: "Home",
          fullName: "Tanvir Hossain",
          phone: "01712345678",
          division: "Dhaka",
          district: "Dhaka",
          thana: "Dhanmondi",
          address: "House 12, Road 6",
        },
      },
    },
  });
  const cats = [
    "Sports",
    "Polo",
    "Shirts",
    "T-Shirts",
    "Shoes",
    "Accessories",
    "Hoodies",
  ];
  for (let i = 0; i < cats.length; i++) {
    const name = cats[i];
    await db.category.upsert({
      where: { slug: name.toLowerCase() },
      update: {},
      create: {
        id: `cat-${i}`,
        name,
        slug: name.toLowerCase(),
        sortOrder: i,
        showInNavigation: true,
        showOnHomepage: true,
        active: true,
      },
    });
  }
  const football = await db.category.upsert({
    where: { slug: "football" },
    update: {},
    create: {
      name: "Football",
      slug: "football",
      parentId: "cat-0",
      sortOrder: 0,
      active: true,
    },
  });
  for (const [i, n] of ["Jerseys", "Shorts", "Training Wear"].entries())
    await db.category.upsert({
      where: { slug: n.toLowerCase().replaceAll(" ", "-") },
      update: {},
      create: {
        name: n,
        slug: n.toLowerCase().replaceAll(" ", "-"),
        parentId: football.id,
        sortOrder: i,
        active: true,
      },
    });
  for (const p of demoProducts) {
    const [id, name, slug, price, cat, sku, stock] = p;
    await db.product.upsert({
      where: { id },
      update: { regularPrice: price, status: "ACTIVE" },
      create: {
        id,
        name,
        slug,
        regularPrice: price,
        status: "ACTIVE",
        featured: true,
        newArrival: true,
        trending: true,
        shortDescription: "Premium Game On Garb everyday performance style.",
        images: {
          create: {
            url: `/images/products/${slug.includes("jersey") ? "jersey" : slug.includes("polo") ? "polo" : slug.includes("shorts") ? "shorts" : slug.includes("sneaker") ? "shoe" : slug.includes("hoodie") ? "hoodie" : slug.includes("cap") ? "cap" : slug.includes("backpack") ? "backpack" : "tshirt"}.svg`,
            alt: name,
            primary: true,
          },
        },
        variants: {
          create: [
            {
              sku,
              size:
                cat === "Shoes"
                  ? "41"
                  : cat === "Accessories"
                    ? "One Size"
                    : "M",
              color: cat === "Polo" ? "#d8c6ad" : "#151515",
              stock,
              lowStockThreshold: 10,
            },
            {
              sku: `${sku}-L`,
              size:
                cat === "Shoes"
                  ? "42"
                  : cat === "Accessories"
                    ? "One Size"
                    : "L",
              color: cat === "Polo" ? "#d8c6ad" : "#151515",
              stock: Math.max(1, Math.floor(stock / 2)),
              lowStockThreshold: 5,
            },
          ],
        },
        categories: {
          create: { categoryId: `cat-${cats.indexOf(cat)}`, primary: true },
        },
      },
    });
  }
  await db.storeSetting.upsert({
    where: { key: "shipping" },
    update: {
      value: {
        insideDhaka: 80,
        outsideDhaka: 150,
        insideEstimate: "1–2 working days",
        outsideEstimate: "3–5 working days",
      },
    },
    create: {
      key: "shipping",
      value: {
        insideDhaka: 80,
        outsideDhaka: 150,
        insideEstimate: "1–2 working days",
        outsideEstimate: "3–5 working days",
      },
    },
  });
  await db.storeSetting.upsert({
    where: { key: "payments" },
    update: { value: { codEnabled: true, bkashEnabled: true } },
    create: {
      key: "payments",
      value: { codEnabled: true, bkashEnabled: true },
    },
  });
  await db.storeSetting.upsert({
    where: { key: "general" },
    update: {},
    create: {
      key: "general",
      value: {
        storeName: "Game On Garb",
        currency: "BDT",
        timezone: "Asia/Dhaka",
        storeLive: true,
        maintenanceMode: false,
        itemsPerPage: 12,
      },
    },
  });
  await db.storeSetting.upsert({
    where: { key: "contact" },
    update: {},
    create: {
      key: "contact",
      value: {
        phone: "01712-345678",
        email: "support@gameongarb.com",
        address: "Dhaka, Bangladesh",
        supportHours: "10:00 AM–10:00 PM daily",
      },
    },
  });
  await db.storeSetting.upsert({
    where: { key: "social" },
    update: {},
    create: {
      key: "social",
      value: {
        facebook: "https://facebook.com/gameongarb",
        instagram: "https://instagram.com/gameongarb",
        youtube: "https://youtube.com/@gameongarb",
        tiktok: "https://tiktok.com/@gameongarb",
      },
    },
  });
  await db.storeSetting.upsert({
    where: { key: "other" },
    update: {},
    create: {
      key: "other",
      value: { itemsPerPage: 12, cancellationHours: 2 },
    },
  });
  await db.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      title: "New User Discount",
      code: "WELCOME10",
      description: "10% off, maximum ৳500",
      type: "PERCENTAGE",
      value: 10,
      maximumDiscount: 500,
      minimumOrder: 1000,
      usageLimit: 1000,
      perCustomerLimit: 1,
      validFrom: new Date("2026-01-01"),
      validUntil: new Date("2027-12-31"),
      active: true,
    },
  });
  const hero = await db.homepageSection.upsert({
    where: { id: "home-hero" },
    update: {},
    create: {
      id: "home-hero",
      type: "HERO",
      name: "Hero",
      heading: "Game on. Every day.",
      subtitle: "Sports. Style. Everything between.",
      ctaLabel: "Shop New Arrivals",
      ctaLink: "/shop?sort=newest",
      enabled: true,
      sortOrder: 0,
      config: { autoplay: true, interval: 6000 },
    },
  });
  if ((await db.heroSlide.count({ where: { sectionId: hero.id } })) === 0)
    await db.heroSlide.createMany({
      data: [
        {
          sectionId: hero.id,
          title: "Game on. Every day.",
          subtitle: "Sports. Style. Everything between.",
          image: "/images/campaigns/hero.svg",
          ctaLabel: "Shop New Arrivals",
          ctaLink: "/shop",
          sortOrder: 0,
        },
        {
          sectionId: hero.id,
          title: "Built to move.",
          subtitle: "Performance for every day.",
          image: "/images/campaigns/hero.svg",
          ctaLabel: "Explore Sports",
          ctaLink: "/shop?category=sports",
          sortOrder: 1,
        },
      ],
    });
  for (const [i, type] of [
    "NEW_ARRIVALS",
    "SPORTS",
    "POLO",
    "CATEGORIES",
    "TRENDING",
    "BRAND_STORY",
  ].entries())
    await db.homepageSection.upsert({
      where: { id: `home-${type.toLowerCase()}` },
      update: {},
      create: {
        id: `home-${type.toLowerCase()}`,
        type: type as never,
        name: type.replaceAll("_", " "),
        enabled: true,
        sortOrder: i + 1,
      },
    });
  if ((await db.order.count()) === 0) {
    const v = await db.productVariant.findFirstOrThrow({
      where: { productId: "p1" },
    });
    await db.order.create({
      data: {
        number: "GOG-20260920-001",
        customerId: "customer-local",
        customerName: "Tanvir Hossain",
        phone: "01712345678",
        email: "customer@gameongarb.local",
        division: "Dhaka",
        district: "Dhaka",
        thana: "Dhanmondi",
        shippingAddress: "House 12, Road 6",
        subtotal: 1290,
        discount: 0,
        deliveryCharge: 80,
        total: 1370,
        paymentMethod: "COD",
        paymentStatus: "PENDING",
        status: "CONFIRMED",
        items: {
          create: {
            productId: "p1",
            variantId: v.id,
            name: "Game On Training Jersey",
            sku: v.sku,
            size: v.size,
            color: v.color,
            image: "/images/products/jersey.svg",
            unitPrice: 1290,
            quantity: 1,
            lineTotal: 1290,
          },
        },
        history: {
          create: [
            {
              newStatus: "NEW",
              note: "Order placed",
              source: "SEED",
              createdAt: new Date("2026-09-20T06:24:00Z"),
            },
            {
              oldStatus: "NEW",
              newStatus: "CONFIRMED",
              note: "Confirmed by admin",
              source: "ADMIN",
              createdAt: new Date("2026-09-20T07:12:00Z"),
            },
          ],
        },
        payments: {
          create: { method: "COD", status: "PENDING", amount: 1370 },
        },
      },
    });
  }
  await db.integration.upsert({
    where: { service_provider: { service: "SMS", provider: "mock" } },
    update: {},
    create: {
      service: "SMS",
      provider: "mock",
      enabled: true,
      mode: "mock",
      config: { events: ["order_placed", "shipped"] },
    },
  });
  await db.integration.upsert({
    where: { service_provider: { service: "COURIER", provider: "mock" } },
    update: {},
    create: {
      service: "COURIER",
      provider: "mock",
      enabled: true,
      mode: "mock",
      config: {},
    },
  });
  await db.activityLog.create({
    data: {
      actorId: "admin-local",
      action: "SEED_COMPLETED",
      entityType: "SYSTEM",
      metadata: { products: demoProducts.length },
    },
  });
  console.log("Seed complete. Admin: admin@gameongarb.local / GameOnAdmin123!");
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
