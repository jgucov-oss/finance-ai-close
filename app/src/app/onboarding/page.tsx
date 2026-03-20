"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  Button,
  Text,
  Input,
  Label,
  RadioGroup,
  Radio,
  Textarea,
  ProgressBar,
  Spinner,
} from "@fluentui/react-components";
import {
  MailRegular,
  PlugConnectedRegular,
  KeyRegular,
  PersonRegular,
  CheckmarkCircleRegular,
} from "@fluentui/react-icons";
import { loadSettings, saveSettings } from "@/lib/settings";
import { AiProvider } from "@/types";

const STEPS = [
  { label: "Welcome", icon: <MailRegular fontSize={24} /> },
  { label: "Connect Email", icon: <PlugConnectedRegular fontSize={24} /> },
  { label: "Choose AI", icon: <KeyRegular fontSize={24} /> },
  { label: "Personalize", icon: <PersonRegular fontSize={24} /> },
  { label: "Done", icon: <CheckmarkCircleRegular fontSize={24} /> },
];

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<AiProvider>("claude");
  const [apiKey, setApiKey] = useState("");
  const [bio, setBio] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");

  if (status === "loading") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Spinner size="large" />
      </div>
    );
  }

  if (!session) {
    router.push("/");
    return null;
  }

  // Skip onboarding if already complete
  const existing = loadSettings();
  if (existing.onboardingComplete && step === 0) {
    router.push("/inbox");
    return null;
  }

  function next() {
    if (step === 2 && !apiKey.trim()) {
      setApiKeyError("Please enter your API key to continue.");
      return;
    }
    setApiKeyError("");
    setStep((s) => s + 1);
  }

  function finish() {
    const settings = loadSettings();
    saveSettings({
      ...settings,
      aiProvider: provider,
      apiKey: apiKey.trim(),
      personalBio: bio.trim(),
      onboardingComplete: true,
    });
    router.push("/inbox");
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--colorNeutralBackground2)",
        padding: 24,
      }}
    >
      <Card style={{ maxWidth: 560, width: "100%", padding: 40 }}>
        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color:
                  i === step
                    ? "var(--colorBrandBackground)"
                    : i < step
                    ? "var(--colorStatusSuccessForeground1)"
                    : "var(--colorNeutralForeground3)",
                fontSize: 13,
                fontWeight: i === step ? 600 : 400,
              }}
            >
              {s.icon}
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    width: 24,
                    height: 1,
                    background:
                      i < step
                        ? "var(--colorBrandBackground)"
                        : "var(--colorNeutralStroke1)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <ProgressBar
          value={progress}
          max={100}
          style={{ marginBottom: 32 }}
        />

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div>
            <Text
              as="h2"
              size={600}
              weight="bold"
              block
              style={{ marginBottom: 12 }}
            >
              Welcome, {session.user?.name?.split(" ")[0]}!
            </Text>
            <Text
              size={400}
              block
              style={{
                color: "var(--colorNeutralForeground2)",
                marginBottom: 24,
              }}
            >
              Let&apos;s set up your AI Email Assistant in 3 quick steps. It
              only takes about a minute.
            </Text>
            <ul
              style={{
                paddingLeft: 20,
                color: "var(--colorNeutralForeground2)",
                lineHeight: 2,
              }}
            >
              <li>Connect your Outlook inbox (already done via Microsoft sign-in)</li>
              <li>Choose your AI model and enter your API key</li>
              <li>Add a short bio so the AI writes in your voice</li>
            </ul>
          </div>
        )}

        {/* Step 1: Connect email */}
        {step === 1 && (
          <div>
            <Text
              as="h2"
              size={600}
              weight="bold"
              block
              style={{ marginBottom: 12 }}
            >
              Outlook Connected
            </Text>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 16,
                background: "var(--colorStatusSuccessBackground1)",
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <CheckmarkCircleRegular
                fontSize={24}
                style={{ color: "var(--colorStatusSuccessForeground1)" }}
              />
              <div>
                <Text weight="semibold" block>
                  {session.user?.name}
                </Text>
                <Text
                  size={200}
                  style={{ color: "var(--colorNeutralForeground2)" }}
                >
                  {session.user?.email}
                </Text>
              </div>
            </div>
            <Text
              size={300}
              style={{ color: "var(--colorNeutralForeground2)" }}
            >
              Your Outlook account is connected via Microsoft OAuth. The app
              has permission to read your inbox and send replies on your behalf.
              Your email content is never stored on our servers.
            </Text>
          </div>
        )}

        {/* Step 2: Choose AI + API key */}
        {step === 2 && (
          <div>
            <Text
              as="h2"
              size={600}
              weight="bold"
              block
              style={{ marginBottom: 20 }}
            >
              Choose Your AI
            </Text>
            <Label weight="semibold" style={{ display: "block", marginBottom: 8 }}>
              AI Provider
            </Label>
            <RadioGroup
              value={provider}
              onChange={(_, d) => setProvider(d.value as AiProvider)}
              style={{ marginBottom: 20 }}
            >
              <Radio value="claude" label="Claude (Anthropic) — claude-sonnet-4-6" />
              <Radio value="openai" label="OpenAI — GPT-4o" />
            </RadioGroup>

            <Label weight="semibold" style={{ display: "block", marginBottom: 8 }}>
              {provider === "claude" ? "Anthropic" : "OpenAI"} API Key
            </Label>
            <Input
              type="password"
              placeholder={
                provider === "claude"
                  ? "sk-ant-api03-..."
                  : "sk-proj-..."
              }
              value={apiKey}
              onChange={(_, d) => setApiKey(d.value)}
              style={{ width: "100%", marginBottom: 4 }}
            />
            {apiKeyError && (
              <Text
                size={200}
                style={{ color: "var(--colorStatusDangerForeground1)" }}
              >
                {apiKeyError}
              </Text>
            )}
            <Text
              size={200}
              block
              style={{
                color: "var(--colorNeutralForeground3)",
                marginTop: 8,
              }}
            >
              Your API key is stored only in your browser (localStorage) and
              is never sent to our servers.
            </Text>
          </div>
        )}

        {/* Step 3: Personalize */}
        {step === 3 && (
          <div>
            <Text
              as="h2"
              size={600}
              weight="bold"
              block
              style={{ marginBottom: 8 }}
            >
              Personalize Your Replies
            </Text>
            <Text
              size={300}
              block
              style={{
                color: "var(--colorNeutralForeground2)",
                marginBottom: 20,
              }}
            >
              Tell the AI a bit about yourself so it writes replies in your
              voice. This is optional.
            </Text>
            <Label weight="semibold" style={{ display: "block", marginBottom: 8 }}>
              Your role and context (optional)
            </Label>
            <Textarea
              placeholder="e.g. I'm a product manager at Acme Corp. I work with engineering and sales teams. I prefer concise, direct communication."
              value={bio}
              onChange={(_, d) => setBio(d.value)}
              rows={5}
              style={{ width: "100%" }}
            />
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div style={{ textAlign: "center" }}>
            <CheckmarkCircleRegular
              fontSize={56}
              style={{
                color: "var(--colorStatusSuccessForeground1)",
                marginBottom: 16,
              }}
            />
            <Text
              as="h2"
              size={600}
              weight="bold"
              block
              style={{ marginBottom: 12 }}
            >
              You&apos;re all set!
            </Text>
            <Text
              size={400}
              block
              style={{
                color: "var(--colorNeutralForeground2)",
                marginBottom: 24,
              }}
            >
              Click &quot;Go to Inbox&quot; to sync your unread emails and start
              generating summaries and draft replies.
            </Text>
          </div>
        )}

        {/* Navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 32,
          }}
        >
          {step > 0 && step < 4 ? (
            <Button appearance="secondary" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            <div />
          )}
          {step < 3 && (
            <Button appearance="primary" onClick={next}>
              {step === 0 ? "Get Started" : "Next"}
            </Button>
          )}
          {step === 3 && (
            <Button appearance="primary" onClick={() => { finish(); setStep(4); }}>
              Save & Continue
            </Button>
          )}
          {step === 4 && (
            <Button appearance="primary" onClick={() => router.push("/inbox")}>
              Go to Inbox
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
