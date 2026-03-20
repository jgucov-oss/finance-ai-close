/**
 * User settings are stored in localStorage on the client only.
 * Email content is never persisted server-side.
 */
import { UserSettings } from "@/types";

const KEY = "ai_email_settings";

export const DEFAULT_SETTINGS: UserSettings = {
  aiProvider: "claude",
  apiKey: "",
  replyTone: "professional",
  personalBio: "",
  ignoreList: "",
  onboardingComplete: false,
};

export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function clearSettings(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
