import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Flame } from "lucide-react";
import { fetchCategories, fetchDebates, pickDailyDebate } from "@/lib/debatify";
import { DebateCard } from "@/components/debate-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Debatify — Vote on the debates people actually care about" },
      {
        name: "description",
        content:
          "Browse hot debate topics across culture, sports, tech, science and entertainment. Cast your vote, see live percentages and argue it out in the comments.",
      },
      { property: "og:title", content: "Debatify — Vote on the debates people actually care about" },
      {
        property: "og:description",
        content: "Browse hot debate topics across culture, sports, tech, science and entertainment. Cast your vote, see live percentages and argue it out in the comments.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [category, setCategory] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["debates", category],
    queryFn: () => fetchDebates(category ?? undefined),
  });
  const { data: allDebates } = useQuery({ queryKey: ["debates", null], queryFn: () => fetchDebates() });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const daily = pickDailyDebate(allDebates ?? []);
  const featured = (allDebates ?? []).filter((d) => d.featured);

  return (
    <div>
      <section className="surface-grid border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Flame className="size-3.5 text-accent" /> Live community rankings
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl">
            Pick a side. <span className="text-primary">Watch the world</span> disagree.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Debatify turns hot takes into hard numbers. Vote on real debates, see the split update
            live, and back your position in the comments.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create an account <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/leaderboard">See the leaderboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {daily ? (
        <section className="mx-auto w-full max-w-6xl px-4 pt-10">
          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
              <Flame className="size-3.5" /> Debate of the day
            </span>
            <h2 className="mt-2 text-2xl font-bold leading-snug">{daily.title}</h2>
            {daily.description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{daily.description}</p>
            ) : null}
            <Button asChild className="mt-4" size="sm">
              <Link to="/debate/$debateId" params={{ debateId: daily.id }}>
                Cast your vote <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-4 pt-10">
          <h2 className="font-display text-xl font-bold">Featured by the staff</h2>
          <p className="text-sm text-muted-foreground">
            Debates admins have pinned as worth your vote.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {featured.map((d) => (
              <DebateCard key={d.id} debate={d} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={category === null} onClick={() => setCategory(null)}>
            All
          </FilterChip>
          {(categories ?? []).map((c) => (
            <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </FilterChip>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {data.map((d) => (
              <DebateCard key={d.id} debate={d} />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-sm text-muted-foreground">
            No debates in this category yet — be the first to start one.
          </p>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
          : "rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}
