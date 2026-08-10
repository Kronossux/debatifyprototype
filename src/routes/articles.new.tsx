import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, fetchCategories } from "@/lib/debatify";
import { createArticle, fileToImageDataUrl } from "@/lib/community";
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
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const cats = categories ?? [...CATEGORIES];
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [cover, setCover] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    body: "",
    category: CATEGORIES[0] as string,
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signup" }, replace: true });
  }, [loading, user, navigate]);

  async function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Pick an image under 10MB.");
      return;
    }
    try {
      setCover(await fileToImageDataUrl(file, 1200));
    } catch {
      toast.error("That image couldn't be read.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Add a title (8+ chars) and at least a short article body (50+ chars).");
      return;
    }
    setBusy(true);
    try {
      const id = await createArticle({ ...parsed.data, author_id: user!.id, image_url: cover });
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
            {cats.map((c) => (
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
          <Label>Cover picture</Label>
          {cover ? (
            <img
              src={cover}
              alt="Selected article cover"
              className="max-h-64 w-full rounded-xl border border-border object-cover"
            />
          ) : null}
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              {cover ? "Change picture" : "Add picture"}
            </Button>
            {cover ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => setCover(null)}>
                Remove
              </Button>
            ) : null}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickCover} />
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
