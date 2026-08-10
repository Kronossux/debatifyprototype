import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PenLine } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, fetchCategories } from "@/lib/debatify";
import { fetchArticles } from "@/lib/community";
import { UserAvatar } from "@/components/user-avatar";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/articles/")({
  head: () => ({
    meta: [
      { title: "Articles — long-form takes from the Debatify community" },
      {
        name: "description",
        content:
          "Read community-written articles on culture, sports, tech, science and entertainment — the arguments that don't fit in a comment box.",
      },
      { property: "og:title", content: "Debatify Articles" },
      {
        property: "og:description",
        content: "Long-form community takes on the debates everyone is arguing about.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArticlesPage,
});

function ArticlesPage() {
  const { user } = useAuth();
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const cats = categories ?? [...CATEGORIES];
  const [category, setCategory] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["articles", category],
    queryFn: () => fetchArticles(category ?? undefined),
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Articles</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Longer arguments, written by the community.
          </p>
        </div>
        <Button asChild>
          <Link to={user ? "/articles/new" : "/auth"} search={user ? {} : { mode: "signup" }}>
            <PenLine className="size-4" /> Write an article
          </Link>
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Chip active={category === null} onClick={() => setCategory(null)}>
          All
        </Chip>
        {cats.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {data.map((a) => (
            <Link
              key={a.id}
              to="/articles/$articleId"
              params={{ articleId: a.id }}
              className="rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/50"
            >
              {a.image_url ? (
                <img
                  src={a.image_url}
                  alt={a.title}
                  className="mb-4 h-36 w-full rounded-xl border border-border object-cover"
                />
              ) : null}
              <span className="text-xs font-medium uppercase tracking-wide text-accent">
                {a.category}
              </span>
              <h2 className="mt-2 font-display text-lg font-semibold leading-snug">{a.title}</h2>
              {a.summary ? (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.summary}</p>
              ) : null}
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <UserAvatar username={a.author} avatarUrl={a.avatar_url} className="size-6" />
                @{a.author}
                <RoleBadge role={a.role} className="size-4" />· {new Date(a.created_at).toLocaleDateString()}
              </div>

            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-sm text-muted-foreground">
          No articles here yet — write the first one.
        </p>
      )}
    </div>
  );
}

function Chip({
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
