import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, PenSquare, Settings, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  countNewReports,
  countUnreadMessages,
  fetchProfile,
  fetchSeenTimestamps,
} from "@/lib/community";
import { UserAvatar } from "@/components/user-avatar";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";

const NAV_LINK =
  "rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground";

function Dot({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span
      data-no-translate
      aria-label={`${count} new`}
      className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground shadow"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function SiteHeader() {
  const { user, username, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const staffRole = profile?.role;
  const isStaff = staffRole === "admin" || staffRole === "vice_admin" || staffRole === "moderator";

  const { data: alerts } = useQuery({
    queryKey: ["alerts", user?.id, isStaff],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const seen = await fetchSeenTimestamps(user!.id);
      const [messages, reports] = await Promise.all([
        countUnreadMessages(user!.id, seen.messages_seen_at),
        isStaff ? countNewReports(seen.reports_seen_at) : Promise.resolve(0),
      ]);
      return { messages, reports };
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const staffLink =
    staffRole === "admin"
      ? { to: "/admin" as const, label: "Admin" }
      : staffRole === "vice_admin"
        ? { to: "/vice-admin" as const, label: "Vice admin" }
        : staffRole === "moderator"
          ? { to: "/moderator" as const, label: "Moderator" }
          : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/logo.png" alt="Debatify logo" className="size-9 rounded-lg object-contain" />
          <span className="font-display text-lg font-bold tracking-tight">Debatify</span>
        </Link>

        <nav className="ml-2 hidden shrink-0 items-center gap-0.5 text-sm lg:flex">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "bg-secondary text-secondary-foreground" }} className={NAV_LINK}>
            Debates
          </Link>
          <Link to="/articles" activeProps={{ className: "bg-secondary text-secondary-foreground" }} className={NAV_LINK}>
            Articles
          </Link>
          <Link to="/chat" activeProps={{ className: "bg-secondary text-secondary-foreground" }} className={NAV_LINK}>
            Chat
          </Link>
          <Link to="/leaderboard" activeProps={{ className: "bg-secondary text-secondary-foreground" }} className={NAV_LINK}>
            Leaderboard
          </Link>
        </nav>

        <SearchBar className="ml-auto hidden w-44 md:block lg:w-64" />

        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-3">
          {loading ? null : user ? (
            <>
              {staffLink ? (
                <Button asChild size="icon" variant="ghost" className="relative" title={staffLink.label}>
                  <Link to={staffLink.to}>
                    <ShieldAlert className="size-4" />
                    <Dot count={alerts?.reports ?? 0} />
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex">
                <Link to="/new">
                  <PenSquare className="size-4" /> Start a debate
                </Link>
              </Button>
              <Button asChild size="icon" variant="ghost" className="relative" title="Messages">
                <Link to="/messages">
                  <MessageCircle className="size-4" />
                  <Dot count={alerts?.messages ?? 0} />
                </Link>
              </Button>
              <Link to="/profile" className="flex items-center gap-2">
                <UserAvatar
                  username={profile?.username ?? username}
                  avatarUrl={profile?.avatar_url}
                  className="size-8"
                />
                <span data-no-translate className="hidden text-sm text-muted-foreground xl:inline">
                  @{username}
                </span>
              </Link>
              <Link
                to="/settings"
                title="Settings"
                className="group relative rounded-full p-2 transition-all hover:ring-2 hover:ring-foreground/30"
              >
                <Settings className="size-5 transition-transform group-hover:rotate-45" />
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="hidden rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground xl:inline-flex"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Join
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
