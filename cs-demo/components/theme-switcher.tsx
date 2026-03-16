"use client";

import { useTheme, type ThemeName } from "@/providers/theme-provider";
import { Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const themes: { id: ThemeName; name: string; swatch: [string, string]; description: string }[] = [
  { id: "classic", name: "Travelers Classic", swatch: ["#b82025", "#faf9f7"], description: "Refined corporate warmth" },
  { id: "steel", name: "Steel & Crimson", swatch: ["#9b1b1b", "#f5f5f5"], description: "High-contrast editorial" },
  { id: "warm", name: "Warm Authority", swatch: ["#7a2e1e", "#f5ede4"], description: "Premium serif elegance" },
  { id: "midnight", name: "Midnight Professional", swatch: ["#e84444", "#1a1d2e"], description: "Dark command center" },
  { id: "pacific", name: "Pacific Modern", swatch: ["#4a6fa5", "#f0f2f8"], description: "Cool contemporary" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
        <Palette className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex items-center gap-3 cursor-pointer py-2.5",
              theme === t.id && "bg-accent"
            )}
          >
            <div className="relative size-5 rounded-full overflow-hidden ring-1 ring-border shrink-0">
              <div className="absolute inset-0" style={{ background: t.swatch[1] }} />
              <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${t.swatch[0]} 0deg, ${t.swatch[0]} 180deg, ${t.swatch[1]} 180deg, ${t.swatch[1]} 360deg)` }} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium leading-tight">{t.name}</div>
              <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{t.description}</div>
            </div>
            {theme === t.id && (
              <div className="ml-auto size-1.5 rounded-full bg-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
