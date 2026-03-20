import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { generateDraft } from "@/lib/ai";
import { AiProvider, EmailMessage, ReplyTone } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getAuth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, provider, apiKey, tone, bio } = (await req.json()) as {
    email: EmailMessage;
    provider: AiProvider;
    apiKey: string;
    tone: ReplyTone;
    bio: string;
  };

  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 400 });
  }

  const draft = await generateDraft(email, provider, apiKey, tone, bio);
  // Email content and draft are processed in-memory and never persisted.
  return NextResponse.json({ draft });
}
