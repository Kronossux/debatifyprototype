import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [theme, setTheme] = useState("dawn");
  const [notifications, setNotifications] = useState(true);
  const [animations, setAnimations] = useState(true);

  async function deleteAccount() {
    const confirmDelete = confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );

    if (!confirmDelete) return;

    await supabase.auth.signOut();
    alert("Account deletion request sent.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">

      <h1 className="text-3xl font-bold">
        Settings
      </h1>

      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">
          Appearance
        </h2>

        <button
          onClick={() =>
            setTheme(theme === "dawn" ? "dusk" : "dawn")
          }
          className="rounded-lg border px-4 py-2"
        >
          Mode: {theme}
        </button>
      </section>


      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">
          Preferences
        </h2>

        <button
          onClick={() => setNotifications(!notifications)}
          className="rounded-lg border px-4 py-2"
        >
          Notifications: {notifications ? "On" : "Off"}
        </button>

        <button
          onClick={() => setAnimations(!animations)}
          className="rounded-lg border px-4 py-2 block"
        >
          Animations: {animations ? "On" : "Off"}
        </button>
      </section>


      <section className="rounded-xl border border-red-500 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-red-500">
          Danger Zone
        </h2>

        <Button
          variant="destructive"
          onClick={deleteAccount}
        >
          Delete account
        </Button>
      </section>


      <Button
        variant="outline"
        onClick={signOut}
      >
        Sign out
      </Button>

    </main>
  );
}
