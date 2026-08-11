import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchChat, sendChatMessage } from "@/lib/community";
import { useStaffRole } from "@/lib/staff";
import { UserAvatar } from "@/components/user-avatar";
import { MessageText } from "@/components/message-text";
import { MessageComposer } from "@/components/message-composer";
import { ModerationActions } from "@/components/moderation-actions";
import { TranslateAllButton } from "@/lib/auto-translate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Global chat — Debatify" },
      {
        name: "description",
        content:
          "Jump into Debatify's global chat room: one live feed where the whole community argues, jokes and reacts in real time — with pictures and @mentions.",
      },
      { property: "og:title", content: "Global chat — Debatify" },
      {
        property: "og:description",
        content: "One live room for the whole Debatify community. Sign in and join the conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { user, username } = useAuth();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { data: staff } = useStaffRole();
  const isStaff = !!staff?.role && staff.role !== "user";
  const [showDeleted, setShowDeleted] = useState(false);

  const { data: messages } = useQuery({ queryKey: ["chat"], queryFn: () => fetchChat() });

  const visible = useMemo(
    () => (messages ?? []).filter((m) => !m.deleted_at || (isStaff && showDeleted)),
    [messages, isStaff, showDeleted],
  );
  const hiddenCount = (messages ?? []).filter((m) => m.deleted_at).length;

  useEffect(() => {
    const channel = supabase
      .channel("global-chat")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => void queryClient.invalidateQueries({ queryKey: ["chat"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visible.length]);

  async function send(body: string, imageUrl: string | null) {
    if (!user) return;
    try {
      await sendChatMessage(user.id, body.slice(0, 500), imageUrl);
      await queryClient.invalidateQueries({ queryKey: ["chat"] });
    } catch {
      toast.error("Message didn't send.");
    }
  }

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["chat"] });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Global chat</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        One room, everyone in it. Type @ to mention someone, or attach a picture.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <TranslateAllButton targetRef={listRef} label="Translate all messages" />
        {isStaff ? (
          <button
            type="button"
            onClick={() => setShowDeleted((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <EyeOff className="size-3.5" />
            {showDeleted ? "Hide deleted messages" : `See deleted messages (${hiddenCount})`}
          </button>
        ) : null}
      </div>

      <div
        ref={listRef}
        data-manual-translate
        className="mt-4 flex h-[60vh] flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-card"
      >
        {!messages ? (
          <p className="text-sm text-muted-foreground">Loading the room…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet — say something first.</p>
        ) : (
          visible.map((m) => (
            <div key={m.id} className={cn("flex items-start gap-3", m.deleted_at && "opacity-60")}>
              <Link to="/u/$username" params={{ username: m.author }}>
                <UserAvatar username={m.author} avatarUrl={m.avatar_url} className="size-8" />
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Link
                    to="/u/$username"
                    params={{ username: m.author }}
                    data-no-translate
                    className="text-sm font-semibold hover:underline"
                  >
                    @{m.author}
                  </Link>
                  <span data-no-translate className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {m.deleted_at ? (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                      Deleted
                    </span>
                  ) : null}
                  <ModerationActions
                    targetType="chat"
                    targetId={m.id}
                    ownerId={m.user_id}
                    deleted={!!m.deleted_at}
                    onDone={refresh}
                  />
                </div>
                {m.body ? (
                  <MessageText
                    text={m.body}
                    className="whitespace-pre-wrap break-words text-sm text-foreground/90"
                  />
                ) : null}
                {m.image_url ? (
                  <img
                    src={m.image_url}
                    alt={`Picture shared by ${m.author}`}
                    className="mt-2 max-h-72 rounded-xl border border-border object-cover"
                  />
                ) : null}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {user ? (
        <div className="mt-4">
          <MessageComposer
            placeholder={`Say something as @${username ?? "you"}…`}
            maxLength={500}
            onSend={send}
          />
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <span className="text-muted-foreground">Sign in to join the chat.</span>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Sign in
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
