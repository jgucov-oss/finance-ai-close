"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Button,
  Spinner,
  Text,
  Badge,
  Divider,
} from "@fluentui/react-components";
import {
  ArrowSyncRegular,
  FilterRegular,
} from "@fluentui/react-icons";
import { EmailCard } from "@/components/EmailCard";
import { NavBar } from "@/components/NavBar";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import { loadSettings } from "@/lib/settings";
import { EmailMessage, Priority } from "@/types";

const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
};

type FilterState = "all" | Priority;

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterState>("all");

  if (status === "loading") {
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

  const settings = loadSettings();
  if (!settings.onboardingComplete) {
    router.push("/onboarding");
    return null;
  }

  async function syncAndSummarize() {
    if (!settings.apiKey) {
      setError("No API key found. Please update your settings.");
      return;
    }
    setError("");
    setSyncing(true);
    setEmails([]);

    let fetched: EmailMessage[] = [];
    try {
      const res = await fetch("/api/emails");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch emails");
      fetched = data.emails as EmailMessage[];
      setSyncedAt(data.syncedAt);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch emails");
      setSyncing(false);
      return;
    }
    setSyncing(false);
    setSummarizing(true);

    // Summarize all emails in parallel (batched to avoid rate limits)
    const BATCH = 5;
    const results: EmailMessage[] = [...fetched];
    for (let i = 0; i < fetched.length; i += BATCH) {
      const batch = fetched.slice(i, i + BATCH);
      const summaries = await Promise.allSettled(
        batch.map(async (email) => {
          const res = await fetch("/api/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              provider: settings.aiProvider,
              apiKey: settings.apiKey,
            }),
          });
          const data = await res.json();
          return { id: email.id, ...data };
        })
      );
      summaries.forEach((r, idx) => {
        const email = batch[idx];
        if (r.status === "fulfilled") {
          const j = results.findIndex((e) => e.id === email.id);
          if (j !== -1) {
            results[j] = {
              ...results[j],
              summary: r.value.summary,
              priority: r.value.priority,
              actionRequired: r.value.actionRequired,
            };
          }
        }
      });
      // Update UI after each batch
      setEmails(
        [...results].sort(
          (a, b) =>
            PRIORITY_ORDER[a.priority ?? "normal"] -
            PRIORITY_ORDER[b.priority ?? "normal"]
        )
      );
    }
    setSummarizing(false);
  }

  const handleSent = useCallback((id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const displayed = emails.filter(
    (e) => filter === "all" || e.priority === filter
  );

  const counts = {
    urgent: emails.filter((e) => e.priority === "urgent").length,
    high: emails.filter((e) => e.priority === "high").length,
    normal: emails.filter((e) => e.priority === "normal").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px", width: "100%" }}>
        <PrivacyBanner />

        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <Text as="h1" size={600} weight="bold">
              Inbox
            </Text>
            {syncedAt && (
              <Text
                size={200}
                block
                style={{ color: "var(--colorNeutralForeground3)", marginTop: 2 }}
              >
                Last synced: {new Date(syncedAt).toLocaleTimeString()}
              </Text>
            )}
          </div>
          <Button
            appearance="primary"
            icon={syncing || summarizing ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
            onClick={syncAndSummarize}
            disabled={syncing || summarizing}
          >
            {syncing ? "Fetching emails…" : summarizing ? "Summarizing…" : "Sync & Summarize"}
          </Button>
        </div>

        {error && (
          <Text
            size={300}
            block
            style={{
              color: "var(--colorStatusDangerForeground1)",
              marginBottom: 12,
            }}
          >
            {error}
          </Text>
        )}

        {/* Filter chips */}
        {emails.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <FilterRegular style={{ alignSelf: "center", color: "var(--colorNeutralForeground3)" }} />
            {(["all", "urgent", "high", "normal"] as FilterState[]).map((f) => (
              <Button
                key={f}
                size="small"
                appearance={filter === f ? "primary" : "secondary"}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? `All (${emails.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})`}
              </Button>
            ))}
          </div>
        )}

        <Divider style={{ marginBottom: 16 }} />

        {/* Email cards */}
        {displayed.length === 0 && !syncing && !summarizing && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Text size={400} style={{ color: "var(--colorNeutralForeground3)" }}>
              {emails.length === 0
                ? 'Click "Sync & Summarize" to load your unread emails.'
                : "No emails match the selected filter."}
            </Text>
          </div>
        )}

        {displayed.map((email) => (
          <EmailCard key={email.id} email={email} onSent={handleSent} />
        ))}

        {(syncing || summarizing) && emails.length === 0 && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spinner size="medium" label={syncing ? "Fetching emails…" : "Summarizing with AI…"} />
          </div>
        )}
      </div>
    </div>
  );
}
