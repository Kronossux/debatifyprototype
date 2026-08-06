import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/community";

const LABEL: Record<string, string> = {
  founder: "Founder & admin",
  admin: "Admin",
  moderator: "Moderator",
};

/** Gold-rimmed shield medallion shown next to founder/admin usernames. */
export function RoleBadge({
  role,
  className,
}: {
  role: AppRole | null | undefined;
  className?: string | undefined;
}) {
  if (!role || role === "user") return null;
  return (
    <span
      title={LABEL[role] ?? role}
      aria-label={LABEL[role] ?? role}
      className={cn("founder-badge inline-grid size-5 shrink-0 place-items-center", className)}
    >
      <Shield className="size-[55%] fill-current stroke-[1.5]" />
    </span>
  );
}
