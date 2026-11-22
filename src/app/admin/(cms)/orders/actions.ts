"use server";

import { redirect } from "next/navigation";
import { cancelAdminOrder } from "@/modules/orders";

export async function cancelOrderAction(orderId: string) {
  let result: { released: boolean };
  try {
    result = await cancelAdminOrder(orderId);
  } catch {
    redirect(`/admin/orders/${encodeURIComponent(orderId)}?result=failed`);
  }
  redirect(`/admin/orders/${encodeURIComponent(orderId)}?result=${result.released ? "canceled" : "ended"}`);
}
