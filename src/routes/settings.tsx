import { useState } from "react";
import { Link } from "@tanstack/react-router";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"dawn" | "dusk">("dawn");
  const [notifications, setNotifications] = useState(true);
  const [animations, setAnimations] = useState(true);

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  return (
    <main
      className={
        theme === "dawn"
          ? "min-h-screen bg-white text-black p-8"
          : "min-h-screen bg-black text-white p-8"
      }
    >
      <div className="max-w-3xl mx-auto space-y-8">

        <Link
          to="/"
          className="text-blue-500 hover:underline"
        >
          ← Back
        </Link>

        <h1 className="text-4xl font-bold">
          Settings
        </h1>


        {/* Appearance */}
        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-xl font-semibold">
            Appearance
          </h2>

          <button
            onClick={() => setTheme("dawn")}
            className="flex items-center gap-3"
          >
            <span>
              {theme === "dawn" ? "●" : "○"}
            </span>
            Dawn mode
          </button>

          <button
            onClick={() => setTheme("dusk")}
            className="flex items-center gap-3"
          >
            <span>
              {theme === "dusk" ? "●" : "○"}
            </span>
            Dusk mode
          </button>
        </section>



        {/* Notifications */}
        <section className="rounded-2xl border p-6 flex justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Notifications
            </h2>

            <p className="opacity-60">
              Receive updates and alerts
            </p>
          </div>

          <button
            onClick={() => setNotifications(!notifications)}
            className="rounded-full border px-4 py-2"
          >
            {notifications ? "On" : "Off"}
          </button>
        </section>



        {/* Animations */}
        <section className="rounded-2xl border p-6 flex justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Animations
            </h2>

            <p className="opacity-60">
              Enable smooth transitions
            </p>
          </div>

          <button
            onClick={() => setAnimations(!animations)}
            className="rounded-full border px-4 py-2"
          >
            {animations ? "On" : "Off"}
          </button>
        </section>



        {/* Danger Zone */}
        <section className="rounded-2xl border border-red-500 p-6 space-y-4">

          <h2 className="text-xl font-semibold text-red-500">
            Danger Zone
          </h2>


          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="bg-red-600 text-white px-5 py-3 rounded-xl"
            >
              Delete account
            </button>
          ) : (

            <div className="space-y-4">

              <p>
                Are you sure you want to delete your account?
              </p>

              <div className="flex gap-3">

                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="border px-5 py-2 rounded-xl"
                >
                  Cancel
                </button>


                <button
                  className="bg-red-600 text-white px-5 py-2 rounded-xl"
                >
                  Delete
                </button>

              </div>

            </div>

          )}

        </section>


        {/* Sign out */}
        <section className="rounded-2xl border p-6">

          <button
            className="bg-gray-900 text-white px-5 py-3 rounded-xl"
          >
            Sign out
          </button>

        </section>


      </div>
    </main>
  );
}
