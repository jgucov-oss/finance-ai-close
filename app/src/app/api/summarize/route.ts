import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { summarizeEmail } from "@/lib/ai";
import { AiProvider, EmailMessage } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getAuth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, provider, apiKey } = (await req.json()) as {
    email: EmailMessage;
    provider: AiProvider;
    apiKey: string;
  };

  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 400 });
  }

  const result = await summarizeEmail(email, provider, apiKey);
  // Email content is processed in-memory and never persisted.
  return NextResponse.json(result);
}
