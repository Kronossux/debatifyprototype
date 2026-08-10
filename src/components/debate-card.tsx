import { Link } from "@tanstack/react-router";
import { MessageSquare, Star, Users } from "lucide-react";
import { percent, type DebateWithStats } from "@/lib/debatify";
import { UserAvatar } from "@/components/user-avatar";
import { ModerationActions } from "@/components/moderation-actions";

export function DebateCard({ debate }: { debate: DebateWithStats }) {
  const p = percent(debate.stats);

  return (
    <div className="group relative rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className="absolute right-3 top-3 z-10">
        <ModerationActions
          targetType="debate"
          targetId={debate.id}
          ownerId={debate.created_by}
        />
      </div>

      <Link to="/debate/$debateId" params={{ debateId: debate.id }} className="block">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
            {debate.category}
          </span>
          {debate.featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-1 font-medium text-accent">
              <Star className="size-3" /> Featured
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Users className="size-3.5" /> {debate.stats.total_votes}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="size-3.5" /> {debate.stats.comment_count}
          </span>
        </div>

        <h3 className="mt-3 pr-8 text-lg font-semibold leading-snug group-hover:text-primary">
          {debate.title}
        </h3>
        {debate.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{debate.description}</p>
        ) : null}

        <div className="mt-4">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-side-a">
              {debate.option_a} · {p.empty ? "—" : `${p.a}%`}
            </span>
            <span className="text-side-b">
              {p.empty ? "—" : `${p.b}%`} · {debate.option_b}
            </span>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
            <div className="bg-side-a transition-all" style={{ width: `${p.a}%` }} />
            <div className="bg-side-b transition-all" style={{ width: `${p.b}%` }} />
          </div>
        </div>
      </Link>

      {debate.author ? (
        <Link
          to="/u/$username"
          params={{ username: debate.author }}
          className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <UserAvatar
            username={debate.author}
            avatarUrl={debate.author_avatar}
            className="size-5"
          />
          Started by @{debate.author}
        </Link>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">Started by Debatify</p>
      )}
    </div>
  );
}
