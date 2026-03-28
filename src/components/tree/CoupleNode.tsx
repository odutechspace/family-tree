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
      <Handle
        className="!h-2 !w-2 !bg-primary"
        id="left"
        position={Position.Left}
        type="target"
      />
      <Handle
        className="!h-2 !w-2 !bg-primary"
        id="right"
        position={Position.Right}
        type="target"
      />

      <div
        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-lg"
        title={data.ceremonyType || "Union"}
      >
        <span className="text-xs">💍</span>
      </div>

      <Handle
        className="!h-2 !w-2 !bg-primary"
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}

export default memo(CoupleNode);
