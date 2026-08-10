import { supabase } from "@/integrations/supabase/client";

export type TargetType = "debate" | "comment" | "chat" | "article";

const TABLES: Record<TargetType, "debates" | "comments" | "chat_messages" | "articles"> = {
  debate: "debates",
  comment: "comments",
  chat: "chat_messages",
  article: "articles",
};

export const TARGET_LABEL: Record<TargetType, string> = {
  debate: "debate",
  comment: "comment",
  chat: "chat message",
  article: "article",
};

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

/** Delete content. RLS allows the author, or any staff member, to do this. */
export async function deleteContent(targetType: TargetType, targetId: string) {
  const { error } = await supabase.from(TABLES[targetType]).delete().eq("id", targetId);
  if (error) throw error;
}
