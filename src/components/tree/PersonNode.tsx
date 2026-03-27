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
  const genderColor = data.gender === "male" ? "border-blue-500" : data.gender === "female" ? "border-pink-500" : "border-stone-500";
  const bgColor = data.gender === "male" ? "bg-blue-900/20" : data.gender === "female" ? "bg-pink-900/20" : "bg-stone-800";

  return (
    <div className={`relative rounded-xl border-2 ${genderColor} ${bgColor} ${selected ? "ring-2 ring-amber-400" : ""} ${data.isRoot ? "ring-2 ring-amber-500" : ""} shadow-lg w-36 cursor-pointer transition-all hover:scale-105`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />

      <Link href={`/persons/${data.id}`} className="block p-3 no-underline" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-2">
          <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold border-2 ${genderColor} ${isDeceased ? "opacity-60 grayscale" : ""}`}
            style={{ background: data.gender === "male" ? "#1e3a5f" : data.gender === "female" ? "#5f1e3a" : "#2a2a2a" }}>
            {data.photoUrl ? (
              <img src={data.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-amber-400">{initials || "?"}</span>
            )}
          </div>
          <div className="text-center">
            <p className={`text-xs font-semibold leading-tight ${isDeceased ? "text-stone-400" : "text-white"}`}>
              {data.firstName} {data.lastName}
            </p>
            {data.nickname && <p className="text-amber-400/70 text-xs">"{data.nickname}"</p>}
            {data.unionOrder && data.unionOrder > 1 && (
              <span className="text-xs text-amber-500">Wife #{data.unionOrder}</span>
            )}
            <div className="flex justify-center gap-1 mt-1 flex-wrap">
              {data.birthDate && (
                <span className="text-stone-500 text-xs">{new Date(data.birthDate).getFullYear()}</span>
              )}
              {isDeceased && <span className="text-stone-500 text-xs">†{data.deathDate ? new Date(data.deathDate).getFullYear() : ""}</span>}
            </div>
          </div>
        </div>
      </Link>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3" />
    </div>
  );
}

export default memo(PersonNode);
