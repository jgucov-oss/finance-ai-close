export type AiProvider = "claude" | "openai";
export type Priority = "urgent" | "high" | "normal";
export type ReplyTone = "professional" | "friendly" | "concise" | "detailed";

export interface UserSettings {
  aiProvider: AiProvider;
  apiKey: string;
  replyTone: ReplyTone;
  personalBio: string;
  ignoreList: string; // comma-separated senders/keywords
  onboardingComplete: boolean;
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  receivedAt: string;
  bodyPreview: string;
  body: string;
  isRead: boolean;
  conversationId: string;
  priority?: Priority;
  actionRequired?: boolean;
  summary?: string;
  draft?: string;
}

export interface SyncResult {
  emails: EmailMessage[];
  syncedAt: string;
}
