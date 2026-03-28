"use client";
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import Link from "next/link";

export interface PersonNodeData {
  id: number;
  firstName: string;
  lastName: string;
  nickname?: string;
  gender: string;
  birthDate?: string;
  deathDate?: string;
  aliveStatus: string;
  photoUrl?: string;
  tribeEthnicity?: string;
  isRoot?: boolean;
  unionOrder?: number;
}

function PersonNode({ data, selected }: NodeProps<PersonNodeData>) {
  const initials = `${data.firstName?.[0] || ""}${data.lastName?.[0] || ""}`;
  const isDeceased = data.aliveStatus === "deceased";
  const genderBorder =
    data.gender === "male"
      ? "border-blue-500 dark:border-blue-400"
      : data.gender === "female"
        ? "border-pink-500 dark:border-pink-400"
        : "border-border";
  const genderBg =
    data.gender === "male"
      ? "bg-blue-50 dark:bg-blue-950/30"
      : data.gender === "female"
        ? "bg-pink-50 dark:bg-pink-950/30"
        : "bg-muted";

  const avatarInner =
    data.gender === "male"
      ? "bg-blue-200 text-blue-950 dark:bg-blue-950 dark:text-blue-200"
      : data.gender === "female"
        ? "bg-pink-200 text-pink-950 dark:bg-pink-950 dark:text-pink-200"
        : "bg-muted-foreground/20 text-foreground";

  return (
    <div
      className={`relative w-36 cursor-pointer rounded-xl border-2 shadow-lg transition-all hover:scale-105 ${genderBorder} ${genderBg} ${selected ? "ring-2 ring-primary" : ""} ${data.isRoot ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-primary" />

      <Link href={`/persons/${data.id}`} className="block p-3 no-underline" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-2">
          <div
            className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 ${genderBorder} ${isDeceased ? "opacity-60 grayscale" : ""} ${avatarInner}`}
          >
            {data.photoUrl ? (
              <img src={data.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-bold">{initials || "?"}</span>
            )}
          </div>
          <div className="text-center">
            <p className={`text-xs font-semibold leading-tight ${isDeceased ? "text-muted-foreground" : "text-foreground"}`}>
              {data.firstName} {data.lastName}
            </p>
            {data.nickname && <p className="text-xs text-primary/80">&quot;{data.nickname}&quot;</p>}
            {data.unionOrder && data.unionOrder > 1 && (
              <span className="text-xs text-primary">Wife #{data.unionOrder}</span>
            )}
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {data.birthDate && (
                <span className="text-xs text-muted-foreground">{new Date(data.birthDate).getFullYear()}</span>
              )}
              {isDeceased && (
                <span className="text-xs text-muted-foreground">
                  †{data.deathDate ? new Date(data.deathDate).getFullYear() : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-primary" />
    </div>
  );
}

export default memo(PersonNode);
