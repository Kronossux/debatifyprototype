import { useState } from "react";
import { Flag, RotateCcw, Trash2, XOctagon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useStaffRole } from "@/lib/staff";
import {
  deleteContent,
  isSoftDeletable,
  purgeContent,
  reportContent,
  restoreContent,
  TARGET_LABEL,
  type TargetType,
} from "@/lib/moderation";

/**
 * Report / delete controls shown next to a piece of content.
 * Delete only appears for the author or a staff member; the database enforces it too.
 * Staff also get restore, and the admin can erase a hidden item for good.
 */
export function ModerationActions({
  targetType,
  targetId,
  ownerId,
  deleted,
  onDone,
  className,
}: {
  targetType: TargetType;
  targetId: string;
  ownerId?: string | null;
  deleted?: boolean;
  onDone?: () => void;
  className?: string;
}) {
  const { user } = useAuth();
  const { data: staff } = useStaffRole();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const isOwner = ownerId != null && ownerId === user.id;
  const isStaff = !!staff?.role && staff.role !== "user";
  const isAdmin = staff?.role === "admin";
  const label = TARGET_LABEL[targetType];
  const soft = isSoftDeletable(targetType);

  async function act(run: () => Promise<void>, success: string) {
    setBusy(true);
    try {
      await run();
      toast.success(success);
      onDone?.();
    } catch {
      toast.error("That didn't work.");
    } finally {
      setBusy(false);
    }
  }

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

  const iconClass =
    "rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50";

  return (
    <span data-no-translate className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      {!isOwner ? (
        <button
          type="button"
          disabled={busy}
          onClick={report}
          title={`Report this ${label}`}
          aria-label={`Report this ${label}`}
          className={iconClass}
        >
          <Flag className="size-3.5" />
        </button>
      ) : null}

      {(isOwner || isStaff) && !deleted ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`Delete this ${label}?`)) return;
            void act(() => deleteContent(targetType, targetId, user!.id), `${label} deleted.`);
          }}
          title={`Delete this ${label}`}
          aria-label={`Delete this ${label}`}
          className={iconClass}
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}

      {isStaff && soft && deleted ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void act(
              () => restoreContent(targetType as "comment" | "chat" | "dm", targetId),
              `${label} restored.`,
            )
          }
          title="Restore"
          aria-label="Restore"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RotateCcw className="size-3.5" />
        </button>
      ) : null}

      {isAdmin && soft && deleted ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.confirm("Erase this permanently? It cannot be recovered.")) return;
            void act(() => purgeContent(targetType, targetId), "Erased permanently.");
          }}
          title="Erase permanently"
          aria-label="Erase permanently"
          className={iconClass}
        >
          <XOctagon className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}
