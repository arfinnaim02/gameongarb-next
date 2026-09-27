import { StoreShell } from "@/components/layout/store-shell";

import { getNavigationCategories } from "@/lib/catalog";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    navCategories,
    settingsRows,
  ] = await Promise.all([
    getNavigationCategories(),

    db.storeSetting.findMany({
      where: {
        key: {
          in: [
            "general",
            "contact",
            "social",
          ],
        },
      },

      select: {
        key: true,
        value: true,
      },
    }),
  ]);

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
    (settings.general ??
      {}) as {
      storeLive?: boolean;
      maintenanceMode?: boolean;
    };

  const unavailable =
    general.storeLive === false ||
    general.maintenanceMode === true;

  return (
    <StoreShell
      navCategories={
        navCategories
      }
      settings={settings}
    >
      {unavailable ? (
        <section className="store-maintenance">
          <div className="container store-maintenance-inner">
            <div className="eyebrow">
              Game On Garb
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
  );
}