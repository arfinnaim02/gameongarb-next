import {
  notFound,
} from "next/navigation";

import {
  CustomerManager,
} from "@/components/admin/customer-manager";

import {
  db,
} from "@/lib/db";

import {
  hasPermission,
} from "@/lib/business";

import {
  requireAdmin,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

export default async function CustomersPage() {
  const user =
    await requireAdmin();

  if (
    !hasPermission(
      user.role,
      "customers",
    )
  ) {
    notFound();
  }

  const customers =
    await db.customer.findMany({
      include: {
        user: {
          select: {
            id:
              true,

            status:
              true,

            createdAt:
              true,
          },
        },

        addresses: {
          orderBy: [
            {
              isDefault:
                "desc",
            },

            {
              createdAt:
                "desc",
            },
          ],
        },

        orders: {
          orderBy: {
            createdAt:
              "desc",
          },

          select: {
            id:
              true,

            number:
              true,

            total:
              true,

            status:
              true,

            paymentStatus:
              true,

            paymentMethod:
              true,

            createdAt:
              true,
          },
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },
    });

  const rows =
    customers.map(
      (
        customer,
      ) => {
        const completedOrders =
          customer.orders.filter(
            (
              order,
            ) =>
              order.status !==
                "CANCELLED" &&
              order.status !==
                "FAILED_DELIVERY",
          );

        const totalSpent =
          completedOrders.reduce(
            (
              total,
              order,
            ) =>
              total +
              Number(
                order.total,
              ),
            0,
          );

        const deliveredOrders =
          completedOrders.filter(
            (
              order,
            ) =>
              order.status ===
              "DELIVERED",
          ).length;

        return {
          id:
            customer.id,

          userId:
            customer.userId,

          name:
            customer.name,

          email:
            customer.email,

          phone:
            customer.phone,

          status:
            customer.status,

          notes:
            customer.notes,

          registered:
            Boolean(
              customer.userId,
            ),

          createdAt:
            customer.createdAt.toISOString(),

          updatedAt:
            customer.updatedAt.toISOString(),

          orderCount:
            customer.orders.length,

          validOrderCount:
            completedOrders.length,

          deliveredOrders,

          addressCount:
            customer.addresses.length,

          totalSpent,

          lastOrderAt:
            customer.orders[0]
              ?.createdAt
              .toISOString() ??
            null,

          addresses:
            customer.addresses.map(
              (
                address,
              ) => ({
                id:
                  address.id,

                label:
                  address.label,

                fullName:
                  address.fullName,

                phone:
                  address.phone,

                email:
                  address.email,

                division:
                  address.division,

                district:
                  address.district,

                thana:
                  address.thana,

                address:
                  address.address,

                isDefault:
                  address.isDefault,

                createdAt:
                  address.createdAt.toISOString(),
              }),
            ),

          orders:
            customer.orders
              .slice(
                0,
                15,
              )
              .map(
                (
                  order,
                ) => ({
                  id:
                    order.id,

                  number:
                    order.number,

                  total:
                    Number(
                      order.total,
                    ),

                  status:
                    order.status,

                  paymentStatus:
                    order.paymentStatus,

                  paymentMethod:
                    order.paymentMethod,

                  createdAt:
                    order.createdAt.toISOString(),
                }),
              ),
        };
      },
    );

  return (
    <CustomerManager
      initialCustomers={
        rows
      }
    />
  );
}