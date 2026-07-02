// Constrains content to a max readable width on super-large screens while staying centered.
// Used inside full-bleed wrappers (e.g. header, main) so the background always extends edge-to-edge.

import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-screen-2xl px-3 md:px-6", className)}>
      {children}
    </div>
  );
}
