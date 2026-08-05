import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Trophy, Users } from "lucide-react";
import { fetchLeaderboard, percent } from "@/lib/debatify";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — the most contested debates on Debatify" },
      {
        name: "description",
        content:
          "See which debate topics are pulling the most votes and comments right now, ranked live by community activity.",
      },
      { property: "og:title", content: "Debatify Leaderboard" },
      {
        property: "og:description",
        content: "The most voted and most argued-about debates, ranked live.",
      },
    ],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
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
            Ranked by total votes and comments across the community.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading rankings…</p>
      ) : (
        <ol className="mt-8 space-y-3">
          {(data ?? []).map((d, i) => {
            const p = percent(d.stats);
            return (
              <li key={d.id}>
                <Link
                  to="/debate/$debateId"
                  params={{ debateId: d.id }}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className="font-display text-2xl font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold">{d.title}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                        {d.category}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" /> {d.stats.total_votes}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="size-3.5" /> {d.stats.comment_count}
                      </span>
                    </div>
                    <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="bg-side-a" style={{ width: `${p.a}%` }} />
                      <div className="bg-side-b" style={{ width: `${p.b}%` }} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
