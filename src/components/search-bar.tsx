import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { searchAll } from "@/lib/community";
import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";

/** Searches usernames and debate titles. */
export function SearchBar({ className }: { className?: string }) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 220);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const { data } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchAll(debounced),
    enabled: debounced.length > 0,
  });

  const hasResults = Boolean(data && (data.users.length || data.debates.length));

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        placeholder="Search people & debates"
        className="h-9 pl-9"
      />

      {open && debounced ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-card">
          {!hasResults ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">No matches for “{debounced}”.</p>
          ) : (
            <>
              {data!.users.length ? (
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  People
                </p>
              ) : null}
              {data!.users.map((u) => (
                <Link
                  key={u.id}
                  to="/u/$username"
                  params={{ username: u.username }}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
                >
                  <UserAvatar username={u.username} avatarUrl={u.avatar_url} className="size-6" />
                  <span className="truncate">@{u.username}</span>
                </Link>
              ))}

              {data!.debates.length ? (
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Debates
                </p>
              ) : null}
              {data!.debates.map((d) => (
                <Link
                  key={d.id}
                  to="/debate/$debateId"
                  params={{ debateId: d.id }}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary"
                >
                  <span className="line-clamp-1">{d.title}</span>
                  <span className="text-xs text-muted-foreground">{d.category}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
