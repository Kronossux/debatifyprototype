import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";

export const getMyStaffRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getRole } = await import("@/lib/staff.server");
    return { userId: context.userId, role: await getRole(context.userId) };
  });

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string }) => ({ search: String(d?.search ?? "") }))
  .handler(async ({ data, context }) => {
    const { requireRole, listUsers } = await import("@/lib/staff.server");
    await requireRole(context.userId, "moderator");
    return listUsers(data.search);
  });

export const adminSetBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; banned: boolean; reason?: string }) => ({
    userId: String(d.userId),
    banned: Boolean(d.banned),
    reason: String(d.reason ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { requireRole, getRole, logAction } = await import("@/lib/staff.server");
    const actorRole = await requireRole(context.userId, "moderator");
    const targetRole = await getRole(data.userId);
    if (targetRole !== "user" && actorRole !== "admin") throw new Error("Access denied");
    if (targetRole === "admin") throw new Error("Access denied");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        banned_at: data.banned ? new Date().toISOString() : null,
        ban_reason: data.banned ? data.reason : null,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAction(context.userId, data.banned ? "ban_user" : "unban_user", "user", data.userId, {
      reason: data.reason,
    });
    return { ok: true as const };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => ({ userId: String(d.userId) }))
  .handler(async ({ data, context }) => {
    const { requireExactAdmin, logAction } = await import("@/lib/staff.server");
    await requireExactAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("You cannot delete your own admin account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAction(context.userId, "delete_user", "user", data.userId);
    return { ok: true as const };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "vice_admin" | "moderator" | "user" }) => ({
    userId: String(d.userId),
    role: d.role,
  }))
  .handler(async ({ data, context }) => {
    const { requireExactAdmin, logAction } = await import("@/lib/staff.server");
    await requireExactAdmin(context.userId);
    if (!["vice_admin", "moderator", "user"].includes(data.role)) throw new Error("Invalid role");
    if (data.userId === context.userId) throw new Error("You cannot change your own role");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (data.role !== "user") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error) throw new Error(error.message);
    }
    await logAction(context.userId, "set_role", "user", data.userId, { role: data.role });
    return { ok: true as const };
  });

export const adminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireRole, siteAnalytics } = await import("@/lib/staff.server");
    await requireRole(context.userId, "moderator");
    return siteAnalytics();
  });

export const staffListReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireRole } = await import("@/lib/staff.server");
    await requireRole(context.userId, "moderator");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("reports")
      .select("id, reporter_id, target_type, target_id, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const staffResolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "resolved" | "dismissed" }) => ({
    id: String(d.id),
    status: d.status,
  }))
  .handler(async ({ data, context }) => {
    const { requireRole, logAction } = await import("@/lib/staff.server");
    await requireRole(context.userId, "moderator");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("reports")
      .update({ status: data.status, handled_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAction(context.userId, `report_${data.status}`, "report", data.id);
    return { ok: true as const };
  });

export const staffRemoveContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { type: string; id: string }) => ({ type: String(d.type), id: String(d.id) }))
  .handler(async ({ data, context }) => {
    const { requireRole, removeContent, logAction } = await import("@/lib/staff.server");
    await requireRole(context.userId, "moderator");
    await removeContent(data.type, data.id);
    await logAction(context.userId, "remove_content", data.type, data.id);
    return { ok: true as const };
  });

export const staffListDebates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireRole } = await import("@/lib/staff.server");
    await requireRole(context.userId, "moderator");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("debates")
      .select("id, title, category, featured, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const staffSetFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; featured: boolean }) => ({
    id: String(d.id),
    featured: Boolean(d.featured),
  }))
  .handler(async ({ data, context }) => {
    const { requireRole, logAction } = await import("@/lib/staff.server");
    await requireRole(context.userId, "vice_admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("debates")
      .update({ featured: data.featured })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAction(context.userId, "set_featured", "debate", data.id, { featured: data.featured });
    return { ok: true as const };
  });

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; active?: boolean; sort_order?: number }) => ({
    id: d.id ? String(d.id) : null,
    name: String(d.name).trim(),
    active: d.active ?? true,
    sort_order: Number(d.sort_order ?? 0),
  }))
  .handler(async ({ data, context }) => {
    const { requireExactAdmin, logAction } = await import("@/lib/staff.server");
    await requireExactAdmin(context.userId);
    if (!data.name) throw new Error("Category name required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("categories")
        .update({ name: data.name, active: data.active, sort_order: data.sort_order })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("categories")
        .insert({ name: data.name, active: data.active, sort_order: data.sort_order });
      if (error) throw new Error(error.message);
    }
    await logAction(context.userId, "save_category", "category", data.id, { name: data.name });
    return { ok: true as const };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    const { requireExactAdmin, logAction } = await import("@/lib/staff.server");
    await requireExactAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAction(context.userId, "delete_category", "category", data.id);
    return { ok: true as const };
  });

export const staffAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireRole } = await import("@/lib/staff.server");
    await requireRole(context.userId, "moderator");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("staff_audit_log")
      .select("id, actor_id, action, target_type, target_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { value: Record<string, string | number | boolean> }) => ({ value: d.value }))
  .handler(async ({ data, context }) => {
    const { requireExactAdmin, logAction } = await import("@/lib/staff.server");
    await requireExactAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "general", value: data.value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    await logAction(context.userId, "update_site_settings", "settings", "general");
    return { ok: true as const };
  });

export const logUserIP = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => ({ userId: String(d.userId) }))
  .handler(async ({ data }) => {
    // Extract IP from request headers
    const request = getRequest();
    let ipAddress = "unknown";

    if (request?.headers) {
      // Try various headers that might contain the client IP
      ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip") ||
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-client-ip") ||
        "unknown";
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Upsert: insert or update the last_seen timestamp for this user+IP combination
      const { error } = await supabaseAdmin.from("user_ip_log").upsert(
        {
          user_id: data.userId,
          ip_address: ipAddress,
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: "user_id,ip_address",
        }
      );

      if (error) {
        console.error("Failed to log user IP:", error);
        // Don't throw - this shouldn't break auth
      }
    } catch (err) {
      console.error("Error logging user IP:", err);
      // Silently fail - IP logging shouldn't break the auth flow
    }

    return { ok: true as const };
  });
