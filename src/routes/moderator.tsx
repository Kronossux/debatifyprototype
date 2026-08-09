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
  staffListReports,
  staffRemoveContent,
  staffResolveReport,
} from "@/lib/staff.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/moderator")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Moderator tools — Debatify" },
      { name: "description", content: "Moderator queue for handling reports and rule-breaking content on Debatify." },
      { property: "og:title", content: "Moderator tools — Debatify" },
      { property: "og:description", content: "Moderator queue for handling reports on Debatify." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ModeratorPage,
});

function ModeratorPage() {
  const { data, isPending } = useStaffRole();
  if (isPending) return <StaffLoading />;
  if (data?.role !== "moderator") return <AccessDenied needed="moderators" />;
  return <ModeratorTools />;
}

function ModeratorTools() {
  const qc = useQueryClient();
  const listUsers = useServerFn(adminListUsers);
  const analytics = useServerFn(adminAnalytics);
  const setBan = useServerFn(adminSetBan);
  const reports = useServerFn(staffListReports);
  const resolveReport = useServerFn(staffResolveReport);
  const removeContent = useServerFn(staffRemoveContent);
  const auditLog = useServerFn(staffAuditLog);

  const usersQ = useQuery({ queryKey: ["mod-users"], queryFn: () => listUsers({ data: { search: "" } }) });
  const statsQ = useQuery({ queryKey: ["mod-stats"], queryFn: () => analytics() });
  const reportsQ = useQuery({ queryKey: ["mod-reports"], queryFn: () => reports() });
  const logQ = useQuery({ queryKey: ["mod-log"], queryFn: () => auditLog() });

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
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Moderator tools</h1>
        <p className="text-sm text-muted-foreground">Handle reports, remove rule-breaking content and ban members.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats &&
          Object.entries({ "Open reports": stats.openReports, Debates: stats.debates, Comments: stats.comments, Banned: stats.bannedUsers }).map(
            ([k, v]) => (
              <div key={k} className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="font-display text-xl font-bold">{v}</div>
              </div>
            ),
          )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Report queue</h2>
        <div className="mt-3 space-y-2">
          {(reportsQ.data ?? []).filter((r) => r.status === "open").map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex-1">
                <span className="font-medium capitalize">{r.target_type}</span> · {r.reason || "no reason given"}
                <div className="text-xs text-muted-foreground">{r.target_id}</div>
              </div>
              <Button size="sm" variant="destructive" onClick={run(() => removeContent({ data: { type: r.target_type, id: r.target_id } }).then(() => resolveReport({ data: { id: r.id, status: "resolved" } })), ["mod-reports"], "Content removed")}>
                Remove
              </Button>
              <Button size="sm" variant="secondary" onClick={run(() => resolveReport({ data: { id: r.id, status: "dismissed" } }), ["mod-reports"], "Dismissed")}>
                Dismiss
              </Button>
            </div>
          ))}
          {(reportsQ.data ?? []).filter((r) => r.status === "open").length === 0 && (
            <p className="text-sm text-muted-foreground">Queue is clear.</p>
          )}
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
              <Button size="sm" variant="secondary" onClick={run(() => setBan({ data: { userId: u.id, banned: !u.banned_at, reason: "Violated the rules" } }), ["mod-users", "mod-stats"], "Updated")}>
                {u.banned_at ? "Unban" : "Ban"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Recent staff activity</h2>
        <div className="mt-3 space-y-1 text-xs">
          {(logQ.data ?? []).slice(0, 30).map((l) => (
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
