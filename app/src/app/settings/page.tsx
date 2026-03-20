"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Text,
  Input,
  Label,
  RadioGroup,
  Radio,
  Textarea,
  Divider,
  Spinner,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import { NavBar } from "@/components/NavBar";
import { loadSettings, saveSettings } from "@/lib/settings";
import { UserSettings, AiProvider, ReplyTone } from "@/types";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [ignoreInput, setIgnoreInput] = useState("");

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setIgnoreInput(s.ignoreList);
  }, []);

  if (status === "loading" || !settings) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spinner size="large" />
      </div>
    );
  }
  if (!session) {
    router.push("/");
    return null;
  }

  function update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((s) => s ? { ...s, [key]: value } : s);
    setSaved(false);
  }

  function handleSave() {
    if (!settings) return;
    saveSettings({ ...settings, ignoreList: ignoreInput });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px", width: "100%" }}>
        <Text as="h1" size={600} weight="bold" block style={{ marginBottom: 24 }}>
          Settings
        </Text>

        {saved && (
          <MessageBar intent="success" style={{ marginBottom: 16 }}>
            <MessageBarBody>Settings saved successfully.</MessageBarBody>
          </MessageBar>
        )}

        {/* AI Provider */}
        <Card style={{ marginBottom: 16, padding: 24 }}>
          <Text weight="semibold" size={400} block style={{ marginBottom: 16 }}>
            AI Provider
          </Text>
          <RadioGroup
            value={settings.aiProvider}
            onChange={(_, d) => update("aiProvider", d.value as AiProvider)}
            style={{ marginBottom: 20 }}
          >
            <Radio value="claude" label="Claude (Anthropic) — claude-sonnet-4-6" />
            <Radio value="openai" label="OpenAI — GPT-4o" />
          </RadioGroup>

          <Label weight="semibold" style={{ display: "block", marginBottom: 8 }}>
            API Key
          </Label>
          <Input
            type="password"
            placeholder={
              settings.aiProvider === "claude" ? "sk-ant-api03-…" : "sk-proj-…"
            }
            value={settings.apiKey}
            onChange={(_, d) => update("apiKey", d.value)}
            style={{ width: "100%" }}
          />
          <Text
            size={200}
            block
            style={{ color: "var(--colorNeutralForeground3)", marginTop: 6 }}
          >
            Stored in your browser only — never sent to our servers.
          </Text>
        </Card>

        {/* Reply Tone */}
        <Card style={{ marginBottom: 16, padding: 24 }}>
          <Text weight="semibold" size={400} block style={{ marginBottom: 16 }}>
            Default Reply Tone
          </Text>
          <RadioGroup
            value={settings.replyTone}
            onChange={(_, d) => update("replyTone", d.value as ReplyTone)}
          >
            <Radio value="professional" label="Professional / Formal — standard business English" />
            <Radio value="friendly" label="Friendly / Casual — warm, conversational" />
            <Radio value="concise" label="Concise / Short — 2–4 sentences max" />
            <Radio value="detailed" label="Detailed / Thorough — full context and explanation" />
          </RadioGroup>
        </Card>

        {/* Personal Bio */}
        <Card style={{ marginBottom: 16, padding: 24 }}>
          <Text weight="semibold" size={400} block style={{ marginBottom: 8 }}>
            Personal Context for the AI
          </Text>
          <Text
            size={300}
            block
            style={{ color: "var(--colorNeutralForeground2)", marginBottom: 12 }}
          >
            Describe your role and communication style so the AI writes in your
            voice.
          </Text>
          <Textarea
            placeholder="e.g. I'm a senior product manager at Acme Corp. I work closely with engineering and sales. I prefer direct, respectful communication."
            value={settings.personalBio}
            onChange={(_, d) => update("personalBio", d.value)}
            rows={4}
            style={{ width: "100%" }}
          />
        </Card>

        {/* Ignore List */}
        <Card style={{ marginBottom: 24, padding: 24 }}>
          <Text weight="semibold" size={400} block style={{ marginBottom: 8 }}>
            Ignore List
          </Text>
          <Text
            size={300}
            block
            style={{ color: "var(--colorNeutralForeground2)", marginBottom: 12 }}
          >
            Comma-separated list of sender email addresses or keywords. Emails
            matching these will be skipped.
          </Text>
          <Textarea
            placeholder="noreply@example.com, newsletter, marketing@"
            value={ignoreInput}
            onChange={(_, d) => setIgnoreInput(d.value)}
            rows={3}
            style={{ width: "100%" }}
          />
        </Card>

        <Divider style={{ marginBottom: 24 }} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Button appearance="secondary" onClick={() => router.push("/inbox")}>
            Cancel
          </Button>
          <Button appearance="primary" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
