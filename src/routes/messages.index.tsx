import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";
import { fetchInbox } from "@/lib/community";
import { UserAvatar } from "@/components/user-avatar";
import { RoleBadge } from "@/components/role-badge";

export const Route = createFileRoute("/messages/")({
  head: () => ({
    meta: [
      { title: "Direct messages — Debatify" },
      {
        name: "description",
        content:
          "Your private Debatify conversations: message other members one-to-one, with pictures and mentions.",
      },
      { property: "og:title", content: "Direct messages — Debatify" },
      { property: "og:description", content: "Your private one-to-one conversations on Debatify." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inbox,
});

function Inbox() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }, [loading, user, navigate]);

  const { data } = useQuery({
    queryKey: ["inbox", user?.id],
    queryFn: () => fetchInbox(user!.id),
    enabled: !!user,
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Messages</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Private conversations. Find someone with search, then hit Message.
      </p>

      <ul className="mt-8 space-y-3">
        {(data ?? []).map((c) => (
          <li key={c.other.id}>
            <Link
              to="/messages/$username"
              params={{ username: c.other.username }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <UserAvatar username={c.other.username} avatarUrl={c.other.avatar_url} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  @{c.other.username}
                  <RoleBadge role={c.other.role} className="size-4" />
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {c.last.body || "📷 Picture"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(c.last.created_at), { addSuffix: true })}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {data && data.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No conversations yet.</p>
      ) : null}
    </div>
  );
}
