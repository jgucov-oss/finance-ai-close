"use client";

import { useState } from "react";
import {
  MessageBar,
  MessageBarBody,
  MessageBarActions,
  Button,
} from "@fluentui/react-components";
import { ShieldCheckmarkRegular } from "@fluentui/react-icons";

export function PrivacyBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <MessageBar intent="info" style={{ marginBottom: 16 }}>
      <MessageBarBody>
        <ShieldCheckmarkRegular style={{ marginRight: 6 }} />
        <strong>Privacy notice:</strong> Your email content is processed
        ephemerally by your chosen AI provider and is never stored on our
        servers. Your API key is stored only in your browser.
      </MessageBarBody>
      <MessageBarActions>
        <Button appearance="transparent" onClick={() => setDismissed(true)}>
          Dismiss
        </Button>
      </MessageBarActions>
    </MessageBar>
  );
}
