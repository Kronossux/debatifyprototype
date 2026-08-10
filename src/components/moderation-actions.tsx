import { useState } from "react";
import { Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useStaffRole } from "@/lib/staff";
import { deleteContent, reportContent, TARGET_LABEL, type TargetType } from "@/lib/moderation";

/**
 * Report / delete controls shown next to a piece of content.
 * Delete only appears for the author or a staff member; the database enforces it too.
 */
export function ModerationActions({
  targetType,
  targetId,
  ownerId,
  onDone,
  className,
}: {
  targetType: TargetType;
  targetId: string;
  ownerId?: string | null;
  onDone?: () => void;
  className?: string;
}) {
  const { user } = useAuth();
  const { data: staff } = useStaffRole();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const isOwner = ownerId != null && ownerId === user.id;
  const isStaff = staff?.role && staff.role !== "user";
  const label = TARGET_LABEL[targetType];

  async function report() {
    const reason = window.prompt(`Why are you reporting this ${label}?`);
    if (reason === null) return;
    setBusy(true);
    try {
      await reportContent(user!.id, targetType, targetId, reason);
      toast.success("Reported — staff will take a look.");
    } catch {
      toast.error("Could not send that report.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete this ${label}?`)) return;
    setBusy(true);
    try {
      await deleteContent(targetType, targetId);
      toast.success(`${label[0]!.toUpperCase()}${label.slice(1)} deleted.`);
      onDone?.();
    } catch {
      toast.error("Could not delete that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      {!isOwner ? (
        <button
          type="button"
          disabled={busy}
          onClick={report}
          title={`Report this ${label}`}
          aria-label={`Report this ${label}`}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
        >
          <Flag className="size-3.5" />
        </button>
      ) : null}
      {isOwner || isStaff ? (
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          title={`Delete this ${label}`}
          aria-label={`Delete this ${label}`}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}
