import { supabase } from "@/integrations/supabase/client";
import { fetchProfiles, type AppRole } from "@/lib/community";

export const CATEGORIES = ["Culture", "Sports", "Tech", "Science", "Entertainment"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Debate = {
  id: string;
  title: string;
  description: string;
  category: string;
  option_a: string;
  option_b: string;
  created_by: string | null;
  created_at: string;
};

export type DebateStats = {
  debate_id: string;
  votes_a: number;
  votes_b: number;
  total_votes: number;
  comment_count: number;
};

export type DebateWithStats = Debate & { stats: DebateStats };

const emptyStats = (id: string): DebateStats => ({
  debate_id: id,
  votes_a: 0,
  votes_b: 0,
  total_votes: 0,
  comment_count: 0,
});

export async function fetchDebates(category?: string): Promise<DebateWithStats[]> {
  let query = supabase.from("debates").select("*").order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;

  const { data: stats, error: statsError } = await supabase.from("debate_stats").select("*");
  if (statsError) throw statsError;

  const map = new Map((stats ?? []).map((s) => [s.debate_id as string, s as DebateStats]));
  return (data ?? []).map((d) => ({ ...(d as Debate), stats: map.get(d.id) ?? emptyStats(d.id) }));
}

export async function fetchLeaderboard(): Promise<DebateWithStats[]> {
  const all = await fetchDebates();
  return all
    .sort(
      (a, b) =>
        b.stats.total_votes + b.stats.comment_count - (a.stats.total_votes + a.stats.comment_count),
    )
    .slice(0, 10);
}

export async function fetchDebate(id: string): Promise<DebateWithStats | null> {
  const { data, error } = await supabase.from("debates").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: stats } = await supabase
    .from("debate_stats")
    .select("*")
    .eq("debate_id", id)
    .maybeSingle();
  return { ...(data as Debate), stats: (stats as DebateStats) ?? emptyStats(id) };
}

export async function fetchMyVote(debateId: string, userId: string) {
  const { data, error } = await supabase
    .from("votes")
    .select("choice")
    .eq("debate_id", debateId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.choice as "a" | "b" | undefined) ?? null;
}

export async function castVote(debateId: string, userId: string, choice: "a" | "b") {
  const { error } = await supabase
    .from("votes")
    .upsert({ debate_id: debateId, user_id: userId, choice }, { onConflict: "debate_id,user_id" });
  if (error) throw error;
}

export type CommentRow = {
  id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  author: string;
  avatar_url: string | null;
  role: AppRole | null;
};

export async function fetchComments(debateId: string): Promise<CommentRow[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, image_url, created_at, user_id")
    .eq("debate_id", debateId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const profiles = await fetchProfiles(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    ...r,
    author: profiles.get(r.user_id)?.username ?? "member",
    avatar_url: profiles.get(r.user_id)?.avatar_url ?? null,
    role: profiles.get(r.user_id)?.role ?? null,
  }));
}

export async function addComment(
  debateId: string,
  userId: string,
  body: string,
  imageUrl?: string | null,
) {
  const { error } = await supabase
    .from("comments")
    .insert({ debate_id: debateId, user_id: userId, body, image_url: imageUrl ?? null });
  if (error) throw error;
}

export function percent(stats: DebateStats) {
  if (stats.total_votes === 0) return { a: 50, b: 50, empty: true };
  const a = Math.round((stats.votes_a / stats.total_votes) * 100);
  return { a, b: 100 - a, empty: false };
}
