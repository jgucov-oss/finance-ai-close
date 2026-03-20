import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { fetchUnreadEmails } from "@/lib/graph";

export async function GET() {
  const session = await getAuth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emails = await fetchUnreadEmails(session.accessToken);
  // Email content is returned to the client and never persisted server-side.
  return NextResponse.json({ emails, syncedAt: new Date().toISOString() });
}
