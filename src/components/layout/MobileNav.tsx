"use client";

// Fixed bottom navigation bar shown on mobile screens.
// Mirrors the desktop header nav tabs as icon + label pairs.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Users, Clapperboard, History } from "lucide-react";

// Shows the 5 most essential nav items; Tags dropped in favour of History on mobile.
const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/scenes", label: "Videos", icon: Film },
  { href: "/performers", label: "Stars", icon: Users },
  { href: "/studios", label: "Studios", icon: Clapperboard },
  { href: "/history", label: "History", icon: History },
];

// Renders the active route by comparing pathname to each link's href.
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center"
      style={{
        backgroundColor: "var(--bg-header)",
        borderTop: "1px solid #222",
        height: 56,
      }}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors"
            style={{ color: active ? "var(--primary)" : "var(--text-secondary)" }}
          >
            <Icon size={20} />
            <span className="text-[10px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
