import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AccessDenied, StaffLoading, useStaffRole, ROLE_LABEL, type StaffRole } from "@/lib/staff";
import {
  adminAnalytics,
  adminDeleteCategory,
  adminDeleteUser,
  adminListUsers,
  adminSaveCategory,
  adminSaveSettings,
  adminSetBan,
  adminSetRole,
  staffAuditLog,
  staffListDebates,
  staffListReports,
  staffRemoveContent,
  staffResolveReport,
  staffSetFeatured,
} from "@/lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Owner dashboard — Debatify" },
      { name: "description", content: "Private Debatify owner dashboard for staff, moderation and site settings." },
      { property: "og:title", content: "Owner dashboard — Debatify" },
      { property: "og:description", content: "Private Debatify owner dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AdminPage() {
  const { data, isPending } = useStaffRole();
  if (isPending) return <StaffLoading />;
  if (data?.role !== "admin") return <AccessDenied needed="the site admin" />;
  return <AdminDashboard />;
}

function AdminDashboard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const listUsers = useServerFn(adminListUsers);
  const analytics = useServerFn(adminAnalytics);
  const setBan = useServerFn(adminSetBan);
  const delUser = useServerFn(adminDeleteUser);
  const setRole = useServerFn(adminSetRole);
  const reports = useServerFn(staffListReports);
  const resolveReport = useServerFn(staffResolveReport);
  const removeContent = useServerFn(staffRemoveContent);
  const listDebates = useServerFn(staffListDebates);
  const setFeatured = useServerFn(staffSetFeatured);
  const saveCategory = useServerFn(adminSaveCategory);
  const delCategory = useServerFn(adminDeleteCategory);
  const auditLog = useServerFn(staffAuditLog);
  const saveSettings = useServerFn(adminSaveSettings);

  const usersQ = useQuery({ queryKey: ["admin-users", search], queryFn: () => listUsers({ data: { search } }) });
  const statsQ = useQuery({ queryKey: ["admin-stats"], queryFn: () => analytics() });
  const reportsQ = useQuery({ queryKey: ["admin-reports"], queryFn: () => reports() });
  const debatesQ = useQuery({ queryKey: ["admin-debates"], queryFn: () => listDebates() });
  const logQ = useQuery({ queryKey: ["admin-log"], queryFn: () => auditLog() });
  const catsQ = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, active, sort_order").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const settingsQ = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "general").maybeSingle();
      return (data?.value ?? {}) as Record<string, string | number | boolean>;
    },
  });

  const run = (fn: () => Promise<unknown>, keys: string[], msg: string) => async () => {
    try {
      await fn();
      toast.success(msg);
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  const [newCat, setNewCat] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string | number | boolean> | null>(null);
  const settings = settingsDraft ?? settingsQ.data ?? {};

  const stats = statsQ.data;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Owner dashboard</h1>
        <p className="text-sm text-muted-foreground">Admin-only controls. Every action is logged.</p>
      </header>

      <Card title="Site analytics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats &&
            Object.entries({
              Members: stats.users,
              "New (7d)": stats.newUsers7d,
              Debates: stats.debates,
              Votes: stats.votes,
              Comments: stats.comments,
              "Chat msgs": stats.chat,
              Articles: stats.articles,
              Banned: stats.bannedUsers,
              "Open reports": stats.openReports,
            }).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="font-display text-xl font-bold">{v}</div>
              </div>
            ))}
        </div>
      </Card>

      <Card title="Users & staff">
        <Input
          placeholder="Search usernames…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 max-w-xs"
        />
        <div className="space-y-2">
          {(usersQ.data ?? []).map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
              <div className="min-w-40 flex-1">
                <div className="font-medium">
                  @{u.username}{" "}
                  <span className="text-xs text-muted-foreground">({ROLE_LABEL[u.role as StaffRole]})</span>
                </div>
                {u.banned_at && (
                  <div className="text-xs text-destructive">Banned — {u.ban_reason || "no reason"}</div>
                )}
              </div>
              {u.role !== "admin" && (
                <>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={u.role}
                    onChange={(e) =>
                      run(
                        () => setRole({ data: { userId: u.id, role: e.target.value as "vice_admin" | "moderator" | "user" } }),
                        ["admin-users", "admin-log"],
                        "Role updated",
                      )()
                    }
                  >
                    <option value="user">Member</option>
                    <option value="moderator">Moderator</option>
                    <option value="vice_admin">Vice admin</option>
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={run(
                      () =>
                        setBan({
                          data: { userId: u.id, banned: !u.banned_at, reason: u.banned_at ? "" : "Violated the rules" },
                        }),
                      ["admin-users", "admin-stats", "admin-log"],
                      u.banned_at ? "User unbanned" : "User banned",
                    )}
                  >
                    {u.banned_at ? "Unban" : "Ban"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Permanently delete @${u.username}?`))
                        run(() => delUser({ data: { userId: u.id } }), ["admin-users", "admin-stats", "admin-log"], "User deleted")();
                    }}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          ))}
          {usersQ.data?.length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}
        </div>
      </Card>

      <Card title="Reported content">
        <div className="space-y-2">
          {(reportsQ.data ?? []).filter((r) => r.status === "open").map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex-1">
                <span className="font-medium capitalize">{r.target_type}</span> · {r.reason || "no reason given"}
                <div className="text-xs text-muted-foreground">{r.target_id}</div>
              </div>
              <Button size="sm" variant="destructive" onClick={run(() => removeContent({ data: { type: r.target_type, id: r.target_id } }).then(() => resolveReport({ data: { id: r.id, status: "resolved" } })), ["admin-reports", "admin-log"], "Content removed")}>
                Remove content
              </Button>
              <Button size="sm" variant="secondary" onClick={run(() => resolveReport({ data: { id: r.id, status: "dismissed" } }), ["admin-reports"], "Report dismissed")}>
                Dismiss
              </Button>
            </div>
          ))}
          {(reportsQ.data ?? []).filter((r) => r.status === "open").length === 0 && (
            <p className="text-sm text-muted-foreground">No open reports.</p>
          )}
        </div>
      </Card>

      <Card title="Debates">
        <div className="space-y-2">
          {(debatesQ.data ?? []).slice(0, 40).map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex-1">
                {d.title} <span className="text-xs text-muted-foreground">· {d.category}</span>
              </div>
              <Button size="sm" variant={d.featured ? "default" : "secondary"} onClick={run(() => setFeatured({ data: { id: d.id, featured: !d.featured } }), ["admin-debates", "admin-log"], "Updated")}>
                {d.featured ? "Featured" : "Feature"}
              </Button>
              <Button size="sm" variant="destructive" onClick={run(() => removeContent({ data: { type: "debate", id: d.id } }), ["admin-debates", "admin-stats", "admin-log"], "Debate removed")}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Categories">
        <div className="space-y-2">
          {(catsQ.data ?? []).map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex-1">{c.name}{!c.active && <span className="text-muted-foreground"> · hidden</span>}</div>
              <Button size="sm" variant="secondary" onClick={run(() => saveCategory({ data: { id: c.id, name: c.name, active: !c.active, sort_order: c.sort_order } }), ["admin-cats", "admin-log"], "Category updated")}>
                {c.active ? "Hide" : "Show"}
              </Button>
              <Button size="sm" variant="destructive" onClick={run(() => delCategory({ data: { id: c.id } }), ["admin-cats", "admin-log"], "Category deleted")}>
                Delete
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} className="max-w-xs" />
            <Button
              onClick={run(async () => {
                await saveCategory({ data: { name: newCat, sort_order: (catsQ.data?.length ?? 0) + 1 } });
                setNewCat("");
              }, ["admin-cats", "admin-log"], "Category added")}
            >
              Add
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Site-wide settings">
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-muted-foreground">Site name</span>
            <Input
              value={String(settings["site_name"] ?? "")}
              onChange={(e) => setSettingsDraft({ ...settings, site_name: e.target.value })}
              className="mt-1 max-w-sm"
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">Tagline</span>
            <Input
              value={String(settings["tagline"] ?? "")}
              onChange={(e) => setSettingsDraft({ ...settings, tagline: e.target.value })}
              className="mt-1 max-w-sm"
            />
          </label>
          {(["allow_signups", "allow_debate_creation", "allow_chat", "maintenance_mode"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(settings[k])}
                onChange={(e) => setSettingsDraft({ ...settings, [k]: e.target.checked })}
              />
              <span className="capitalize">{k.replace(/_/g, " ")}</span>
            </label>
          ))}
          <Button onClick={run(() => saveSettings({ data: { value: settings } }), ["admin-settings", "admin-log"], "Settings saved")}>
            Save settings
          </Button>
        </div>
      </Card>

      <Card title="Staff activity log">
        <div className="space-y-1 text-xs">
          {(logQ.data ?? []).map((l) => (
            <div key={l.id} className="flex gap-2 rounded border border-border/60 px-2 py-1">
              <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
              <span className="font-medium">{l.action}</span>
              <span className="text-muted-foreground">{l.target_type} {l.target_id}</span>
            </div>
          ))}
          {logQ.data?.length === 0 && <p className="text-sm text-muted-foreground">No staff actions yet.</p>}
        </div>
      </Card>
    </div>
  );
}
