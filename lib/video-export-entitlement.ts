import "server-only";

import { isAdminSession } from "./admin-guard";

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
