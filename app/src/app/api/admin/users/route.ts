import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

function isAdmin(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
}

export async function GET() {
  const session = await getAuth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Stub data — replace with DB query in production
  const users = [
    {
      id: "stub-1",
      name: session.user.name,
      email: session.user.email,
      aiProvider: "claude",
      lastSyncAt: new Date().toISOString(),
      status: "active",
    },
  ];

  return NextResponse.json({ users });
}
