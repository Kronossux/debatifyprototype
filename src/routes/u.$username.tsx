import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchArticles, fetchProfileByUsername } from "@/lib/community";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Debatify` },
      {
        name: "description",
        content: `See @${params.username}'s Debatify profile: their bio, badges and published articles, and send them a direct message.`,
      },
      { property: "og:title", content: `@${params.username} on Debatify` },
      {
        property: "og:description",
        content: `Bio, badges and articles from @${params.username} on Debatify.`,
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", username.toLowerCase()],
    queryFn: () => fetchProfileByUsername(username),
  });

  const { data: articles } = useQuery({
    queryKey: ["articles"],
    queryFn: () => fetchArticles(),
  });

  if (isLoading) {
    return <div className="mx-auto h-48 w-full max-w-2xl animate-pulse px-4 py-12" />;
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">No member called @{username}</h1>
        <Button asChild className="mt-6">
          <Link to="/">Back to debates</Link>
        </Button>
      </div>
    );
  }

  const theirArticles = (articles ?? []).filter((a) => a.author_id === profile.id);
  const isMe = user?.id === profile.id;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
        <UserAvatar
          username={profile.username}
          avatarUrl={profile.avatar_url}
          className="size-20"
        />
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            @{profile.username}
          </h1>
          {profile.role && profile.role !== "user" ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accent">
              {profile.role === "vice_admin" ? "Vice admin" : profile.role}
            </p>
          ) : null}
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {profile.bio || "This member hasn't written a bio yet."}
          </p>
        </div>
        {isMe ? (
          <Button asChild size="sm" variant="secondary">
            <Link to="/profile">Edit profile</Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link
              to={user ? "/messages/$username" : "/auth"}
              params={user ? { username: profile.username } : {}}
              search={user ? {} : { mode: "signin" as const }}

            >
              <MessageCircle className="size-4" /> Message
            </Link>
          </Button>
        )}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Articles</h2>
        {theirArticles.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing published yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {theirArticles.map((a) => (
              <li key={a.id}>
                <Link
                  to="/articles/$articleId"
                  params={{ articleId: a.id }}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-accent">
                    {a.category}
                  </span>
                  <p className="mt-1 font-semibold">{a.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
