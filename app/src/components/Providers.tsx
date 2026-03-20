"use client";

import { SessionProvider } from "next-auth/react";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
    </SessionProvider>
  );
}
