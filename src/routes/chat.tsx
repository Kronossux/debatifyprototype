import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchChat, sendChatMessage } from "@/lib/community";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Global chat — Debatify" },
      {
        name: "description",
        content:
          "Jump into Debatify's global chat room: one live feed where the whole community argues, jokes and reacts in real time.",
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
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({ queryKey: ["chat"], queryFn: () => fetchChat() });

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
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user) return;
    setBusy(true);
    try {
      await sendChatMessage(user.id, body.slice(0, 500));
      setText("");
      await queryClient.invalidateQueries({ queryKey: ["chat"] });
    } catch {
      toast.error("Message didn't send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Global chat</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        One room, everyone in it. Be sharp, not cruel.
      </p>

      <div className="mt-6 flex h-[60vh] flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-card">
        {!messages ? (
          <p className="text-sm text-muted-foreground">Loading the room…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet — say something first.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex items-start gap-3">
              <UserAvatar username={m.author} avatarUrl={m.avatar_url} className="size-8" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">@{m.author}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{m.body}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {user ? (
        <form onSubmit={send} className="mt-4 flex gap-2">
          <Input
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Say something as @${username ?? "you"}…`}
          />
          <Button type="submit" disabled={busy || !text.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
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
