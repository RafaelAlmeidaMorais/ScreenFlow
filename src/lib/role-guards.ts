import { auth } from "./auth";
import { redirect } from "next/navigation";

/**
 * Ensures user is authenticated AND not a PRICE_EDITOR.
 * PRICE_EDITOR users are restricted to the /dashboard/prices page.
 */
export async function requireNotPriceEditor() {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.role === "PRICE_EDITOR") {
    redirect("/dashboard/prices");
  }
}

/**
 * Ensures user is authenticated AND has admin privileges (COMPANY_ADMIN or superAdmin).
 * Used for pages restricted to admins only.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.isSuperAdmin || session.user.role === "COMPANY_ADMIN";
  if (!isAdmin) {
    redirect("/dashboard/prices");
  }
}

/**
 * Ensures user is a super admin. Used for super-admin-only pages.
 */
export async function requireSuperAdmin() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!session.user.isSuperAdmin) {
    redirect("/dashboard/prices");
  }
}
