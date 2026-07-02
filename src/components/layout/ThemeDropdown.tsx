"use client";

// Dropdown panel accessible from the header for all appearance and view settings:
// theme mode, accent colour, and grid density (zoom level / card count per row).
// Preferences are persisted via ThemeContext and ViewContext respectively.

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Monitor, Sun, Moon, Check, Settings } from "lucide-react";
import { useTheme, ACCENT_OPTIONS, type ThemeMode, type AccentKey } from "@/contexts/ThemeContext";
import { useView, type GridDensity } from "@/contexts/ViewContext";

interface ThemeOption {
  value: ThemeMode;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light",  label: "Light",  Icon: Sun     },
  { value: "dark",   label: "Dark",   Icon: Moon    },
];

// Renders a mini grid preview icon for each density level.
// Each level shows progressively more and smaller cells.
function DensityIcon({ level }: { level: GridDensity }) {
  // cell counts per row per level: 1→2, 2→3, 3→4, 4→5, 5→6
  const cols = level + 1;
  const rows = level <= 2 ? 2 : 3;
  return (
    <div
      className="grid gap-px"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: 28, height: 20 }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div key={i} className="rounded-[1px]" style={{ backgroundColor: "currentColor", opacity: 0.7 }} />
      ))}
    </div>
  );
}

const DENSITY_LABELS: Record<GridDensity, string> = {
  1: "XL",
  2: "L",
  3: "M",
  4: "S",
  5: "XS",
};

export function ThemeDropdown() {
  const { theme, accent, setTheme, setAccent } = useTheme();
  const { gridDensity, setGridDensity } = useView();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="View & appearance settings"
          className="flex items-center justify-center w-8 h-8 rounded transition-colors hover:opacity-80"
          style={{ color: "var(--primary)" }}
        >
          <Settings size={18} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[200] min-w-[220px] rounded-lg shadow-xl border p-2 outline-none"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
          }}
        >
          {/* Theme mode section */}
          <p
            className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Theme
          </p>

          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <DropdownMenu.Item
              key={value}
              onSelect={(e) => { e.preventDefault(); setTheme(value); }}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded cursor-pointer text-sm outline-none select-none"
              style={{ color: theme === value ? "var(--primary)" : "var(--text-primary)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-secondary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              <Icon size={14} />
              <span className="flex-1">{label}</span>
              {theme === value && <Check size={13} style={{ color: "var(--primary)" }} />}
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator
            className="my-2 h-px"
            style={{ backgroundColor: "var(--border-color)" }}
          />

          {/* Grid density / zoom section */}
          <p
            className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Grid Size
          </p>

          {/* Five buttons, each showing a visual preview of the density it represents */}
          <div className="flex items-center justify-between gap-1 px-2 pb-2">
            {([1, 2, 3, 4, 5] as GridDensity[]).map((level) => {
              const active = gridDensity === level;
              return (
                <button
                  key={level}
                  title={DENSITY_LABELS[level]}
                  onClick={() => setGridDensity(level)}
                  className="flex flex-col items-center gap-1 flex-1 py-1.5 rounded transition-colors"
                  style={{
                    color: active ? "var(--primary)" : "var(--text-muted)",
                    backgroundColor: active ? "var(--primary-dim)" : "transparent",
                    border: `1px solid ${active ? "var(--primary)" : "transparent"}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-secondary)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--bg-secondary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                    }
                  }}
                >
                  <DensityIcon level={level} />
                  <span className="text-[9px] font-semibold">{DENSITY_LABELS[level]}</span>
                </button>
              );
            })}
          </div>

          <DropdownMenu.Separator
            className="my-2 h-px"
            style={{ backgroundColor: "var(--border-color)" }}
          />

          {/* Accent colour section */}
          <p
            className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Accent Colour
          </p>

          <div className="flex flex-wrap gap-2 px-2 pb-1">
            {ACCENT_OPTIONS.map(({ key, label, color }) => (
              <button
                key={key}
                title={label}
                onClick={() => setAccent(key as AccentKey)}
                className="relative w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{
                  backgroundColor: color,
                  boxShadow: accent === key
                    ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${color}`
                    : "none",
                }}
                aria-label={label}
                aria-pressed={accent === key}
              >
                {accent === key && (
                  <Check
                    size={12}
                    className="absolute inset-0 m-auto"
                    style={{ color: key === "orange" || key === "green" || key === "teal" ? "#000" : "#fff" }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Active accent label */}
          <p
            className="px-2 pt-1 pb-0.5 text-[11px]"
            style={{ color: "var(--text-muted)" }}
          >
            {ACCENT_OPTIONS.find(a => a.key === accent)?.label}
          </p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
