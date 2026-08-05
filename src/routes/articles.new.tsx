import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/debatify";
import { createArticle } from "@/lib/community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  title: z.string().trim().min(8).max(140),
  summary: z.string().trim().max(300),
  body: z.string().trim().min(50),
  category: z.string().trim().min(1),
});

export const Route = createFileRoute("/articles/new")({
  head: () => ({
    meta: [
      { title: "Write an article — Debatify" },
      {
        name: "description",
        content: "Publish a long-form take for the Debatify community to read, argue with and share.",
      },
      { property: "og:title", content: "Write an article on Debatify" },
      { property: "og:description", content: "Publish your long-form take for the community." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewArticle,
});

function NewArticle() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    body: "",
    category: CATEGORIES[0] as string,
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signup" }, replace: true });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Add a title (8+ chars) and at least a short article body (50+ chars).");
      return;
    }
    setBusy(true);
    try {
      const id = await createArticle({ ...parsed.data, author_id: user!.id });
      toast.success("Article published");
      navigate({ to: "/articles/$articleId", params: { articleId: id } });
    } catch {
      toast.error("Could not publish the article.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Write an article</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Make the case properly — evidence beats volume.
      </p>

      <form
        onSubmit={submit}
        className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card"
      >
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            maxLength={140}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Why streaming ruined the album"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">Summary (optional)</Label>
          <Textarea
            id="summary"
            rows={2}
            maxLength={300}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="One or two lines that make people click."
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, category: c })}
                className={
                  form.category === c
                    ? "rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground"
                    : "rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Article</Label>
          <Textarea
            id="body"
            rows={14}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Write your argument…"
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Publishing…" : "Publish article"}
        </Button>
      </form>
    </div>
  );
}
