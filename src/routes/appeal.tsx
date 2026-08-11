import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchAppeal, isUserBanned, sendAppealMessage } from "@/lib/community";
import { useStaffRole } from "@/lib/staff";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/appeal")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Appeal a ban — Debatify" },
      {
        name: "description",
        content:
          "Banned from Debatify? Explain what happened in your private appeal room and the moderation team will review it.",
      },
      { property: "og:title", content: "Appeal a ban — Debatify" },
      { property: "og:description", content: "Private room to appeal a Debatify ban." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AppealPage,
});

function AppealPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: staff } = useStaffRole();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: ban } = useQuery({
    queryKey: ["banned", user?.id],
    queryFn: () => isUserBanned(user!.id),
    enabled: !!user,
  });

  const { data: thread } = useQuery({
    queryKey: ["appeal", user?.id],
    queryFn: () => fetchAppeal(user!.id),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted-foreground">
        <Link to="/auth" className="text-primary hover:underline">
          Sign in
        </Link>{" "}
        to open your appeal room.
      </div>
    );
  }

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    try {
      await sendAppealMessage(user!.id, user!.id, body);
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["appeal", user!.id] });
    } catch {
      toast.error("Could not send that.");
    } finally {
      setSending(false);
    }
  }

  const isStaff = !!staff?.role && staff.role !== "user";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Ban appeal</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {ban?.banned
          ? `You're currently banned${ban.reason ? ` — ${ban.reason}` : ""}. Explain your side here; only you and the staff can read this room.`
          : "Your account isn't banned. This room stays here in case that ever changes."}
      </p>

      <div
        data-manual-translate
        className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card"
      >
        {(thread ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          (thread ?? []).map((m) => (
            <div key={m.id} className="flex items-start gap-3">
              <UserAvatar username={m.author} avatarUrl={m.avatar_url} className="size-8" />
              <div className="min-w-0">
                <p data-no-translate className="text-sm font-semibold">
                  @{m.author}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  </span>
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{m.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1500}
          rows={4}
          placeholder={isStaff ? "Reply to this appeal…" : "Explain what happened…"}
        />
        <Button onClick={send} disabled={sending || !body.trim()}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
