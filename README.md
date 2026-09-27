# Game On Garb

Production-structured full-stack ecommerce foundation for **GAME ON GARB — EXPERIENCE THE THRILL**, designed for the Bangladesh market and implemented from the supplied approved PDF.

## Technology

- Next.js 16 App Router, React 19 and strict TypeScript
- PostgreSQL with Prisma ORM and checked-in SQL migration
- Tailwind CSS 4 plus a reusable design-token/component layer
- Zod validation, bcrypt password hashing and signed HTTP-only session cookies
- Provider abstractions for bKash, SMS and courier services
- Vitest business-logic tests

## Requirements

- Node.js 20.9 or newer (Node 22/24 recommended)
- npm 10 or newer
- PostgreSQL 15 or newer

## Quick start

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

The `DATABASE_URL` in `.env` must point to a writable PostgreSQL database. The committed migration creates the complete schema; `prisma migrate dev` applies it and regenerates the Prisma client.

For an all-in-one non-destructive development setup after configuring `.env`:

```bash
npm run setup
```

## Neon PostgreSQL setup

Neon works with this project. Create a Neon project and database, open **Connect**, select the Node.js/Prisma connection string, and place it in `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
```

The pooled Neon URL is suitable for the running Next.js application. To apply the checked-in migrations to a new Neon database, use:

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

If Neon gives you both pooled and direct URLs, use the direct URL temporarily when running migration commands, then keep the pooled URL in `.env` for normal runtime traffic. Never commit the Neon URL. If a password contains special URL characters, copy Neon's generated string instead of assembling it manually.

## Demo credentials (local development only)

| Role        | Email                       | Password             |
| ----------- | --------------------------- | -------------------- |
| Super Admin | `admin@gameongarb.local`    | `GameOnAdmin123!`    |
| Customer    | `customer@gameongarb.local` | `GameOnCustomer123!` |

Never use these credentials in production. Change or remove seeded users before launch.

## Commands

```bash
npm run dev          # development server
npm run typecheck    # strict TypeScript validation
npm run lint         # ESLint / Next.js rules
npm test             # business-logic tests
npm run build        # Prisma generation + production build
npm start            # production server
npm run db:migrate   # create/apply development migrations
npm run db:seed      # idempotent demo-data seed
npm run db:studio    # Prisma Studio
```

## Included application areas

The storefront includes the PDF-aligned database-driven home, multi-slide campaign hero, Shop search/filter/sort, hierarchical category discovery, product gallery and stock-aware variants, persistent variant-safe guest cart, simple Bangladesh checkout, server-validated coupons, COD, bKash sandbox flow, protected order success, phone-protected public tracking, registration/login/password reset, account dashboard, detailed orders, saved-address controls, synchronized wishlist, coupons, newsletter capture, content/policy pages, SEO routes and polished loading/error/empty/404 states.

The protected admin includes live dashboard metrics, persistent product create/edit/duplicate/archive actions, a movable category tree, transactional order-status updates, customer blocking, editable offers/coupons, variant inventory adjustments and history, homepage ordering/content/hero-slide controls, reports, central settings, integrations and activity logs. Roles are `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `STAFF` and `CUSTOMER`; navigation and server reads/writes enforce permissions. Critical business helpers and API mutations validate all input on the server.

## Database and money

Money uses PostgreSQL `Decimal(12,2)` and server calculations normalize values through integer paisa to avoid trusting browser totals. Order creation executes in a Prisma transaction. Stock decrements use a conditional update so concurrent orders cannot silently make inventory negative. Each successful movement creates an `InventoryTransaction`; each status change is designed to create an `OrderStatusHistory` record.

Shipping values are stored in `StoreSetting.shipping`. The seed values are inside Dhaka `৳80` and outside Dhaka `৳150`. Checkout reads current public settings and the order API reloads them, then recalculates delivery, coupon, product prices and totals independently.

## Images

Core demo images are local SVG assets in `public/images/products`, so the seeded storefront works offline. Product image records store URLs only; binary data is not stored in PostgreSQL. For production, configure the Cloudinary variables from `.env.example` and connect an upload signer/API route to the existing product image URL model.

## bKash

Set `BKASH_MODE=sandbox` during development and provide the bKash base URL, app key, app secret, username and password. `src/lib/payments/provider.ts` defines the provider contract, mock adapter and real adapter boundary. The webhook route verifies an HMAC signature, creates an idempotent integration log and never stores secrets.

Do not set production mode until the merchant account, callback URLs, signatures and refund flow have been verified in bKash sandbox. The app never presents mock completion as production payment success.

## SMS and courier

`SmsProvider` and `CourierProvider` keep order logic provider-independent. Local development uses safe mock adapters. Configure the corresponding environment variables for a real provider and add its adapter at the provider boundary; do not spread vendor-specific calls through order components.

Courier records store internal order ID, external consignment ID and tracking ID separately. Provider failures should be logged and retried without rolling back or corrupting an already-created order.

## Security notes

- Passwords are hashed with bcrypt (cost 12 in the seed).
- Sessions are signed and stored only in HTTP-only, secure-in-production, same-site cookies.
- Guest order-success and sandbox payment screens require a short-lived, HTTP-only order-access token.
- Password reset tokens are random, hashed in PostgreSQL, single-use and expire after 30 minutes. In development the generated link is shown in the UI; production must deliver it through the configured messaging provider.
- Admin/account routes are protected by the Next.js proxy.
- Checkout, login and tracking inputs are validated on the server.
- Public tracking requires order number plus the matching phone number and applies throttling.
- Webhooks require signatures and idempotency keys.
- Integration secrets belong in environment variables or encrypted storage and are never returned by public settings APIs.
- For production, replace the in-memory throttle with Redis or an edge-compatible distributed limiter, set strong secrets and enable platform-level CSRF/rate-limit/WAF rules.

## Deployment

### Vercel + managed PostgreSQL

1. Import the repository into Vercel.
2. Add all production environment variables.
3. Use a pooled runtime database URL when your provider recommends it; use a direct URL for migrations.
4. Run `npx prisma migrate deploy` from CI or the release command.
5. Build with `npm run build`.

### Node.js VPS

```bash
npm ci
npx prisma migrate deploy
npm run build
npm start
```

Run behind HTTPS and a reverse proxy, keep environment files outside the web root, and use a process manager such as systemd or PM2.

## Backup and recovery

Use automated PostgreSQL snapshots plus periodic tested `pg_dump` exports. Back up uploaded media at the provider. Before a schema deployment, verify a recent restore point. Application ZIPs are not database backups.

## Troubleshooting

- **Prisma cannot connect:** verify `DATABASE_URL`, firewall rules, SSL parameters and database availability.
- **Neon migration fails:** use the direct Neon connection string for `npx prisma migrate deploy`, ensure `?sslmode=require` is present, then switch back to the pooled runtime URL.
- **Login fails after a fresh install:** run `npm run db:seed` and confirm cookies are allowed on the local origin.
- **Checkout says a variant is unavailable:** seed data uses exact size/color combinations; reselect a variant or inspect `ProductVariant` in Prisma Studio.
- **Images do not appear:** confirm files under `public/images/products` are present and restart the dev server.
- **bKash stays pending:** confirm sandbox credentials, callback URL and webhook secret. Inspect integration logs, never force production success manually.
- **Build memory pressure:** use Node 22+, provide at least 2 GB RAM, and build without `.next` from another environment.

## Production checklist

Use a unique `SESSION_SECRET`, configure real email/SMS/payment/courier credentials, replace demo accounts, connect signed image uploads, add Redis-backed throttling, set monitoring/error reporting, test database restores, run accessibility checks and complete provider sandbox certification before accepting live payments.
