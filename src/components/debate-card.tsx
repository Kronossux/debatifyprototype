import { Link } from "@tanstack/react-router";
import { MessageSquare, Users } from "lucide-react";
import { percent, type DebateWithStats } from "@/lib/debatify";

export function DebateCard({ debate }: { debate: DebateWithStats }) {
  const p = percent(debate.stats);

  return (
    <Link
      to="/debate/$debateId"
      params={{ debateId: debate.id }}
      className="group block rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
          {debate.category}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Users className="size-3.5" /> {debate.stats.total_votes}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MessageSquare className="size-3.5" /> {debate.stats.comment_count}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug group-hover:text-primary">
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
  );
}
