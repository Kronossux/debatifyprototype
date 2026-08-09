import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "vice_admin" | "moderator" | "user";

export type PublicProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string;
  role: AppRole | null;
};

const ROLE_RANK: Record<string, number> = { admin: 3, vice_admin: 2, moderator: 1, user: 0 };


export async function fetchRoles(ids: string[]): Promise<Map<string, AppRole>> {
  const map = new Map<string, AppRole>();
  const unique = [...new Set(ids)];
  if (!unique.length) return map;
  const { data } = await supabase.from("user_roles").select("user_id, role").in("user_id", unique);
  for (const r of data ?? []) {
    const current = map.get(r.user_id);
    const rank = ROLE_RANK[r.role] ?? 0;
    const currentRank = current ? (ROLE_RANK[current] ?? 0) : -1;
    if (rank > currentRank) map.set(r.user_id, r.role as AppRole);
  }
  return map;
}

export async function fetchProfiles(ids: string[]): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>();
  const unique = [...new Set(ids)];
  if (!unique.length) return map;
  const [{ data }, roles] = await Promise.all([
    supabase.from("profiles").select("id, username, avatar_url, bio").in("id", unique),
    fetchRoles(unique),
  ]);
  for (const p of data ?? []) {
    map.set(p.id, {
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      bio: p.bio ?? "",
      role: roles.get(p.id) ?? null,
    });
  }
  return map;
}

export async function fetchProfile(id: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const roles = await fetchRoles([data.id]);
  return {
    id: data.id,
    username: data.username,
    avatar_url: data.avatar_url,
    bio: data.bio ?? "",
    role: roles.get(data.id) ?? null,
  };
}

export async function fetchProfileByUsername(username: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .eq("username_lower", username.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const roles = await fetchRoles([data.id]);
  return {
    id: data.id,
    username: data.username,
    avatar_url: data.avatar_url,
    bio: data.bio ?? "",
    role: roles.get(data.id) ?? null,
  };
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);
  if (error) throw error;
}

export async function updateBio(userId: string, bio: string) {
  const { error } = await supabase.from("profiles").update({ bio }).eq("id", userId);
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

/** Resize an uploaded image so its longest side fits `maxSide`, keeping aspect ratio. */
export function fileToImageDataUrl(file: File, maxSide = 1000, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image"));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export type ChatMessage = {
  id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  author: string;
  avatar_url: string | null;
  role: AppRole | null;
};

export async function fetchChat(limit = 100): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, body, image_url, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []).slice().reverse();
  const profiles = await fetchProfiles(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    ...r,
    author: profiles.get(r.user_id)?.username ?? "member",
    avatar_url: profiles.get(r.user_id)?.avatar_url ?? null,
    role: profiles.get(r.user_id)?.role ?? null,
  }));
}

export async function sendChatMessage(userId: string, body: string, imageUrl?: string | null) {
  const { error } = await supabase
    .from("chat_messages")
    .insert({ user_id: userId, body, image_url: imageUrl ?? null });
  if (error) throw error;
}

export type Article = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  image_url: string | null;
  author_id: string;
  created_at: string;
};

export type ArticleWithAuthor = Article & {
  author: string;
  avatar_url: string | null;
  role: AppRole | null;
};

const ARTICLE_COLUMNS = "id, title, summary, body, category, image_url, author_id, created_at";

export async function fetchArticles(category?: string): Promise<ArticleWithAuthor[]> {
  let query = supabase
    .from("articles")
    .select(ARTICLE_COLUMNS)
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
    role: profiles.get(r.author_id)?.role ?? null,
  }));
}

export async function fetchArticle(id: string): Promise<ArticleWithAuthor | null> {
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Article;
  const profile = await fetchProfile(row.author_id);
  return {
    ...row,
    author: profile?.username ?? "member",
    avatar_url: profile?.avatar_url ?? null,
    role: profile?.role ?? null,
  };
}

export async function createArticle(input: {
  author_id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  image_url?: string | null;
}) {
  const { data, error } = await supabase.from("articles").insert(input).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteArticle(id: string) {
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------- search --------------------------------- */

export type DebateHit = { id: string; title: string; category: string };

export async function searchUsers(term: string, limit = 6): Promise<PublicProfile[]> {
  const q = term.trim().replace(/^@/, "").toLowerCase();
  if (!q) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .ilike("username_lower", `%${q}%`)
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  const roles = await fetchRoles(rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    avatar_url: r.avatar_url,
    bio: r.bio ?? "",
    role: roles.get(r.id) ?? null,
  }));
}

export async function searchDebates(term: string, limit = 6): Promise<DebateHit[]> {
  const q = term.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("debates")
    .select("id, title, category")
    .ilike("title", `%${q}%`)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DebateHit[];
}

export async function searchAll(term: string) {
  const [users, debates] = await Promise.all([searchUsers(term), searchDebates(term)]);
  return { users, debates };
}

/* ------------------------------ direct messages ----------------------------- */

export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
};

export async function fetchConversation(
  userId: string,
  otherId: string,
): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from("direct_messages")
    .select("id, sender_id, recipient_id, body, image_url, created_at")
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`,
    )
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as DirectMessage[];
}

export async function sendDirectMessage(
  senderId: string,
  recipientId: string,
  body: string,
  imageUrl?: string | null,
) {
  const { error } = await supabase.from("direct_messages").insert({
    sender_id: senderId,
    recipient_id: recipientId,
    body,
    image_url: imageUrl ?? null,
  });
  if (error) throw error;
}

export type Conversation = {
  other: PublicProfile;
  last: DirectMessage;
};

export async function fetchInbox(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("direct_messages")
    .select("id, sender_id, recipient_id, body, image_url, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  const rows = (data ?? []) as DirectMessage[];
  const latest = new Map<string, DirectMessage>();
  for (const m of rows) {
    const other = m.sender_id === userId ? m.recipient_id : m.sender_id;
    if (!latest.has(other)) latest.set(other, m);
  }
  const profiles = await fetchProfiles([...latest.keys()]);
  return [...latest.entries()]
    .map(([otherId, last]) => {
      const other = profiles.get(otherId);
      return other ? { other, last } : null;
    })
    .filter((c): c is Conversation => c !== null);
}
