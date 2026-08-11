import { supabase } from "@/integrations/supabase/client";

export type TargetType = "debate" | "comment" | "chat" | "article" | "dm";

const TABLES = {
  debate: "debates",
  comment: "comments",
  chat: "chat_messages",
  article: "articles",
  dm: "direct_messages",
} as const;

/** These keep the row and just hide it, so staff can still review it. */
const SOFT_DELETE: TargetType[] = ["comment", "chat", "dm"];

export const TARGET_LABEL: Record<TargetType, string> = {
  debate: "debate",
  comment: "comment",
  chat: "chat message",
  article: "article",
  dm: "message",
};

export function isSoftDeletable(targetType: TargetType) {
  return SOFT_DELETE.includes(targetType);
}

/** File a report for a piece of content. Staff review these in their dashboards. */
export async function reportContent(
  reporterId: string,
  targetType: TargetType,
  targetId: string,
  reason: string,
) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason: reason.slice(0, 300),
  });
  if (error) throw error;
}

/** Hide or unhide a soft-deletable row, keeping Supabase's per-table typing happy. */
async function setHidden(
  targetType: "comment" | "chat" | "dm",
  targetId: string,
  patch: { deleted_at: string | null; deleted_by: string | null },
) {
  const query =
    targetType === "comment"
      ? supabase.from("comments").update(patch)
      : targetType === "chat"
        ? supabase.from("chat_messages").update(patch)
        : supabase.from("direct_messages").update(patch);
  const { error } = await query.eq("id", targetId);
  if (error) throw error;
}

/**
 * Remove content. Messages, comments and DMs are hidden (staff can still read
 * them); debates and articles are removed outright.
 */
export async function deleteContent(targetType: TargetType, targetId: string, actorId?: string) {
  if (targetType === "comment" || targetType === "chat" || targetType === "dm") {
    await setHidden(targetType, targetId, {
      deleted_at: new Date().toISOString(),
      deleted_by: actorId ?? null,
    });
    return;
  }
  const { error } = await supabase.from(TABLES[targetType]).delete().eq("id", targetId);
  if (error) throw error;
}

/** Bring a hidden message back. Staff only (enforced by the database). */
export async function restoreContent(targetType: "comment" | "chat" | "dm", targetId: string) {
  await setHidden(targetType, targetId, { deleted_at: null, deleted_by: null });
}


/** Erase a hidden message for good. Admin only (enforced by the database). */
export async function purgeContent(targetType: TargetType, targetId: string) {
  const { error } = await supabase.from(TABLES[targetType]).delete().eq("id", targetId);
  if (error) throw error;
}
