"use client";
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export interface CoupleNodeData {
  ceremonyType?: string;
  startDate?: string;
  unionOrder?: number;
}

function CoupleNode({ data }: NodeProps<CoupleNodeData>) {
  return (
    <div className="relative flex items-center justify-center">
      <Handle type="target" position={Position.Left} id="left" className="!h-2 !w-2 !bg-primary" />
      <Handle type="target" position={Position.Right} id="right" className="!h-2 !w-2 !bg-primary" />

      <div
        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-lg"
        title={data.ceremonyType || "Union"}
      >
        <span className="text-xs">💍</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-primary" />
    </div>
  );
}

export default memo(CoupleNode);
