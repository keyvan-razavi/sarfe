import type { ReactNode } from "react";
import { safeBlogLink } from "@/modules/blog/validation";

/** Render the blog's deliberately small inline-markdown subset without interpreting HTML. */
export function InlineText({ text }: { text: string }) {
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|==([^=]+)==|\[([^\]]+)\]\(([^)]+)\))/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    if (match[2]) nodes.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3]) nodes.push(<em key={key++}>{match[3]}</em>);
    else if (match[4]) nodes.push(<mark key={key++}>{match[4]}</mark>);
    else if (match[5]) {
      const href = match[6];
      nodes.push(safeBlogLink(href)
        ? <a key={key++} href={href} target={href.startsWith("https://") ? "_blank" : undefined} rel={href.startsWith("https://") ? "noreferrer noopener" : undefined}>{match[5]}</a>
        : match[5]);
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
