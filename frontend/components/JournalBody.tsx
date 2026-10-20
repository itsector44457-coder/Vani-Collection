import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Renders a journal article body written in the Admin editor's simple, safe format:
 *
 * - Blank line = new paragraph
 * - `## Heading` / `### Sub-heading`
 * - `- item` lines = bullet list, `1. item` lines = numbered list
 * - `> quote`, `---` divider
 * - `**bold**`, `*italic*`, `[label](/path)` or `[label](https://…)`
 *
 * Raw HTML is never injected, so editor input cannot break the page or smuggle scripts.
 */

const INLINE_PATTERN = /(\[[^\]]+\]\((?:https?:\/\/|\/)[^\s)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
const LINK_PATTERN = /^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)$/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE_PATTERN).filter(Boolean).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    const link = token.match(LINK_PATTERN);
    if (link) {
      const [, label, href] = link;
      const className = "font-medium text-[#781e36] underline decoration-[#c9a06b] underline-offset-2 hover:text-[#64182c]";
      return href.startsWith("/") ? (
        <Link key={key} href={href} className={className}>{label}</Link>
      ) : (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={className}>{label}</a>
      );
    }
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={key} className="font-semibold text-stone-900">{token.slice(2, -2)}</strong>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={key}>{token.slice(1, -1)}</em>;
    return <span key={key}>{token}</span>;
  });
}

export default function JournalBody({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="space-y-5 text-[15px] leading-relaxed text-stone-700 sm:text-base">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const key = `block-${blockIndex}`;

        if (lines.length === 1 && /^---+$/.test(lines[0])) return <hr key={key} className="border-stone-200" />;
        if (lines.length === 1 && lines[0].startsWith("### ")) {
          return <h3 key={key} className="pt-2 font-serif text-xl text-stone-900">{renderInline(lines[0].slice(4), key)}</h3>;
        }
        if (lines.length === 1 && (lines[0].startsWith("## ") || lines[0].startsWith("# "))) {
          const heading = lines[0].startsWith("## ") ? lines[0].slice(3) : lines[0].slice(2);
          return <h2 key={key} className="pt-3 font-serif text-2xl text-stone-900">{renderInline(heading, key)}</h2>;
        }
        if (lines.every((line) => line.startsWith("- ") || line.startsWith("* "))) {
          return (
            <ul key={key} className="list-disc space-y-2 pl-5">
              {lines.map((line, index) => <li key={index}>{renderInline(line.slice(2), `${key}-${index}`)}</li>)}
            </ul>
          );
        }
        if (lines.every((line) => /^\d+[.)]\s/.test(line))) {
          return (
            <ol key={key} className="list-decimal space-y-2 pl-5">
              {lines.map((line, index) => <li key={index}>{renderInline(line.replace(/^\d+[.)]\s/, ""), `${key}-${index}`)}</li>)}
            </ol>
          );
        }
        if (lines.every((line) => line.startsWith("> "))) {
          return (
            <blockquote key={key} className="border-l-2 border-[#c9a06b] bg-[#fdf7f0] px-5 py-4 font-serif text-lg text-stone-800">
              {renderInline(lines.map((line) => line.slice(2)).join(" "), key)}
            </blockquote>
          );
        }
        return <p key={key}>{renderInline(lines.join(" "), key)}</p>;
      })}
    </div>
  );
}
