import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchConversation, fetchProfileByUsername, sendDirectMessage } from "@/lib/community";
import { UserAvatar } from "@/components/user-avatar";
import { MessageText } from "@/components/message-text";
import { MessageComposer } from "@/components/message-composer";

export const Route = createFileRoute("/messages/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `Chat with @${params.username} — Debatify` },
      {
        name: "description",
        content: `Your private Debatify conversation with @${params.username}. Send text, mentions and pictures.`,
      },
      { property: "og:title", content: `Chat with @${params.username} — Debatify` },
      {
        property: "og:description",
        content: "Private one-to-one messaging on Debatify.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DmThread,
});

function DmThread() {
  const { username } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }, [loading, user, navigate]);

  const { data: other } = useQuery({
    queryKey: ["public-profile", username.toLowerCase()],
    queryFn: () => fetchProfileByUsername(username),
  });

  const { data: messages } = useQuery({
    queryKey: ["dm", user?.id, other?.id],
    queryFn: () => fetchConversation(user!.id, other!.id),
    enabled: !!user && !!other,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        () => void queryClient.invalidateQueries({ queryKey: ["dm"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(body: string, imageUrl: string | null) {
    if (!user || !other) return;
    try {
      await sendDirectMessage(user.id, other.id, body, imageUrl);
      await queryClient.invalidateQueries({ queryKey: ["dm"] });
      await queryClient.invalidateQueries({ queryKey: ["inbox"] });
    } catch {
      toast.error("Message didn't send.");
    }
  }

  if (!other) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center text-muted-foreground">
        Looking for @{username}…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-8">
      <Link
        to="/messages"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All messages
      </Link>

      <Link
        to="/u/$username"
        params={{ username: other.username }}
        className="mt-4 flex items-center gap-3"
      >
        <UserAvatar username={other.username} avatarUrl={other.avatar_url} />
        <span className="flex items-center gap-1.5 font-display text-xl font-bold">
          @{other.username}
        </span>
      </Link>

      <div className="mt-4 flex h-[55vh] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-card">
        {(messages ?? []).map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                mine
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-secondary text-secondary-foreground"
              }`}
            >
              {m.image_url ? (
                <img
                  src={m.image_url}
                  alt="Attachment"
                  className="mb-2 max-h-64 rounded-xl object-cover"
                />
              ) : null}
              {m.body ? <MessageText text={m.body} className="whitespace-pre-wrap" /> : null}
            </div>
          );
        })}
        {messages && messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet — say hello.</p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4">
        <MessageComposer placeholder={`Message @${other.username}…`} onSend={send} />
      </div>
    </div>
  );
}
