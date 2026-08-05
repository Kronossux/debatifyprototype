import { supabase } from "@/integrations/supabase/client";

export type PublicProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export async function fetchProfiles(ids: string[]): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>();
  const unique = [...new Set(ids)];
  if (!unique.length) return map;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", unique);
  for (const p of data ?? []) map.set(p.id, p as PublicProfile);
  return map;
}

export async function fetchProfile(id: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as PublicProfile) ?? null;
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);
  if (error) throw error;
}

/** Resize an uploaded image down to a small square and return a data URL. */
export function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        const side = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          size,
          size,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author: string;
  avatar_url: string | null;
};

export async function fetchChat(limit = 100): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, body, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []).slice().reverse();
  const profiles = await fetchProfiles(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    ...r,
    author: profiles.get(r.user_id)?.username ?? "member",
    avatar_url: profiles.get(r.user_id)?.avatar_url ?? null,
  }));
}

export async function sendChatMessage(userId: string, body: string) {
  const { error } = await supabase.from("chat_messages").insert({ user_id: userId, body });
  if (error) throw error;
}

export type Article = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  author_id: string;
  created_at: string;
};

export type ArticleWithAuthor = Article & { author: string; avatar_url: string | null };

export async function fetchArticles(category?: string): Promise<ArticleWithAuthor[]> {
  let query = supabase
    .from("articles")
    .select("id, title, summary, body, category, author_id, created_at")
    .order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as Article[];
  const profiles = await fetchProfiles(rows.map((r) => r.author_id));
  return rows.map((r) => ({
    ...r,
    author: profiles.get(r.author_id)?.username ?? "member",
    avatar_url: profiles.get(r.author_id)?.avatar_url ?? null,
  }));
}

export async function fetchArticle(id: string): Promise<ArticleWithAuthor | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, summary, body, category, author_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Article;
  const profile = await fetchProfile(row.author_id);
  return { ...row, author: profile?.username ?? "member", avatar_url: profile?.avatar_url ?? null };
}

export async function createArticle(input: {
  author_id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
}) {
  const { data, error } = await supabase.from("articles").insert(input).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteArticle(id: string) {
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) throw error;
}
