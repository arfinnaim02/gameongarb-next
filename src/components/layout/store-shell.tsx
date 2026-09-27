import { StoreFooter } from "@/components/layout/store-footer";
import { StoreHeader } from "@/components/layout/store-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export function StoreShell({
  children,
  navCategories,
  settings,
}: {
  children: React.ReactNode;
  navCategories: { name: string; slug: string }[];
  settings: Record<string, unknown>;
}) {
  return (
    <>
      <StoreHeader navCategories={navCategories} />

      <main className="store-main">{children}</main>

      <StoreFooter settings={settings} />

      <MobileBottomNav />
    </>
  );
}
