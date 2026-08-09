import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type StaffRole = "admin" | "vice_admin" | "moderator" | "user";

const RANK: Record<StaffRole, number> = { admin: 3, vice_admin: 2, moderator: 1, user: 0 };

export async function getRole(userId: string): Promise<StaffRole> {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  let best: StaffRole = "user";
  for (const r of data ?? []) {
    const role = r.role as StaffRole;
    if ((RANK[role] ?? 0) > RANK[best]) best = role;
  }
  return best;
}

export async function requireRole(userId: string, min: StaffRole): Promise<StaffRole> {
  const role = await getRole(userId);
  if (RANK[role] < RANK[min]) throw new Error("Access denied");
  return role;
}

export async function requireExactAdmin(userId: string) {
  const role = await getRole(userId);
  if (role !== "admin") throw new Error("Access denied");
  return role;
}

export async function logAction(
  actorId: string,
  action: string,
  targetType = "",
  targetId: string | null = null,
  details: Record<string, unknown> = {},
) {
  await supabaseAdmin
    .from("staff_audit_log")
    .insert({ actor_id: actorId, action, target_type: targetType, target_id: targetId, details });
}

export async function listUsers(search: string) {
  let q = supabaseAdmin
    .from("profiles")
    .select("id, username, avatar_url, bio, banned_at, ban_reason, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (search.trim()) q = q.ilike("username", `%${search.trim()}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
  const roleMap = new Map<string, StaffRole>();
  for (const r of roles ?? []) {
    const role = r.role as StaffRole;
    const cur = roleMap.get(r.user_id) ?? "user";
    if ((RANK[role] ?? 0) > RANK[cur]) roleMap.set(r.user_id, role);
  }
  return rows.map((r) => ({ ...r, role: roleMap.get(r.id) ?? ("user" as StaffRole) }));
}

export async function siteAnalytics() {
  const tables = ["profiles", "debates", "comments", "chat_messages", "articles", "votes"] as const;
  const counts: Record<string, number> = {};
  await Promise.all(
    tables.map(async (t) => {
      const { count } = await supabaseAdmin.from(t).select("id", { count: "exact", head: true });
      counts[t] = count ?? 0;
    }),
  );
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { count: newUsers } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  const { count: banned } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("banned_at", "is", null);
  const { count: openReports } = await supabaseAdmin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return {
    users: counts["profiles"] ?? 0,
    debates: counts["debates"] ?? 0,
    comments: counts["comments"] ?? 0,
    chat: counts["chat_messages"] ?? 0,
    articles: counts["articles"] ?? 0,
    votes: counts["votes"] ?? 0,
    newUsers7d: newUsers ?? 0,
    bannedUsers: banned ?? 0,
    openReports: openReports ?? 0,
  };
}

const CONTENT_TABLES: Record<string, string> = {
  debate: "debates",
  comment: "comments",
  chat: "chat_messages",
  article: "articles",
};

export async function removeContent(type: string, id: string) {
  const table = CONTENT_TABLES[type];
  if (!table) throw new Error("Unknown content type");
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
