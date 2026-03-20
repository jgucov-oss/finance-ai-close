"use client";

import { useSession, signOut } from "next-auth/react";
import {
  Toolbar,
  ToolbarButton,
  Text,
  Avatar,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Divider,
} from "@fluentui/react-components";
import {
  MailRegular,
  SettingsRegular,
  PeopleRegular,
  SignOutRegular,
} from "@fluentui/react-icons";
import Link from "next/link";

export function NavBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: session } = useSession();

  return (
    <div
      style={{
        background: "var(--colorBrandBackground)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 48,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <MailRegular fontSize={22} color="white" />
        <Text weight="semibold" size={400} style={{ color: "white" }}>
          AI Email Assistant
        </Text>
      </div>

      <Toolbar>
        <Link href="/inbox" style={{ textDecoration: "none" }}>
          <ToolbarButton appearance="subtle" icon={<MailRegular />} style={{ color: "white" }}>
            Inbox
          </ToolbarButton>
        </Link>
        <Link href="/settings" style={{ textDecoration: "none" }}>
          <ToolbarButton appearance="subtle" icon={<SettingsRegular />} style={{ color: "white" }}>
            Settings
          </ToolbarButton>
        </Link>
        {isAdmin && (
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <ToolbarButton appearance="subtle" icon={<PeopleRegular />} style={{ color: "white" }}>
              Admin
            </ToolbarButton>
          </Link>
        )}

        <Divider vertical style={{ height: 24, background: "rgba(255,255,255,0.3)" }} />

        <Menu>
          <MenuTrigger>
            <ToolbarButton
              appearance="subtle"
              style={{ color: "white" }}
              icon={
                <Avatar
                  name={session?.user?.name || "User"}
                  image={{ src: session?.user?.image || "" }}
                  size={28}
                />
              }
            >
              {session?.user?.name?.split(" ")[0]}
            </ToolbarButton>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem disabled>
                <Text size={200} style={{ color: "var(--colorNeutralForeground3)" }}>
                  {session?.user?.email}
                </Text>
              </MenuItem>
              <MenuItem
                icon={<SignOutRegular />}
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign out
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </Toolbar>
    </div>
  );
}
