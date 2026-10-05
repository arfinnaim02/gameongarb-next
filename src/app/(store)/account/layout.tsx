import {
  AccountShell,
} from "@/components/account/account-shell";

import {
  getCurrentUser,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const user =
    await getCurrentUser();

  /*
   * Login / register / password-reset
   * screens must not show the customer
   * dashboard sidebar.
   */
  if (
    !user?.customer
  ) {
    return (
      <>
        {
          children
        }
      </>
    );
  }

  return (
    <AccountShell
      user={{
        name:
          user.name,

        email:
          user.email,

        phone:
          user.phone,
      }}
    >
      {
        children
      }
    </AccountShell>
  );
}