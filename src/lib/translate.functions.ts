import { createServerFn } from "@tanstack/react-start";

export const translateStrings = createServerFn({ method: "POST" })
  .inputValidator((input: { texts: string[]; lang: string }) => ({
    texts: (input.texts ?? []).slice(0, 120).map((t) => String(t).slice(0, 2000)),
    lang: String(input.lang ?? "en").slice(0, 8),
  }))
  .handler(async ({ data }) => {
    const { translateTexts } = await import("@/lib/translate.server");
    return { texts: await translateTexts(data.texts, data.lang) };
  });
