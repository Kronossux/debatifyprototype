import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchProfile, fileToAvatarDataUrl, updateAvatar, updateBio } from "@/lib/community";
import { RoleBadge } from "@/components/role-badge";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Debatify" },
      {
        name: "description",
        content: "Manage your Debatify identity: set a profile picture that shows up on every vote, comment, article and chat message.",
      },
      { property: "og:title", content: "Your Debatify profile" },
      { property: "og:description", content: "Set the profile picture the community sees." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, username, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState<string | null>(null);
  const [savingBio, setSavingBio] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }, [loading, user, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  async function saveBio() {
    if (!user) return;
    setSavingBio(true);
    try {
      await updateBio(user.id, (bio ?? "").slice(0, 300));
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Bio saved");
    } catch {
      toast.error("Could not save your bio.");
    } finally {
      setSavingBio(false);
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Pick an image under 8MB.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await updateAvatar(user.id, dataUrl);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["chat"] });
      toast.success("Profile picture updated");
    } catch {
      toast.error("Could not update your picture.");
    } finally {
      setBusy(false);
    }
  }

  async function removePicture() {
    if (!user) return;
    setBusy(true);
    try {
      await updateAvatar(user.id, "");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Picture removed");
    } catch {
      toast.error("Could not remove your picture.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Your profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your username stays fixed — your picture is yours to change.
      </p>

      <div className="mt-8 flex items-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
        <UserAvatar
          username={profile?.username ?? username}
          avatarUrl={profile?.avatar_url}
          className="size-20"
        />
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-semibold">
            @{profile?.username ?? username ?? "you"}
            <RoleBadge role={profile?.role} />
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? "Saving…" : "Upload picture"}
            </Button>
            {profile?.avatar_url ? (
              <Button size="sm" variant="ghost" disabled={busy} onClick={removePicture}>
                Remove
              </Button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-semibold">Bio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A short line about you, shown on your public profile.
        </p>
        <Textarea
          className="mt-3"
          rows={3}
          maxLength={300}
          value={bio ?? profile?.bio ?? ""}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Debater, sceptic, occasional contrarian…"
        />
        <div className="mt-3 flex justify-end">
          <Button size="sm" disabled={savingBio} onClick={saveBio}>
            {savingBio ? "Saving…" : "Save bio"}
          </Button>
        </div>
      </div>
    </div>
  );
}
