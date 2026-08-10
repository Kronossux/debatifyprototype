import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, PenSquare, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchProfile } from "@/lib/community";
import { UserAvatar } from "@/components/user-avatar";
import { RoleBadge } from "@/components/role-badge";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, username, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Debatify logo" className="size-9 rounded-lg object-contain" />
          <span className="font-display text-lg font-bold tracking-tight">Debatify</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 text-sm sm:flex">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Debates
          </Link>
          <Link
            to="/articles"
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Articles
          </Link>
          <Link
            to="/chat"
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Chat
          </Link>
          <Link
            to="/leaderboard"
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Leaderboard
          </Link>
          {profile?.role === "admin" ? (
            <Link
              to="/admin"
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin
            </Link>
          ) : null}
          {profile?.role === "vice_admin" ? (
            <Link
              to="/vice-admin"
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              Vice admin
            </Link>
          ) : null}
          {profile?.role === "moderator" ? (
            <Link
              to="/moderator"
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              Moderator
            </Link>
          ) : null}
        </nav>


        <SearchBar className="ml-auto hidden w-56 md:block lg:w-72" />

        <div className="ml-auto flex items-center gap-2 md:ml-3">
          {loading ? null : user ? (
            <>
              <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex">
                <Link to="/new">
                  <PenSquare className="size-4" /> Start a debate
                </Link>
              </Button>
              <Button asChild size="icon" variant="ghost" title="Messages">
                <Link to="/messages">
                  <MessageCircle className="size-4" />
                </Link>
              </Button>
              <Link to="/profile" className="flex items-center gap-2">
                <UserAvatar
                  username={profile?.username ?? username}
                  avatarUrl={profile?.avatar_url}
                  className="size-8"
                />
                <span className="hidden items-center gap-1.5 text-sm text-muted-foreground md:inline-flex">
                  @{username}
                  <RoleBadge role={profile?.role} className="size-5" />
                </span>
              </Link>
              <Link
  to="/settings"
  className="
    group
    relative
    p-2
    rounded-full
    transition-all
    hover:ring-2
    hover:ring-black/40
    dark:hover:ring-white/40
  "
>
  <Settings
    className="
      size-5
      transition-transform
      group-hover:rotate-45
    "
  />
</Link>
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
