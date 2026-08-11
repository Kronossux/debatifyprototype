import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isUserBanned } from "@/lib/community";

/** Persistent notice for banned members, pointing them at the appeal room. */
export function BannedBanner() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["banned", user?.id],
    queryFn: () => isUserBanned(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });

  if (!data?.banned) return null;

  return (
    <div className="border-b border-destructive/30 bg-destructive/10">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-2 text-sm">
        <ShieldAlert className="size-4 text-destructive" />
        <span className="text-destructive">
          Your account is banned{data.reason ? ` — ${data.reason}` : ""}. You can't post right now.
        </span>
        <Link
          to="/appeal"
          className="ml-auto rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground"
        >
          File an appeal
        </Link>
      </div>
    </div>
  );
}
