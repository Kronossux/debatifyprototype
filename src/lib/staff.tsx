import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { getMyStaffRole } from "@/lib/staff.functions";

export type StaffRole = "admin" | "vice_admin" | "moderator" | "user";

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Admin",
  vice_admin: "Vice admin",
  moderator: "Moderator",
  user: "Member",
};

const RANK: Record<StaffRole, number> = { admin: 3, vice_admin: 2, moderator: 1, user: 0 };

export function useStaffRole() {
  const fn = useServerFn(getMyStaffRole);
  return useQuery({
    queryKey: ["staff-role"],
    queryFn: async () => {
      try {
        return await fn();
      } catch {
        return { userId: null as string | null, role: "user" as StaffRole };
      }
    },
    staleTime: 30_000,
    retry: false,
  });
}

export function hasAtLeast(role: StaffRole | undefined, min: StaffRole) {
  return RANK[role ?? "user"] >= RANK[min];
}

export function AccessDenied({ needed }: { needed: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold">Access denied</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This area is restricted to {needed}. Your account doesn't have permission to view it, and the
        server rejected the request.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Back to Debatify
      </Link>
    </div>
  );
}

export function StaffLoading() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center text-sm text-muted-foreground">
      Checking permissions…
    </div>
  );
}
