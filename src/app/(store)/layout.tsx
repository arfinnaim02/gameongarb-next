import {
  StoreShell,
} from "@/components/layout/store-shell";

import {
  TrackingScripts,
} from "@/components/tracking/tracking-scripts";

import {
  getNavigationCategories,
} from "@/lib/catalog";

import {
  normalizeTrackingConfig,
} from "@/lib/tracking-config";
import {
  db,
  withDatabaseRetry,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navCategories =
    await withDatabaseRetry(
      () =>
        getNavigationCategories(),
    );

  const reviewAggregate =
    await withDatabaseRetry(
      () =>
        db.review.aggregate({
          where: {
            status:
              "APPROVED",

            approved:
              true,
          },

          _avg: {
            rating:
              true,
          },

          _count: {
            _all:
              true,
          },
        }),
    );

  const settingsRows =
    await withDatabaseRetry(
      () =>
        db.storeSetting.findMany({
          where: {
            key: {
              in: [
                "general",
                "contact",
                "social",
                "tracking",
                "global_announcement_bar",
              ],
            },
          },

          select: {
            key:
              true,

            value:
              true,
          },
        }),
    );

  const settings =
    Object.fromEntries(
      settingsRows.map(
        (setting) => [
          setting.key,
          setting.value,
        ],
      ),
    );

  const general =
    (
      settings.general ??
      {}
    ) as {
      storeLive?:
        boolean;

      maintenanceMode?:
        boolean;
    };

  const tracking =
    normalizeTrackingConfig(
      settings.tracking,
    );

  const unavailable =
    general.storeLive === false ||
    general.maintenanceMode === true;

  return (
    <>
      <TrackingScripts
        config={
          tracking
        }
      />

      <StoreShell
        navCategories={
          navCategories
        }
        settings={
          settings
        }

        reviewRating={{
          average:
            reviewAggregate._avg.rating ??
            0,

          count:
            reviewAggregate._count._all,
        }}
      >
        {unavailable ? (
        <section className="store-maintenance">
          <div className="container store-maintenance-inner">
            <div className="eyebrow">
              GameOn Garb
            </div>

            <h1 className="display store-maintenance-title">
              We’ll be right back.
            </h1>

            <p className="muted store-maintenance-text">
              The store is receiving
              an update. Please check
              back shortly.
            </p>
          </div>
        </section>
        ) : (
          children
        )}
      </StoreShell>
    </>
  );
}