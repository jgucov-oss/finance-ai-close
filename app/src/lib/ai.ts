import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { AiProvider, EmailMessage, Priority, ReplyTone } from "@/types";

const TONE_INSTRUCTIONS: Record<ReplyTone, string> = {
  professional:
    "Use formal, professional business English appropriate for clients and leadership.",
  friendly:
    "Use a warm, conversational tone suitable for internal team communication.",
  concise: "Keep the reply very brief — 2 to 4 sentences maximum.",
  detailed:
    "Write a thorough reply with full context, reasoning, and explanation.",
};

function buildSummarizePrompt(email: EmailMessage): string {
  return `You are an executive email assistant. Analyze the following email and return a JSON object with exactly these fields:
{
  "summary": "<2-3 sentence summary of the email's key points>",
  "priority": "<one of: urgent, high, normal>",
  "actionRequired": <true or false>
}

Priority rules:
- urgent: deadline today/tomorrow, emergency, escalation, executive/board communication
- high: decision needed, meeting request, client issue, time-sensitive (this week)
- normal: FYI, newsletters, updates, low-stakes conversations

Email:
From: ${email.from} <${email.fromEmail}>
Subject: ${email.subject}
Received: ${email.receivedAt}
Body:
${email.body.substring(0, 3000)}

Return ONLY valid JSON. No markdown, no explanation.`;
}

function buildDraftPrompt(
  email: EmailMessage,
  tone: ReplyTone,
  bio: string
): string {
  const toneInstr = TONE_INSTRUCTIONS[tone];
  const bioContext = bio
    ? `Context about the sender of this reply: ${bio}`
    : "";
  return `You are an expert email ghostwriter. Write a reply to the email below.

${bioContext}
Tone instruction: ${toneInstr}

Email to reply to:
From: ${email.from} <${email.fromEmail}>
Subject: ${email.subject}
Body:
${email.body.substring(0, 3000)}

Write only the reply body text. Do not include subject lines, greetings headers, or signatures. Start directly with the reply content.`;
}

async function callClaude(
  apiKey: string,
  prompt: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content[0];
  return block.type === "text" ? block.text : "";
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
  });
  return res.choices[0]?.message?.content || "";
}

async function callAI(
  provider: AiProvider,
  apiKey: string,
  prompt: string
): Promise<string> {
  if (provider === "claude") return callClaude(apiKey, prompt);
  return callOpenAI(apiKey, prompt);
}

export async function summarizeEmail(
  email: EmailMessage,
  provider: AiProvider,
  apiKey: string
): Promise<{ summary: string; priority: Priority; actionRequired: boolean }> {
  const raw = await callAI(provider, apiKey, buildSummarizePrompt(email));
  try {
    const parsed = JSON.parse(raw.trim());
    return {
      summary: parsed.summary || "No summary available.",
      priority: (["urgent", "high", "normal"].includes(parsed.priority)
        ? parsed.priority
        : "normal") as Priority,
      actionRequired: Boolean(parsed.actionRequired),
    };
  } catch {
    return { summary: raw.trim(), priority: "normal", actionRequired: false };
  }
}

export async function generateDraft(
  email: EmailMessage,
  provider: AiProvider,
  apiKey: string,
  tone: ReplyTone,
  bio: string
): Promise<string> {
  return callAI(provider, apiKey, buildDraftPrompt(email, tone, bio));
}
