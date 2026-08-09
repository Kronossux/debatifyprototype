import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AccessDenied, StaffLoading, useStaffRole } from "@/lib/staff";
import {
  adminAnalytics,
  adminListUsers,
  adminSetBan,
  staffAuditLog,
  staffListDebates,
  staffListReports,
  staffRemoveContent,
  staffResolveReport,
  staffSetFeatured,
} from "@/lib/staff.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vice-admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vice admin console — Debatify" },
      { name: "description", content: "Vice admin moderation console for Debatify staff." },
      { property: "og:title", content: "Vice admin console — Debatify" },
      { property: "og:description", content: "Vice admin moderation console for Debatify staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ViceAdminPage,
});

function ViceAdminPage() {
  const { data, isPending } = useStaffRole();
  if (isPending) return <StaffLoading />;
  if (data?.role !== "vice_admin") return <AccessDenied needed="vice admins" />;
  return <ViceAdminConsole />;
}

function ViceAdminConsole() {
  const qc = useQueryClient();
  const listUsers = useServerFn(adminListUsers);
  const analytics = useServerFn(adminAnalytics);
  const setBan = useServerFn(adminSetBan);
  const reports = useServerFn(staffListReports);
  const resolveReport = useServerFn(staffResolveReport);
  const removeContent = useServerFn(staffRemoveContent);
  const listDebates = useServerFn(staffListDebates);
  const setFeatured = useServerFn(staffSetFeatured);
  const auditLog = useServerFn(staffAuditLog);

  const usersQ = useQuery({ queryKey: ["va-users"], queryFn: () => listUsers({ data: { search: "" } }) });
  const statsQ = useQuery({ queryKey: ["va-stats"], queryFn: () => analytics() });
  const reportsQ = useQuery({ queryKey: ["va-reports"], queryFn: () => reports() });
  const debatesQ = useQuery({ queryKey: ["va-debates"], queryFn: () => listDebates() });
  const logQ = useQuery({ queryKey: ["va-log"], queryFn: () => auditLog() });

  const run = (fn: () => Promise<unknown>, keys: string[], msg: string) => async () => {
    try {
      await fn();
      toast.success(msg);
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  const stats = statsQ.data;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Vice admin console</h1>
        <p className="text-sm text-muted-foreground">Moderation, featured debates and reports. Staff roles are admin-only.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats &&
          Object.entries({ Members: stats.users, Debates: stats.debates, "Open reports": stats.openReports, Banned: stats.bannedUsers }).map(
            ([k, v]) => (
              <div key={k} className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="font-display text-xl font-bold">{v}</div>
              </div>
            ),
          )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Open reports</h2>
        <div className="mt-3 space-y-2">
          {(reportsQ.data ?? []).filter((r) => r.status === "open").map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex-1">
                <span className="font-medium capitalize">{r.target_type}</span> · {r.reason || "no reason given"}
              </div>
              <Button size="sm" variant="destructive" onClick={run(() => removeContent({ data: { type: r.target_type, id: r.target_id } }).then(() => resolveReport({ data: { id: r.id, status: "resolved" } })), ["va-reports"], "Content removed")}>
                Remove
              </Button>
              <Button size="sm" variant="secondary" onClick={run(() => resolveReport({ data: { id: r.id, status: "dismissed" } }), ["va-reports"], "Dismissed")}>
                Dismiss
              </Button>
            </div>
          ))}
          {(reportsQ.data ?? []).filter((r) => r.status === "open").length === 0 && (
            <p className="text-sm text-muted-foreground">No open reports.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Debates</h2>
        <div className="mt-3 space-y-2">
          {(debatesQ.data ?? []).slice(0, 30).map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex-1">{d.title}</div>
              <Button size="sm" variant={d.featured ? "default" : "secondary"} onClick={run(() => setFeatured({ data: { id: d.id, featured: !d.featured } }), ["va-debates"], "Updated")}>
                {d.featured ? "Featured" : "Feature"}
              </Button>
              <Button size="sm" variant="destructive" onClick={run(() => removeContent({ data: { type: "debate", id: d.id } }), ["va-debates"], "Removed")}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Members</h2>
        <div className="mt-3 space-y-2">
          {(usersQ.data ?? []).filter((u) => u.role === "user").slice(0, 40).map((u) => (
            <div key={u.id} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex-1">
                @{u.username}
                {u.banned_at && <span className="text-destructive"> · banned</span>}
              </div>
              <Button size="sm" variant="secondary" onClick={run(() => setBan({ data: { userId: u.id, banned: !u.banned_at, reason: "Violated the rules" } }), ["va-users", "va-stats"], "Updated")}>
                {u.banned_at ? "Unban" : "Ban"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Staff activity</h2>
        <div className="mt-3 space-y-1 text-xs">
          {(logQ.data ?? []).slice(0, 40).map((l) => (
            <div key={l.id} className="flex gap-2 rounded border border-border/60 px-2 py-1">
              <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
              <span className="font-medium">{l.action}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
