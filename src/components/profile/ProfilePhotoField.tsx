"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Link2, Shuffle, Sparkles } from "lucide-react";

import { UserAvatar } from "@/src/components/UserAvatar";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import {
  dicebearBigEarsUrl,
  generateAvatarSeeds,
  isAllowedProfilePhotoUrl,
  isDicebearBigEarsUrl,
} from "@/src/lib/dicebear";
import { cn } from "@/src/lib/utils";

export interface ProfilePhotoFieldProps {
  value: string;
  onChange: (url: string) => void;
  displayName?: string;
  initials?: string;
  disabled?: boolean;
}

function detectTab(value: string): "upload" | "url" | "avatar" {
  if (!value) return "avatar";
  if (value.startsWith("/uploads/")) return "upload";
  if (isDicebearBigEarsUrl(value)) return "avatar";
  return "url";
}

export function ProfilePhotoField({
  value,
  onChange,
  displayName,
  initials,
  disabled,
}: ProfilePhotoFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"upload" | "url" | "avatar">(() =>
    detectTab(value),
  );
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [urlDraft, setUrlDraft] = useState(
    value && !value.startsWith("/uploads/") && !isDicebearBigEarsUrl(value)
      ? value
      : "",
  );
  const [seedSalt, setSeedSalt] = useState(0);

  const seeds = useMemo(
    () => [
      displayName?.trim() || "my-ukoo",
      ...generateAvatarSeeds(7, `${displayName ?? ""}-${seedSalt}`),
    ],
    [displayName, seedSalt],
  );

  const applyUrl = (next: string) => {
    onChange(next);
    setUploadErr("");
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadErr("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/users/me/photo", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Upload failed.");
      }
      const url = data?.data?.url as string | undefined;
      if (!url) throw new Error("Upload did not return a URL.");
      applyUrl(url);
      setTab("upload");
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const applyExternalUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      applyUrl("");
      return;
    }
    if (!isAllowedProfilePhotoUrl(trimmed)) {
      setUploadErr("Enter a valid http(s) URL.");
      return;
    }
    applyUrl(trimmed);
    setTab("url");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <UserAvatar
          initials={initials}
          name={displayName}
          size="xl"
          src={value || null}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-foreground">Profile photo</p>
          <p className="text-xs text-muted-foreground">
            Upload an image, paste a URL, or pick a{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://www.dicebear.com/playground/"
              rel="noreferrer"
              target="_blank"
            >
              DiceBear Big Ears
            </a>{" "}
            avatar.
          </p>
          {value ? (
            <Button
              disabled={disabled}
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => {
                applyUrl("");
                setUrlDraft("");
              }}
            >
              Remove photo
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
      >
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger className="gap-1.5" disabled={disabled} value="upload">
            <ImagePlus className="size-3.5" />
            Upload
          </TabsTrigger>
          <TabsTrigger className="gap-1.5" disabled={disabled} value="url">
            <Link2 className="size-3.5" />
            URL
          </TabsTrigger>
          <TabsTrigger className="gap-1.5" disabled={disabled} value="avatar">
            <Sparkles className="size-3.5" />
            Big Ears
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-3 pt-3" value="upload">
          <input
            ref={fileRef}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={disabled || uploading}
            type="file"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
          <Button
            disabled={disabled || uploading}
            type="button"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Choose image"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, or GIF up to 2&nbsp;MB.
          </p>
        </TabsContent>

        <TabsContent className="space-y-3 pt-3" value="url">
          <div className="space-y-2">
            <Label htmlFor="profilePhotoUrl">Photo URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                disabled={disabled}
                id="profilePhotoUrl"
                placeholder="https://…"
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
              />
              <Button
                disabled={disabled}
                type="button"
                variant="secondary"
                onClick={applyExternalUrl}
              >
                Use URL
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent className="space-y-3 pt-3" value="avatar">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Big Ears avatars from DiceBear. First option uses your display
              name as the seed.
            </p>
            <Button
              disabled={disabled}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setSeedSalt((n) => n + 1)}
            >
              <Shuffle className="size-3.5" />
              Shuffle
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {seeds.map((seed) => {
              const url = dicebearBigEarsUrl(seed, { size: 96 });
              const selected = value === url;
              return (
                <button
                  key={seed}
                  aria-label={`Choose avatar seed ${seed}`}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-xl border p-1 transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border",
                  )}
                  disabled={disabled}
                  type="button"
                  onClick={() => applyUrl(url)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    className="aspect-square w-full rounded-lg bg-muted object-cover"
                    src={url}
                  />
                </button>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {uploadErr ? (
        <p className="text-sm text-destructive">{uploadErr}</p>
      ) : null}
    </div>
  );
}
