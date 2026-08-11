import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MessageSquare, Trophy, Users } from "lucide-react";
import { fetchLeaderboard, fetchTopUsers, percent } from "@/lib/debatify";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — top debates and top members on Debatify" },
      {
        name: "description",
        content:
          "See which debate topics are pulling the most votes and comments right now, and which members are driving the most discussion.",
      },
      { property: "og:title", content: "Debatify Leaderboard" },
      {
        property: "og:description",
        content: "The most voted debates and the most active members, ranked live.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Leaderboard,
});

type Tab = "debates" | "users";

function Leaderboard() {
  const [tab, setTab] = useState<Tab>("debates");

  const debatesQ = useQuery({ queryKey: ["leaderboard"], queryFn: fetchLeaderboard });
  const usersQ = useQuery({
    queryKey: ["top-users"],
    queryFn: () => fetchTopUsers(),
    enabled: tab === "users",
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Trophy className="size-5" />
        </span>
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            Ranked live by what the community votes on and argues about.
          </p>
        </div>
      </div>

      <div className="mt-6 inline-flex rounded-full border border-border bg-secondary p-1">
        {(
          [
            { id: "debates" as const, label: "Top debates", icon: <Trophy className="size-4" /> },
            { id: "users" as const, label: "Top users", icon: <Users className="size-4" /> },
          ]
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTab(option.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-all",
              tab === option.id
                ? "bg-primary text-primary-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>

      {tab === "debates" ? (
        debatesQ.isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading rankings…</p>
        ) : (
          <ol className="mt-8 space-y-3">
            {(debatesQ.data ?? []).map((d, i) => {
              const p = percent(d.stats);
              return (
                <li key={d.id}>
                  <Link
                    to="/debate/$debateId"
                    params={{ debateId: d.id }}
                    className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <span data-no-translate className="font-display text-2xl font-bold text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold">{d.title}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                          {d.category}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5" /> {d.stats.total_votes} votes
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="size-3.5" /> {d.stats.comment_count} comments
                        </span>
                      </div>
                      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-secondary">
                        <span className="bg-side-a" style={{ width: `${p.a}%` }} />
                        <span className="bg-side-b" style={{ width: `${p.b}%` }} />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
            {debatesQ.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No debates yet.</p>
            ) : null}
          </ol>
        )
      ) : usersQ.isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Counting contributions…</p>
      ) : (
        <ol className="mt-8 space-y-3">
          {(usersQ.data ?? []).map((u, i) => (
            <li key={u.id}>
              <Link
                to="/u/$username"
                params={{ username: u.username }}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span data-no-translate className="font-display text-2xl font-bold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <UserAvatar username={u.username} avatarUrl={u.avatar_url} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p data-no-translate className="truncate font-semibold">
                    @{u.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {u.debates} debates · {u.comments} comments · {u.votes} votes
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
                  {u.score}
                </span>
              </Link>
            </li>
          ))}
          {usersQ.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : null}
        </ol>
      )}
    </div>
  );
}
