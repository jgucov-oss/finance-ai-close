"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Text,
  Spinner,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Card,
} from "@fluentui/react-components";
import { NavBar } from "@/components/NavBar";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  aiProvider: string;
  lastSyncAt: string;
  status: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setUsers(data.users || []);
        }
      })
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <NavBar isAdmin />
        <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 16px" }}>
          <Text size={400} style={{ color: "var(--colorStatusDangerForeground1)" }}>
            {error === "Forbidden"
              ? "You do not have admin access to this page."
              : error}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar isAdmin />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px", width: "100%" }}>
        <Text as="h1" size={600} weight="bold" block style={{ marginBottom: 8 }}>
          Admin Panel
        </Text>
        <Text
          size={300}
          block
          style={{ color: "var(--colorNeutralForeground2)", marginBottom: 24 }}
        >
          Overview of users who have authenticated with the AI Email Assistant.
        </Text>

        {/* Summary cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <Card style={{ padding: 20, textAlign: "center" }}>
            <Text size={700} weight="bold" block>
              {users.length}
            </Text>
            <Text size={300} style={{ color: "var(--colorNeutralForeground3)" }}>
              Total Users
            </Text>
          </Card>
          <Card style={{ padding: 20, textAlign: "center" }}>
            <Text size={700} weight="bold" block>
              {users.filter((u) => u.aiProvider === "claude").length}
            </Text>
            <Text size={300} style={{ color: "var(--colorNeutralForeground3)" }}>
              Using Claude
            </Text>
          </Card>
          <Card style={{ padding: 20, textAlign: "center" }}>
            <Text size={700} weight="bold" block>
              {users.filter((u) => u.aiProvider === "openai").length}
            </Text>
            <Text size={300} style={{ color: "var(--colorNeutralForeground3)" }}>
              Using OpenAI
            </Text>
          </Card>
          <Card style={{ padding: 20, textAlign: "center" }}>
            <Text size={700} weight="bold" block>
              {users.filter((u) => u.status === "active").length}
            </Text>
            <Text size={300} style={{ color: "var(--colorNeutralForeground3)" }}>
              Active
            </Text>
          </Card>
        </div>

        {/* Users table */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>AI Provider</TableHeaderCell>
                <TableHeaderCell>Last Sync</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Text weight="semibold">{user.name}</Text>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      color={user.aiProvider === "claude" ? "brand" : "success"}
                      appearance="tint"
                    >
                      {user.aiProvider === "claude" ? "Claude" : "GPT-4o"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Text size={200} style={{ color: "var(--colorNeutralForeground2)" }}>
                      {new Date(user.lastSyncAt).toLocaleString()}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={user.status === "active" ? "success" : "warning"}
                      appearance="filled"
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Text
                      size={300}
                      style={{ color: "var(--colorNeutralForeground3)" }}
                    >
                      No users found.
                    </Text>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
