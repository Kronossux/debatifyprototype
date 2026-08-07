import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Moon,
  Sun,
  MonitorSmartphone,
  Sparkles,
  Languages,
  Link2,
  Trash2,
  LogOut,
  RotateCcw,
  Check,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePreferences, ACCENTS, ACCENT_SWATCH, type ThemeMode } from "@/lib/preferences";
import { LANGUAGES, translator } from "@/lib/i18n";
import { deleteMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Debatify" },
      {
        name: "description",
        content:
          "Switch between dawn and dusk mode, pick a rainbow color theme, choose your language, tune animations, link an account or delete it.",
      },
      { property: "og:title", content: "Debatify settings" },
      {
        property: "og:description",
        content: "Theme, language, motion and account controls for your Debatify profile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        {icon}
        {title}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const { user, username } = useAuth();
  const { prefs, setPref, reset } = usePreferences();
  const t = translator(prefs.language);

  const [flipped, setFlipped] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const themes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: "dawn", label: t("dawn"), icon: <Sun className="size-4" /> },
    { id: "dusk", label: t("dusk"), icon: <Moon className="size-4" /> },
    { id: "system", label: t("system"), icon: <MonitorSmartphone className="size-4" /> },
  ];

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  async function linkAccount() {
    if (!linkEmail.trim()) return;
    setLinking(true);
    const { error } = await supabase.auth.updateUser({ email: linkEmail.trim() });
    setLinking(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLinkEmail("");
    toast.success("Check that inbox to confirm the link.");
  }

  async function removeAccount() {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the account.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("settings")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {username ? `Signed in as @${username}.` : "Browsing as a guest."} Preferences are saved
            on this device.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="size-4" /> Reset
        </Button>
      </div>

      <div className="mt-8 space-y-6">
        <Section title={t("appearance")} icon={<Sun className="size-4 text-primary" />}>
          <Row label={t("mode")} hint="Dawn is bright and warm, dusk is dark and calm.">
            <div className="inline-flex rounded-full border border-border bg-secondary p-1">
              {themes.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPref("theme", option.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all",
                    prefs.theme === option.id
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </Row>

          <div>
            <p className="text-sm font-medium">{t("colorTheme")}</p>
            <p className="text-xs text-muted-foreground">Every color of the rainbow.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ACCENTS.map((accent) => (
                <button
                  key={accent.id}
                  type="button"
                  aria-label={accent.label}
                  title={accent.label}
                  onClick={() => setPref("accent", accent.id)}
                  style={{ backgroundColor: ACCENT_SWATCH[accent.id] }}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110",
                    prefs.accent === accent.id
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                      : "",
                  )}
                >
                  {prefs.accent === accent.id ? (
                    <Check className="size-4 text-white drop-shadow" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title={t("language")} icon={<Languages className="size-4 text-primary" />}>
          <Row label={t("language")} hint="Interface language for your settings and menus.">
            <Select
              value={prefs.language}
              onValueChange={(value) => setPref("language", value)}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {LANGUAGES.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {language.native} — {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </Section>

        <Section title={t("motion")} icon={<Sparkles className="size-4 text-primary" />}>
          <Row label={t("animations")} hint="Card flips, hovers and transitions.">
            <Switch
              checked={prefs.animations}
              onCheckedChange={(value) => setPref("animations", value)}
            />
          </Row>
          <Row label={t("reduceMotion")} hint="Cut everything down to instant.">
            <Switch
              checked={prefs.reduceMotion}
              onCheckedChange={(value) => setPref("reduceMotion", value)}
            />
          </Row>

          <div>
            <p className="text-sm font-medium">{t("flipPreview")}</p>
            <div className="mt-3 flip-scene h-32 w-full max-w-xs">
              <button
                type="button"
                onClick={() => setFlipped((value) => !value)}
                className={cn("flip-card size-full", flipped && "flip-card-flipped")}
              >
                <span className="flip-face bg-side-a text-side-a-foreground font-display text-lg font-semibold shadow-lift">
                  Side A
                </span>
                <span className="flip-face flip-face-back bg-side-b text-side-b-foreground font-display text-lg font-semibold shadow-lift">
                  Side B
                </span>
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Tap the card to flip it.</p>
          </div>
        </Section>

        <Section title={t("reading")} icon={<MonitorSmartphone className="size-4 text-primary" />}>
          <Row label="Compact layout" hint="Tighter spacing in feeds and threads.">
            <Switch
              checked={prefs.compact}
              onCheckedChange={(value) => setPref("compact", value)}
            />
          </Row>
          <Row label="Live updates" hint="Stream new chat messages and votes in real time.">
            <Switch
              checked={prefs.autoplayRealtime}
              onCheckedChange={(value) => setPref("autoplayRealtime", value)}
            />
          </Row>
          <Row label="Always show vote percentages" hint="Otherwise they appear after you vote.">
            <Switch
              checked={prefs.showVotePercentages}
              onCheckedChange={(value) => setPref("showVotePercentages", value)}
            />
          </Row>
          <div>
            <Label className="text-sm font-medium">Text size — {prefs.fontScale}%</Label>
            <Slider
              className="mt-3"
              min={85}
              max={125}
              step={5}
              value={[prefs.fontScale]}
              onValueChange={([value]) => setPref("fontScale", value ?? 100)}
            />
          </div>
        </Section>

        <Section title={t("account")} icon={<Link2 className="size-4 text-primary" />}>
          {user ? (
            <>
              <Row label="Profile" hint="Avatar, bio and username live on your profile page.">
                <Button asChild variant="secondary" size="sm">
                  <Link to="/profile">Edit profile</Link>
                </Button>
              </Row>

              <div>
                <p className="text-sm font-medium">{t("linkAccount")}</p>
                <p className="text-xs text-muted-foreground">
                  Add an email so you can recover this account later. Optional — Debatify stays
                  username-only without it.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Input
                    type="email"
                    value={linkEmail}
                    placeholder="you@example.com"
                    onChange={(event) => setLinkEmail(event.target.value)}
                    className="max-w-xs"
                  />
                  <Button onClick={linkAccount} disabled={linking || !linkEmail.trim()}>
                    {linking ? "Linking…" : t("linkAccount")}
                  </Button>
                </div>
              </div>

              <Row label={t("signOut")} hint="End the session on this device.">
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="size-4" /> {t("signOut")}
                </Button>
              </Row>
            </>
          ) : (
            <Row label="Not signed in" hint="Sign in to manage your account.">
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signin" as const }}>
                  Sign in
                </Link>
              </Button>
            </Row>
          )}
        </Section>

        {user ? (
          <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-destructive">
              <Trash2 className="size-4" /> {t("dangerZone")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Deleting your account removes your profile, votes, comments, articles and messages.
              This cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-4" disabled={deleting}>
                  {deleting ? "Deleting…" : t("deleteAccount")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes @{username} and everything posted with it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={removeAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        ) : null}
      </div>
    </div>
  );
}
