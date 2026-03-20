"use client";

import { Badge } from "@fluentui/react-components";
import { Priority } from "@/types";

const CONFIG: Record<Priority, { color: "danger" | "warning" | "informative"; label: string }> = {
  urgent: { color: "danger", label: "Urgent" },
  high: { color: "warning", label: "High" },
  normal: { color: "informative", label: "Normal" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { color, label } = CONFIG[priority];
  return (
    <Badge color={color} appearance="filled" size="small">
      {label}
    </Badge>
  );
}
