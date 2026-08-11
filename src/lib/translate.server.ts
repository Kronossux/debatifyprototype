/** Machine translation through the Lovable AI gateway. Server-only. */

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function translateTexts(texts: string[], lang: string): Promise<string[]> {
  if (!texts.length || lang === "en") return texts;
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Translation is not configured");

  const payload = JSON.stringify(texts);
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a translation engine for a website. You receive a JSON array of UI strings and user posts. " +
            `Translate every item into the language with IETF code "${lang}". ` +
            "Keep the exact same number of items and the same order. Preserve @mentions, URLs, emoji, numbers and " +
            "surrounding whitespace. Never explain, never add items. Reply with the JSON array only.",
        },
        { role: "user", content: payload },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(response.status === 429 ? "Too many translations right now" : "Translation failed");
  }

  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) return texts;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== texts.length) return texts;
    return parsed.map((item, i) => (typeof item === "string" ? item : (texts[i] as string)));
  } catch {
    return texts;
  }
}
