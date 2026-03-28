"use client";

import { FC, useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { SunFilledIcon, MoonFilledIcon } from "@/src/components/icons";
import { Switch } from "@/src/components/ui/switch";
import { cn } from "@/src/lib/utils";

export interface ThemeSwitchProps {
  className?: string;
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({ className }) => {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  if (!mounted) {
    return <div aria-hidden className={cn("h-5 w-9 shrink-0", className)} />;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SunFilledIcon
        className={cn(
          "h-[22px] w-[22px]",
          isDark ? "text-muted-foreground" : "text-accent",
        )}
      />
      <Switch
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
      <MoonFilledIcon
        className={cn(
          "h-[22px] w-[22px]",
          isDark ? "text-accent" : "text-muted-foreground",
        )}
      />
    </div>
  );
};
