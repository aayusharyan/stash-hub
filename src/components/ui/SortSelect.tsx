"use client";

// Labeled sort control wrapping the shadcn Select primitive.
// Displays an optional uppercase label to the left of the dropdown.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  label?: string;
}

export function SortSelect({ value, options, onChange, label }: Props) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
      <Select value={value} items={options} onValueChange={(v) => v !== null && onChange(v)}>
        <SelectTrigger className="h-8 text-sm min-w-36 bg-secondary border-border text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
