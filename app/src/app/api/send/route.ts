import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { sendReply, markAsRead } from "@/lib/graph";

export async function POST(req: NextRequest) {
  const session = await getAuth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId, body } = (await req.json()) as {
    messageId: string;
    body: string;
  };

  if (!messageId || !body?.trim()) {
    return NextResponse.json(
      { error: "messageId and body are required" },
      { status: 400 }
    );
  }

  await sendReply(session.accessToken, messageId, body);
  await markAsRead(session.accessToken, messageId);

  return NextResponse.json({ success: true });
}
