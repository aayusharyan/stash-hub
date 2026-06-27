// Renders the global site footer shown at the bottom of every page.
// Three-column layout: Open Stash link (left), site name (center), GitHub star link (right).
// On mobile, pb-14 ensures content clears the fixed MobileNav (56px tall).

import { ExternalLink, Star } from "lucide-react";
import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer
      className="pb-14 md:pb-0"
      style={{ borderTop: "1px solid var(--border-color)" }}
    >
      <Container>
        <div className="grid grid-cols-3 items-center py-2">
          <a
            href={process.env.NEXT_PUBLIC_STASH_EXTERNAL_URL ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Open Stash <ExternalLink size={12} />
          </a>

          <span className="text-xs text-center font-semibold" style={{ color: "var(--text-muted)" }}>
            StashHub
          </span>

          <a
            href="https://github.com/aayusharyan/stash-hub"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-end gap-1 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <Star size={12} /> Star on GitHub
          </a>
        </div>
      </Container>
    </footer>
  );
}
