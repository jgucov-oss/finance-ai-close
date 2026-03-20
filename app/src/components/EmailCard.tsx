"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardFooter,
  Button,
  Spinner,
  Textarea,
  Text,
  Divider,
  Badge,
} from "@fluentui/react-components";
import {
  MailRegular,
  SendRegular,
  SparkleRegular,
  ChevronDownRegular,
  ChevronUpRegular,
} from "@fluentui/react-icons";
import { EmailMessage } from "@/types";
import { PriorityBadge } from "./PriorityBadge";
import { loadSettings } from "@/lib/settings";

interface Props {
  email: EmailMessage;
  onSent: (id: string) => void;
}

export function EmailCard({ email, onSent }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draft, setDraft] = useState(email.draft || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerateDraft() {
    const settings = loadSettings();
    if (!settings.apiKey) {
      setError("Please add your API key in Settings first.");
      return;
    }
    setDraftLoading(true);
    setError("");
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          provider: settings.aiProvider,
          apiKey: settings.apiKey,
          tone: settings.replyTone,
          bio: settings.personalBio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate draft");
      setDraft(data.draft);
      setExpanded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleSend() {
    if (!draft.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: email.id, body: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSent(true);
      onSent(email.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSending(false);
    }
  }

  const receivedDate = new Date(email.receivedAt).toLocaleString();

  return (
    <Card
      style={{
        marginBottom: 12,
        opacity: sent ? 0.5 : 1,
        transition: "opacity 0.3s",
      }}
    >
      <CardHeader
        image={<MailRegular fontSize={24} />}
        header={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text weight="semibold" size={400}>
              {email.subject}
            </Text>
            {email.priority && <PriorityBadge priority={email.priority} />}
            {email.actionRequired && (
              <Badge color="severe" appearance="outline" size="small">
                Action Required
              </Badge>
            )}
          </div>
        }
        description={
          <Text size={200} style={{ color: "var(--colorNeutralForeground3)" }}>
            {email.from} &lt;{email.fromEmail}&gt; &bull; {receivedDate}
          </Text>
        }
        action={
          <Button
            appearance="transparent"
            icon={expanded ? <ChevronUpRegular /> : <ChevronDownRegular />}
            onClick={() => setExpanded((v) => !v)}
          />
        }
      />

      {email.summary && (
        <div style={{ padding: "0 16px 8px" }}>
          <Text size={300} italic style={{ color: "var(--colorNeutralForeground2)" }}>
            {email.summary}
          </Text>
        </div>
      )}

      {expanded && (
        <>
          <Divider />
          <div style={{ padding: "12px 16px" }}>
            <Text size={300} style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {email.bodyPreview}
            </Text>
          </div>
        </>
      )}

      {draft && (
        <>
          <Divider />
          <div style={{ padding: "12px 16px" }}>
            <Text weight="semibold" size={300}>
              Draft Reply
            </Text>
            <Textarea
              value={draft}
              onChange={(_, d) => setDraft(d.value)}
              rows={6}
              style={{ width: "100%", marginTop: 8 }}
            />
          </div>
        </>
      )}

      {error && (
        <div style={{ padding: "0 16px 8px" }}>
          <Text size={200} style={{ color: "var(--colorStatusDangerForeground1)" }}>
            {error}
          </Text>
        </div>
      )}

      <CardFooter
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {!sent && !draft && (
              <Button
                appearance="secondary"
                icon={draftLoading ? <Spinner size="tiny" /> : <SparkleRegular />}
                onClick={handleGenerateDraft}
                disabled={draftLoading}
              >
                {draftLoading ? "Generating…" : "Generate Reply"}
              </Button>
            )}
            {draft && !sent && (
              <>
                <Button
                  appearance="secondary"
                  icon={<SparkleRegular />}
                  onClick={handleGenerateDraft}
                  disabled={draftLoading || sending}
                >
                  Regenerate
                </Button>
                <Button
                  appearance="primary"
                  icon={sending ? <Spinner size="tiny" /> : <SendRegular />}
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? "Sending…" : "Send Reply"}
                </Button>
              </>
            )}
            {sent && (
              <Badge color="success" appearance="filled">
                Sent
              </Badge>
            )}
          </div>
        }
      />
    </Card>
  );
}
