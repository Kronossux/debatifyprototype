import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MessageSquare, Users } from "lucide-react";
import { toast } from "sonner";
import {
  addComment,
  castVote,
  fetchComments,
  fetchDebate,
  fetchMyVote,
  percent,
} from "@/lib/debatify";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/debate/$debateId")({
  head: () => ({
    meta: [
      { title: "Debate — Debatify" },
      {
        name: "description",
        content: "Cast your vote on this debate, see the live split and read what others argue.",
      },
      { property: "og:title", content: "Debate — Debatify" },
      {
        property: "og:description",
        content: "Vote, see live percentages and join the argument on Debatify.",
      },
    ],
  }),
  component: DebatePage,
});

function DebatePage() {
  const { debateId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: debate, isLoading } = useQuery({
    queryKey: ["debate", debateId],
    queryFn: () => fetchDebate(debateId),
  });
  const { data: myVote } = useQuery({
    queryKey: ["vote", debateId, user?.id],
    queryFn: () => fetchMyVote(debateId, user!.id),
    enabled: Boolean(user),
  });
  const { data: comments } = useQuery({
    queryKey: ["comments", debateId],
    queryFn: () => fetchComments(debateId),
  });

  const voteMutation = useMutation({
    mutationFn: (choice: "a" | "b") => castVote(debateId, user!.id, choice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debate", debateId] });
      queryClient.invalidateQueries({ queryKey: ["vote", debateId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["debates"] });
    },
    onError: () => toast.error("Could not save your vote."),
  });

  const [body, setBody] = useState("");
  const commentMutation = useMutation({
    mutationFn: () => addComment(debateId, user!.id, body.trim()),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["comments", debateId] });
      queryClient.invalidateQueries({ queryKey: ["debate", debateId] });
    },
    onError: () => toast.error("Could not post your comment."),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Loading…</div>;
  }
  if (!debate) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold">Debate not found</h1>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          Back to debates
        </Link>
      </div>
    );
  }

  const p = percent(debate.stats);
  const requireAuth = () => navigate({ to: "/auth", search: { mode: "signup" } });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All debates
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
          {debate.category}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Users className="size-3.5" /> {debate.stats.total_votes} votes
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MessageSquare className="size-3.5" /> {debate.stats.comment_count} comments
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{debate.title}</h1>
      {debate.description ? (
        <p className="mt-3 text-muted-foreground">{debate.description}</p>
      ) : null}

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2">
          <VoteButton
            side="a"
            label={debate.option_a}
            selected={myVote === "a"}
            onClick={() => (user ? voteMutation.mutate("a") : requireAuth())}
          />
          <VoteButton
            side="b"
            label={debate.option_b}
            selected={myVote === "b"}
            onClick={() => (user ? voteMutation.mutate("b") : requireAuth())}
          />
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-side-a">{p.empty ? "—" : `${p.a}%`}</span>
            <span className="text-side-b">{p.empty ? "—" : `${p.b}%`}</span>
          </div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-muted">
            <div className="bg-side-a transition-all duration-500" style={{ width: `${p.a}%` }} />
            <div className="bg-side-b transition-all duration-500" style={{ width: `${p.b}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {debate.stats.votes_a} for {debate.option_a} · {debate.stats.votes_b} for{" "}
            {debate.option_b}
            {user ? "" : " · sign in to vote"}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Comments</h2>

        {user ? (
          <div className="mt-4">
            <Textarea
              value={body}
              maxLength={1000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Make your case…"
              rows={3}
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                disabled={!body.trim() || commentMutation.isPending}
                onClick={() => commentMutation.mutate()}
              >
                Post comment
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            <Link to="/auth" className="font-medium text-primary hover:underline">
              Sign in
            </Link>{" "}
            to join the discussion.
          </div>
        )}

        <ul className="mt-6 space-y-4">
          {(comments ?? []).map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-semibold">@{c.author}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
            </li>
          ))}
          {comments && comments.length === 0 ? (
            <li className="text-sm text-muted-foreground">No comments yet. Start it off.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function VoteButton({
  side,
  label,
  selected,
  onClick,
}: {
  side: "a" | "b";
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const base =
    "rounded-xl border-2 px-4 py-4 text-center font-semibold transition-all hover:-translate-y-0.5";
  const tone =
    side === "a"
      ? selected
        ? "border-side-a bg-side-a text-side-a-foreground"
        : "border-side-a/40 text-side-a hover:border-side-a"
      : selected
        ? "border-side-b bg-side-b text-side-b-foreground"
        : "border-side-b/40 text-side-b hover:border-side-b";

  return (
    <button type="button" onClick={onClick} className={`${base} ${tone}`}>
      {label}
      {selected ? <span className="ml-2 text-xs opacity-80">your pick</span> : null}
    </button>
  );
}
