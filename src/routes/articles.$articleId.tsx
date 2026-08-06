import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { deleteArticle, fetchArticle } from "@/lib/community";
import { UserAvatar } from "@/components/user-avatar";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/articles/$articleId")({
  head: () => ({
    meta: [
      { title: "Article — Debatify" },
      {
        name: "description",
        content: "A long-form take from the Debatify community. Read it, then take a side.",
      },
      { property: "og:title", content: "Article — Debatify" },
      {
        property: "og:description",
        content: "A long-form take from the Debatify community. Read it, then take a side.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArticleDetail,
});

function ArticleDetail() {
  const { articleId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["article", articleId],
    queryFn: () => fetchArticle(articleId),
  });

  async function remove() {
    try {
      await deleteArticle(articleId);
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Article deleted");
      navigate({ to: "/articles" });
    } catch {
      toast.error("Could not delete the article.");
    }
  }

  if (isLoading) {
    return <div className="mx-auto h-64 w-full max-w-3xl animate-pulse px-4 py-12" />;
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Article not found</h1>
        <Button asChild className="mt-6">
          <Link to="/articles">Back to articles</Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        to="/articles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All articles
      </Link>

      <span className="mt-6 block text-xs font-medium uppercase tracking-wide text-accent">
        {data.category}
      </span>
      <h1 className="mt-2 font-display text-4xl font-bold leading-tight">{data.title}</h1>
      {data.summary ? <p className="mt-3 text-lg text-muted-foreground">{data.summary}</p> : null}
      {data.image_url ? (
        <img
          src={data.image_url}
          alt={data.title}
          className="mt-6 w-full rounded-2xl border border-border object-cover"
        />
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-4 border-y border-border py-4">
        <div className="flex items-center gap-3">
          <Link to="/u/$username" params={{ username: data.author }}>
            <UserAvatar username={data.author} avatarUrl={data.avatar_url} />
          </Link>
          <div className="text-sm">
            <p className="flex items-center gap-1.5 font-medium">
              <Link to="/u/$username" params={{ username: data.author }} className="hover:underline">
                @{data.author}
              </Link>
              <RoleBadge role={data.role} className="size-4" />
            </p>
            <p className="text-muted-foreground">
              {new Date(data.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        {user?.id === data.author_id ? (
          <Button size="sm" variant="ghost" onClick={remove}>
            Delete
          </Button>
        ) : null}
      </div>

      <div className="mt-8 whitespace-pre-wrap text-base leading-7 text-foreground/90">
        {data.body}
      </div>
    </article>
  );
}
