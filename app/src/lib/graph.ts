import { EmailMessage } from "@/types";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function graphFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function fetchUnreadEmails(
  accessToken: string
): Promise<EmailMessage[]> {
  const select =
    "id,subject,from,receivedDateTime,bodyPreview,body,isRead,conversationId";
  const filter = "isRead eq false";
  const orderBy = "receivedDateTime desc";
  const top = 50;

  const data = await graphFetch(
    accessToken,
    `/me/mailFolders/inbox/messages?$filter=${encodeURIComponent(filter)}&$select=${select}&$orderby=${encodeURIComponent(orderBy)}&$top=${top}`
  );

  return (data.value || []).map((m: Record<string, unknown>) => {
    const fromObj = m.from as { emailAddress: { name: string; address: string } };
    return {
      id: m.id as string,
      subject: (m.subject as string) || "(no subject)",
      from: fromObj?.emailAddress?.name || "",
      fromEmail: fromObj?.emailAddress?.address || "",
      receivedAt: m.receivedDateTime as string,
      bodyPreview: (m.bodyPreview as string) || "",
      body: ((m.body as { content: string })?.content) || "",
      isRead: m.isRead as boolean,
      conversationId: m.conversationId as string,
    };
  });
}

export async function sendReply(
  accessToken: string,
  messageId: string,
  body: string
): Promise<void> {
  await graphFetch(accessToken, `/me/messages/${messageId}/reply`, {
    method: "POST",
    body: JSON.stringify({
      message: {},
      comment: body,
    }),
  });
}

export async function markAsRead(
  accessToken: string,
  messageId: string
): Promise<void> {
  await graphFetch(accessToken, `/me/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ isRead: true }),
  });
}
