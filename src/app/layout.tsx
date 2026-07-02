// Root layout - wraps every page with global styles, the shared header, and providers.

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/Container";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: "StashHub",
    template: "%s · StashHub",
  },
  description: "A modern, open-source frontend for your self-hosted Stash collection - scenes, performers, studios, and everything in between.",
};

export const viewport: Viewport = {
  themeColor: "#ff9000",
  width: "device-width",
  initialScale: 1,
};

// Runs synchronously before the page paints to apply saved theme/accent from
// localStorage, preventing a flash of unstyled content on every load.
// Creates the favicon <link> element from scratch (not via React JSX) so that
// React's head reconciliation never overwrites it, and so we can force a
// browser re-fetch by removing and re-inserting the node when settings change.
const ANTI_FOUC_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('stash-hub-theme') || 'system';
    var resolved = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    document.documentElement.classList.add(resolved);
    var a = localStorage.getItem('stash-hub-accent') || 'orange';
    var map = { orange:'#ff9000', blue:'#0d6efd', red:'#e50914', purple:'#9147ff', green:'#1db954', teal:'#00b4b4' };
    var c = map[a] || '#ff9000';
    var r = document.documentElement;
    r.style.setProperty('--primary', c);
    r.style.setProperty('--primary-dim', c + '33');
    r.style.setProperty('--ring', c);
    r.style.setProperty('--sidebar-primary', c);
    r.style.setProperty('--sidebar-ring', c);
    r.style.setProperty('--chart-1', c);
    var link = document.createElement('link');
    link.id = 'app-favicon';
    link.rel = 'icon';
    link.type = 'image/png';
    link.sizes = '32x32';
    link.href = '/api/favicon?accent=' + a + '&theme=' + resolved;
    document.head.appendChild(link);
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      {/* Blocking inline script runs before paint to avoid theme flash */}
      <head>
        {/* Favicon <link> is created programmatically by ANTI_FOUC_SCRIPT below,
            keeping it outside React's reconciliation so it can be force-refreshed. */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex flex-1 overflow-hidden">
              <main className="flex-1 min-w-0 pb-16 md:pb-0">
                <Container>
                  {children}
                </Container>
              </main>
            </div>
            <MobileNav />
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
