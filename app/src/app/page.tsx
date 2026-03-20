"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Button,
  Spinner,
  Text,
  Card,
} from "@fluentui/react-components";
import { MailRegular, ShieldCheckmarkRegular } from "@fluentui/react-icons";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/inbox");
    }
  }, [status, router]);

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
        <Spinner size="large" label="Loading…" />
      </div>
    );
  }

  if (session) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--colorNeutralBackground2)",
        padding: 24,
      }}
    >
      <Card
        style={{
          maxWidth: 480,
          width: "100%",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <MailRegular fontSize={56} color="var(--colorBrandBackground)" />
        </div>
        <Text
          as="h1"
          size={700}
          weight="bold"
          block
          style={{ marginBottom: 8 }}
        >
          AI Email Assistant
        </Text>
        <Text
          size={400}
          block
          style={{
            color: "var(--colorNeutralForeground2)",
            marginBottom: 32,
          }}
        >
          Automatically summarize your unread Outlook emails and generate
          professional draft replies using Claude or GPT-4o.
        </Text>

        <Button
          appearance="primary"
          size="large"
          onClick={() =>
            signIn("azure-ad", { callbackUrl: "/onboarding" })
          }
          style={{ width: "100%", marginBottom: 24 }}
        >
          Sign in with Microsoft
        </Button>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            background: "var(--colorNeutralBackground3)",
            borderRadius: 8,
            padding: 12,
            textAlign: "left",
          }}
        >
          <ShieldCheckmarkRegular
            fontSize={18}
            style={{
              color: "var(--colorBrandBackground)",
              flexShrink: 0,
              marginTop: 2,
            }}
          />
          <Text
            size={200}
            style={{ color: "var(--colorNeutralForeground2)" }}
          >
            Your email content is processed ephemerally and never stored on
            our servers. Your AI API key is stored only in your browser.
          </Text>
        </div>
      </Card>
    </div>
  );
}
