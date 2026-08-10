import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/community";

const HOVER_TEXT: Record<string, string> = {
  admin: "This dude is admin.",
  vice_admin: "This dude is vice admin.",
  moderator: "This dude is a moderator.",
};

const BADGES: Record<string, string> = {
  admin: "/badges/admin.png",
  vice_admin: "/badges/vice_admin.png",
  moderator: "/badges/moderator.png",
};

export function RoleBadge({
  role,
  className,
}: {
  role: AppRole | null | undefined;
  className?: string;
}) {
  if (!role || role === "user") return null;

  const badge = BADGES[role];
  const hoverText = HOVER_TEXT[role];

  if (!badge || !hoverText) return null;

  return (
    <span className="relative group inline-flex items-center">
      {/* Badge image */}
      <img
        src={badge}
        alt={role}
        className={cn(
          "size-5 cursor-help rounded-full object-cover ring-1 ring-border",
          className
        )}
      />

      {/* Hover tooltip */}
      <span
        className="
          pointer-events-none
          absolute
          left-1/2
          bottom-full
          mb-2
          -translate-x-1/2
          rounded-lg
          bg-black/90
          border border-white/10
          px-3
          py-2
          text-xs
          text-white
          opacity-0
          group-hover:opacity-100
          transition-opacity
          duration-150
          whitespace-nowrap
          z-50
          shadow-lg
        "
      >
        {hoverText}
      </span>
    </span>
  );
}
