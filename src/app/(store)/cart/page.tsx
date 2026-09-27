import { CartClient } from "@/components/cart/cart-client";
import { getProducts } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function CartPage() {
  const recommended = await getProducts({ trending: true, take: 4 });
  return <CartClient recommended={recommended} />;
}

