import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { fileToImageDataUrl, searchUsers } from "@/lib/community";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Shared composer for chat, comments and DMs:
 * text + @mention autocomplete + one optional picture.
 */
export function MessageComposer({
  placeholder,
  submitLabel = "Send",
  rows = 2,
  maxLength = 1000,
  busy,
  onSend,
}: {
  placeholder: string;
  submitLabel?: string;
  rows?: number;
  maxLength?: number;
  busy?: boolean;
  onSend: (body: string, imageUrl: string | null) => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mentionTerm, setMentionTerm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const { data: suggestions } = useQuery({
    queryKey: ["mention", mentionTerm],
    queryFn: () => searchUsers(mentionTerm!),
    enabled: mentionTerm !== null && mentionTerm.length > 0,
  });

  function onChange(value: string) {
    setText(value);
    const caret = areaRef.current?.selectionStart ?? value.length;
    const match = /@([a-zA-Z0-9_]{1,20})$/.exec(value.slice(0, caret));
    setMentionTerm(match ? (match[1] ?? "") : null);
  }

  function applyMention(username: string) {
    const caret = areaRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([a-zA-Z0-9_]{1,20})$/, `@${username} `);
    setText(before + text.slice(caret));
    setMentionTerm(null);
    areaRef.current?.focus();
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Pick an image under 10MB.");
      return;
    }
    setUploading(true);
    try {
      setImage(await fileToImageDataUrl(file));
    } catch {
      toast.error("That image couldn't be read.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body && !image) return;
    await onSend(body.slice(0, maxLength), image);
    setText("");
    setImage(null);
    setMentionTerm(null);
  }

  const disabled = busy || uploading || (!text.trim() && !image);

  return (
    <form onSubmit={submit} className="relative">
      {mentionTerm && suggestions && suggestions.length > 0 ? (
        <ul className="absolute bottom-full z-30 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-card">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => applyMention(s.username)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary"
              >
                <UserAvatar username={s.username} avatarUrl={s.avatar_url} className="size-6" />
                @{s.username}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {image ? (
        <div className="relative mb-2 inline-block">
          <img
            src={image}
            alt="Attached preview"
            className="max-h-40 rounded-xl border border-border object-cover"
          />
          <button
            type="button"
            onClick={() => setImage(null)}
            aria-label="Remove attached picture"
            className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/90 text-foreground shadow-card"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <Textarea
        ref={areaRef}
        rows={rows}
        maxLength={maxLength}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-4" /> {uploading ? "Adding…" : "Picture"}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
        <Button type="submit" size="sm" disabled={disabled}>
          <Send className="size-4" /> {submitLabel}
        </Button>
      </div>
    </form>
  );
}
