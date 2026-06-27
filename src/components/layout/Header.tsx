"use client";

// Site-wide sticky header containing the logo, live search bar, nav tabs, and mobile controls.
// Also hosts the ThemeDropdown for switching light/dark mode and accent colour.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Search, Home, Users, Clapperboard, Tag, Film, History } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { ThemeDropdown } from "./ThemeDropdown";
import { Container } from "@/components/ui/Container";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/scenes", label: "Videos", icon: Film },
  { href: "/performers", label: "Performers", icon: Users },
  { href: "/studios", label: "Studios", icon: Clapperboard },
  { href: "/tags", label: "Tags", icon: Tag },
  { href: "/history", label: "History", icon: History },
];

// Renders the site-wide sticky header including logo, search, nav tabs and theme controls.
export function Header() {
  const pathname = usePathname();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header
      style={{ backgroundColor: "var(--bg-header)", borderBottom: "1px solid var(--bg-header-border)" }}
      className="sticky top-0 z-50 w-full"
    >
      {/* Container constrains content width; header background still spans full viewport */}
      <Container>
        {/* Main header row */}
        <div className="flex items-center gap-3 h-14">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-1">
            <span
              className="text-black text-sm font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--primary)" }}
            >
              STASH
            </span>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Hub</span>
          </Link>

          {/* Desktop live search bar */}
          <SearchBar className="hidden md:flex flex-1 max-w-2xl mx-4" />

          {/* Right-side controls: ml-auto pins the group to the rightmost edge */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Mobile search toggle button */}
            <button
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded"
              style={{ color: "var(--primary)" }}
            >
              <Search size={20} />
            </button>
            <ThemeDropdown />
          </div>
        </div>

        {/* Mobile search bar - slides in below the header row when toggled */}
        {mobileSearchOpen && (
          <div
            className="md:hidden py-2"
            style={{ borderTop: "1px solid var(--bg-header-border)" }}
          >
            <SearchBar
              autoFocus
              onClose={() => setMobileSearchOpen(false)}
            />
          </div>
        )}
      </Container>

      {/* Desktop nav tabs - full-bleed border, content contained */}
      <div style={{ borderTop: "1px solid var(--bg-nav-border)" }}>
        <Container>
          <nav className="hidden md:flex items-center gap-0 h-10 overflow-x-auto">
            {NAV_LINKS.map(({ href, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="px-4 h-full flex items-center text-xs font-semibold uppercase tracking-wide transition-colors whitespace-nowrap"
                  style={{
                    color: active ? "var(--primary)" : "var(--text-secondary)",
                    borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </Container>
      </div>

      {/* Mobile bottom nav is in MobileNav component */}
    </header>
  );
}
