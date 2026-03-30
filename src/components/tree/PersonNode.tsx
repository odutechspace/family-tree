"use client";
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import Link from "next/link";

import {
  formatPersonDisplayName,
  getPersonInitials,
} from "@/src/lib/personDisplayName";

export interface PersonNodeData {
  id: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  nickname?: string;
  gender: string;
  birthDate?: string;
  deathDate?: string;
  aliveStatus: string;
  photoUrl?: string;
  tribeEthnicity?: string;
  isRoot?: boolean;
  unionOrder?: number;
  onAddRelative?: (
    person: {
      id: number;
      firstName: string;
      middleName?: string | null;
      lastName: string;
      maidenName?: string | null;
      nickname?: string;
      gender: string;
      aliveStatus: string;
    },
    role: "parent" | "child" | "spouse",
  ) => void;
}

function PersonNode({ data, selected }: NodeProps<PersonNodeData>) {
  const fullName = formatPersonDisplayName(data);
  const initials = getPersonInitials(data);
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

  const person = {
    id: data.id,
    firstName: data.firstName,
    middleName: data.middleName,
    lastName: data.lastName,
    maidenName: data.maidenName,
    nickname: data.nickname,
    gender: data.gender,
    aliveStatus: data.aliveStatus,
  };

  return (
    <div
      className={`group relative w-36 cursor-pointer rounded-xl border-2 shadow-lg transition-all hover:scale-105 ${genderBorder} ${genderBg} ${selected ? "ring-2 ring-primary" : ""} ${data.isRoot ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
    >
      <Handle
        className="!h-3 !w-3 !bg-primary"
        position={Position.Top}
        type="target"
      />

      <Link
        className="block p-3 no-underline"
        href={`/persons/${data.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 ${genderBorder} ${isDeceased ? "opacity-60 grayscale" : ""} ${avatarInner}`}
          >
            {data.photoUrl ? (
              <img
                alt=""
                className="h-full w-full object-cover"
                src={data.photoUrl}
              />
            ) : (
              <span className="text-lg font-bold">{initials || "?"}</span>
            )}
          </div>
          <div className="text-center">
            <p
              className={`line-clamp-3 text-xs font-semibold leading-tight ${isDeceased ? "text-muted-foreground" : "text-foreground"}`}
              title={fullName}
            >
              {fullName}
            </p>
            {data.unionOrder && data.unionOrder > 1 && (
              <span className="text-xs text-primary">
                Wife #{data.unionOrder}
              </span>
            )}
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {data.birthDate && (
                <span className="text-xs text-muted-foreground">
                  {new Date(data.birthDate).getFullYear()}
                </span>
              )}
              {isDeceased && (
                <span className="text-xs text-muted-foreground">
                  †
                  {data.deathDate ? new Date(data.deathDate).getFullYear() : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {data.onAddRelative && (
        <div className="absolute -bottom-7 left-0 right-0 hidden justify-center gap-1 group-hover:flex">
          <button
            className="rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium text-primary shadow ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
            title="Add parent"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onAddRelative!(person, "parent");
            }}
          >
            +Parent
          </button>
          <button
            className="rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium text-primary shadow ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
            title="Add spouse"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onAddRelative!(person, "spouse");
            }}
          >
            +Spouse
          </button>
          <button
            className="rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium text-primary shadow ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
            title="Add child"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onAddRelative!(person, "child");
            }}
          >
            +Child
          </button>
        </div>
      )}

      <Handle
        className="!h-3 !w-3 !bg-primary"
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}

export default memo(PersonNode);
