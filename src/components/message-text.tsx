import { Link } from "@tanstack/react-router";

const MENTION = /(@[a-zA-Z0-9_]{3,20})/g;

/** Renders message text, turning @usernames into links to their profile. */
export function MessageText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(MENTION);
  return (
    <p className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Link
            key={i}
            to="/u/$username"
            params={{ username: part.slice(1) }}
            className="font-medium text-primary hover:underline"
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}
