import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/debatify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  title: z.string().trim().min(10).max(140),
  description: z.string().trim().max(600),
  category: z.string().trim().min(1),
  option_a: z.string().trim().min(1).max(24),
  option_b: z.string().trim().min(1).max(24),
});

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "Start a debate — Debatify" },
      {
        name: "description",
        content:
          "Post a new debate topic, define the two sides and let the community vote and argue it out.",
      },
      { property: "og:title", content: "Start a debate on Debatify" },
      {
        property: "og:description",
        content: "Post a topic, set the two sides, and let the votes decide.",
      },
    ],
  }),
  component: NewDebate,
});

function NewDebate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0] as string,
    option_a: "Yes",
    option_b: "No",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signup" }, replace: true });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Give the debate a title of at least 10 characters and label both sides.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("debates")
      .insert({ ...parsed.data, created_by: user!.id })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error("Could not publish the debate.");
      return;
    }
    toast.success("Debate published");
    navigate({ to: "/debate/$debateId", params: { debateId: data.id } });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Start a debate</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Keep it sharp and genuinely two-sided. Everyone can vote once.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="space-y-2">
          <Label htmlFor="title">Question</Label>
          <Input
            id="title"
            value={form.title}
            maxLength={140}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Should AI-generated art win human competitions?"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Context (optional)</Label>
          <Textarea
            id="description"
            rows={3}
            maxLength={600}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="A sentence or two framing both sides."
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="a" className="text-side-a">
              Side A
            </Label>
            <Input
              id="a"
              maxLength={24}
              value={form.option_a}
              onChange={(e) => setForm({ ...form, option_a: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b" className="text-side-b">
              Side B
            </Label>
            <Input
              id="b"
              maxLength={24}
              value={form.option_b}
              onChange={(e) => setForm({ ...form, option_b: e.target.value })}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Publishing…" : "Publish debate"}
        </Button>
      </form>
    </div>
  );
}
