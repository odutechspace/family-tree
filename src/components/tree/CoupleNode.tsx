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
      <Handle type="target" position={Position.Left} id="left" className="!bg-amber-500 !w-2 !h-2" />
      <Handle type="target" position={Position.Right} id="right" className="!bg-amber-500 !w-2 !h-2" />

      <div className="w-6 h-6 rounded-full bg-amber-600 border-2 border-amber-400 flex items-center justify-center shadow-lg" title={data.ceremonyType || "Union"}>
        <span className="text-xs">💍</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-2 !h-2" />
    </div>
  );
}

export default memo(CoupleNode);
