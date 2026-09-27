import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/session";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  return (
    <AdminShell name={user.name} role={user.role}>
      {children}
    </AdminShell>
  );
}

