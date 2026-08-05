import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  username,
  avatarUrl,
  className,
}: {
  username: string | null;
  avatarUrl?: string | null | undefined;
  className?: string | undefined;
}) {
  const initial = (username ?? "?").trim().charAt(0).toUpperCase();
  return (
    <Avatar className={cn("size-9 border border-border", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={`${username ?? "member"} avatar`} /> : null}
      <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
