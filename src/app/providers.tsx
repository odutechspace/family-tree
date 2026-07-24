"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { Theme } from "@radix-ui/themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { QueryProvider } from "@/src/components/query-provider";
import { TooltipProvider } from "@/src/components/ui/tooltip";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  return (
    <QueryProvider>
      {/*
        next-themes toggles .light / .dark on <html>. Do not set Theme
        appearance — Radix Themes follows those classes.
        https://www.radix-ui.com/themes/docs/theme/dark-mode
      */}
      <NextThemesProvider {...themeProps}>
        <Theme
          accentColor="teal"
          grayColor="sand"
          radius="medium"
          scaling="100%"
          hasBackground={false}
        >
          <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        </Theme>
      </NextThemesProvider>
    </QueryProvider>
  );
}
