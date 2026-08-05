import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isValidUsername, useAuth, usernameToEmail } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Search = { mode?: "signup" | "signin" };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    mode: search["mode"] === "signup" ? "signup" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or join — Debatify" },
      {
        name: "description",
        content:
          "Create a Debatify account with just a username and password. No email, no phone number — stay anonymous while you vote and comment.",
      },
      { property: "og:title", content: "Join Debatify" },
      {
        property: "og:description",
        content: "Username and password only. No email required.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSignUp, setIsSignUp] = useState(search.mode === "signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidUsername(username)) {
      toast.error("Username must be 3–20 letters, numbers or underscores.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    const email = usernameToEmail(username);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username.trim() } },
        });
        if (error) throw error;
        toast.success(`Welcome, @${username.trim()}`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
      navigate({ to: "/", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(
        message.includes("already registered")
          ? "That username is taken."
          : message.includes("Invalid login")
            ? "Wrong username or password."
            : message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-bold">{isSignUp ? "Join Debatify" : "Welcome back"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Username and password only. No email, no phone number — you stay anonymous.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            autoComplete="username"
            maxLength={20}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="hot_take_haver"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => setIsSignUp((v) => !v)}
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>
        {isSignUp ? (
          <p className="text-center text-xs text-muted-foreground">
            There is no password reset — keep your password safe.
          </p>
        ) : null}
      </form>
    </div>
  );
}
