import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Languages, Loader2 } from "lucide-react";
import { translateStrings } from "@/lib/translate.functions";
import { usePreferences } from "@/lib/preferences";

/**
 * Whole-page machine translation.
 *
 * Interface text (buttons, menus, debate titles…) is translated automatically
 * whenever the language preference is not English. Blocks marked with
 * `data-manual-translate` (comments, chat, DMs) are skipped until the reader
 * presses their "Translate all" button.
 */

const SKIP = "script,style,noscript,code,pre,textarea,input,[data-no-translate]";
const originals = new WeakMap<Text, string>();

function cacheKey(lang: string) {
  return `debatify:tr:${lang}`;
}

function readCache(lang: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(cacheKey(lang)) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function writeCache(lang: string, cache: Record<string, string>) {
  try {
    window.localStorage.setItem(cacheKey(lang), JSON.stringify(cache));
  } catch {
    /* quota reached — translations just won't persist */
  }
}

/** Text nodes worth translating inside `root`. */
function collect(root: HTMLElement, manual: boolean): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      if (!manual && parent.closest("[data-manual-translate]")) return NodeFilter.FILTER_REJECT;
      const value = (node.nodeValue ?? "").trim();
      if (value.length < 2 || !/\p{L}{2,}/u.test(value)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

type Value = {
  lang: string;
  active: boolean;
  translateWithin: (root: HTMLElement) => Promise<void>;
};

const AutoTranslateContext = createContext<Value>({
  lang: "en",
  active: false,
  translateWithin: async () => {},
});

export function AutoTranslateProvider({ children }: { children: ReactNode }) {
  const { prefs } = usePreferences();
  const lang = prefs.language;
  const active = lang !== "en";
  const location = useRouterState({ select: (s) => s.location.pathname });
  const busy = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);

  const run = useCallback(
    async (root: HTMLElement, manual: boolean) => {
      if (typeof window === "undefined" || lang === "en") return;
      const nodes = collect(root, manual).filter((n) => originals.get(n) !== n.nodeValue || true);
      if (!nodes.length) return;

      const cache = readCache(lang);
      const pending: string[] = [];
      const pendingSet = new Set<string>();

      for (const node of nodes) {
        const source = originals.get(node) ?? node.nodeValue ?? "";
        if (!originals.has(node)) originals.set(node, source);
        const key = source.trim();
        if (cache[key]) continue;
        if (!pendingSet.has(key)) {
          pendingSet.add(key);
          pending.push(key);
        }
      }

      const apply = () => {
        observerRef.current?.disconnect();
        for (const node of nodes) {
          const source = originals.get(node) ?? "";
          const translated = cache[source.trim()];
          if (translated && node.nodeValue !== translated) {
            node.nodeValue = source.replace(source.trim(), translated);
          }
        }
        if (observerRef.current) {
          observerRef.current.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
      };

      apply();
      if (!pending.length) return;

      for (let i = 0; i < pending.length; i += 40) {
        const chunk = pending.slice(i, i + 40);
        try {
          const { texts } = await translateStrings({ data: { texts: chunk, lang } });
          chunk.forEach((source, index) => {
            cache[source] = texts[index] ?? source;
          });
        } catch {
          chunk.forEach((source) => {
            cache[source] = source;
          });
        }
      }
      writeCache(lang, cache);
      apply();
    },
    [lang],
  );

  // Restore English instantly when the reader switches back.
  useEffect(() => {
    if (typeof document === "undefined" || active) return;
    for (const node of collect(document.body, true)) {
      const source = originals.get(node);
      if (source && node.nodeValue !== source) node.nodeValue = source;
    }
  }, [active]);

  // Translate the interface on load, on navigation and as React re-renders.
  useEffect(() => {
    if (typeof document === "undefined" || !active) return;
    let frame: number | undefined;
    const schedule = () => {
      if (frame) window.clearTimeout(frame);
      frame = window.setTimeout(() => {
        if (busy.current) return;
        busy.current = true;
        void run(document.body, false).finally(() => {
          busy.current = false;
        });
      }, 250);
    };

    const observer = new MutationObserver(schedule);
    observerRef.current = observer;
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    schedule();

    return () => {
      observer.disconnect();
      observerRef.current = null;
      if (frame) window.clearTimeout(frame);
    };
  }, [active, run, location]);

  const value = useMemo<Value>(
    () => ({ lang, active, translateWithin: (root: HTMLElement) => run(root, true) }),
    [lang, active, run],
  );

  return <AutoTranslateContext.Provider value={value}>{children}</AutoTranslateContext.Provider>;
}

export function useAutoTranslate() {
  return useContext(AutoTranslateContext);
}

/**
 * Button that translates a block of member-written content (comments, chat,
 * private messages) on demand. The block itself must carry
 * `data-manual-translate` so it is left alone by the automatic pass.
 */
export function TranslateAllButton({
  targetRef,
  label = "Translate all",
  className,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  label?: string;
  className?: string;
}) {
  const { active, translateWithin } = useAutoTranslate();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!active) return null;

  return (
    <button
      type="button"
      data-no-translate
      disabled={busy}
      onClick={async () => {
        if (!targetRef.current) return;
        setBusy(true);
        try {
          await translateWithin(targetRef.current);
          setDone(true);
        } finally {
          setBusy(false);
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60 ${className ?? ""}`}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Languages className="size-3.5" />}
      {busy ? "Translating…" : done ? "Translated" : label}
    </button>
  );
}
