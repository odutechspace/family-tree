"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/src/lib/utils";
import { Input } from "@/src/components/ui/input";

export interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn("pr-10", className)}
          type={visible ? "text" : "password"}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
