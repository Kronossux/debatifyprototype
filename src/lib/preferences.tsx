import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "dawn" | "dusk" | "system";

export const ACCENTS = [
  { id: "red", label: "Red" },
  { id: "orange", label: "Orange" },
  { id: "amber", label: "Amber" },
  { id: "yellow", label: "Yellow" },
  { id: "lime", label: "Lime" },
  { id: "green", label: "Green" },
  { id: "teal", label: "Teal" },
  { id: "cyan", label: "Cyan" },
  { id: "blue", label: "Blue" },
  { id: "indigo", label: "Indigo" },
  { id: "violet", label: "Violet" },
  { id: "pink", label: "Pink" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export const ACCENT_SWATCH: Record<AccentId, string> = {
  red: "oklch(0.6 0.22 25)",
  orange: "oklch(0.68 0.18 50)",
  amber: "oklch(0.78 0.16 74)",
  yellow: "oklch(0.85 0.16 95)",
  lime: "oklch(0.78 0.19 128)",
  green: "oklch(0.62 0.17 148)",
  teal: "oklch(0.62 0.13 185)",
  cyan: "oklch(0.68 0.13 210)",
  blue: "oklch(0.47 0.15 253)",
  indigo: "oklch(0.48 0.19 275)",
  violet: "oklch(0.52 0.21 300)",
  pink: "oklch(0.63 0.21 350)",
};

export type Preferences = {
  theme: ThemeMode;
  accent: AccentId;
  language: string;
  animations: boolean;
  reduceMotion: boolean;
  compact: boolean;
  fontScale: number;
  autoplayRealtime: boolean;
  showVotePercentages: boolean;
};

const DEFAULTS: Preferences = {
  theme: "dawn",
  accent: "blue",
  language: "en",
  animations: true,
  reduceMotion: false,
  compact: false,
  fontScale: 100,
  autoplayRealtime: true,
  showVotePercentages: true,
};

const STORAGE_KEY = "debatify:preferences";

type PreferencesValue = {
  prefs: Preferences;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
};

const PreferencesContext = createContext<PreferencesValue>({
  prefs: DEFAULTS,
  setPref: () => {},
  reset: () => {},
});

function readStored(): Preferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return DEFAULTS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);

  // Hydrate after mount so SSR markup stays stable.
  useEffect(() => {
    setPrefs(readStored());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = prefs.theme === "dusk" || (prefs.theme === "system" && prefersDark);
    root.classList.toggle("dark", dark);
    root.dataset["accent"] = prefs.accent;
    root.dataset["motion"] = prefs.animations && !prefs.reduceMotion ? "on" : "off";
    root.dataset["density"] = prefs.compact ? "compact" : "cozy";
    root.style.fontSize = `${prefs.fontScale}%`;
    root.lang = prefs.language;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable */
    }
  }, [prefs]);

  const setPref = useCallback<PreferencesValue["setPref"]>((key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setPrefs(DEFAULTS), []);

  const value = useMemo(() => ({ prefs, setPref, reset }), [prefs, setPref, reset]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
