import "server-only";

import { isAdminSession } from "./admin-guard";
import { createClient } from "./supabase-server-component";
import { normaliseEmail } from "./video-export-config";

/** Delivery uses only the verified session address, never a submitted address. */
export async function videoDirectRecipient(): Promise<string | null> {
  if (!(await videoDirectAccess())) return null;
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    return user?.email_confirmed_at ? normaliseEmail(user.email) : null;
  } catch { return null; }
}

// Who may start a render without the mail round trip.
//
// A LOGIN IS NOT AN ENTITLEMENT. Today the only role in the project is the
// admin list (ADMIN_EMAILS). A future premium plan plugs in HERE — the routes
// and the menu ask this one function and never look at the user themselves.
export async function videoDirectAccess(): Promise<boolean> {
  try {
    return await isAdminSession();
  } catch {
    return false;
  }
}
