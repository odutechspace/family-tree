"use client";
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType, BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import PersonNode, { PersonNodeData } from "./PersonNode";
import CoupleNode from "./CoupleNode";

const nodeTypes = { person: PersonNode, couple: CoupleNode };

interface Person {
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
}

interface Relationship {
  id: number;
  personAId: number;
  personBId: number;
  type: string;
  status: string;
  startDate?: string;
  ceremonyType?: string;
  unionOrder?: number;
}

interface Props {
  persons: Person[];
  relationships: Relationship[];
  rootPersonId?: number;
}

export default function FamilyTreeViewer({ persons, relationships, rootPersonId }: Props) {
  const { resolvedTheme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const isDark = resolvedTheme !== "light";

  const buildGraph = useCallback(() => {
    const personMap = new Map(persons.map(p => [p.id, p]));
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Separate spouse/partner pairs from parent-child
    const spouseRels = relationships.filter(r =>
      ["spouse", "partner", "co_wife", "levirate"].includes(r.type)
    );
    const parentChildRels = relationships.filter(r => r.type === "parent_child" || r.type === "adopted" || r.type === "step_parent");
    const siblingRels = relationships.filter(r => r.type === "sibling" || r.type === "half_sibling");

    // Build couple nodes for each spouse pair
    const coupleNodes = new Map<string, { id: string; aId: number; bId: number; rel: Relationship }>();
    spouseRels.forEach(r => {
      const key = `couple-${Math.min(r.personAId, r.personBId)}-${Math.max(r.personAId, r.personBId)}`;
      if (!coupleNodes.has(key)) {
        coupleNodes.set(key, { id: key, aId: r.personAId, bId: r.personBId, rel: r });
      }
    });

    // Layout: compute positions using simple level-based layout
    const positioned = new Map<number, { x: number; y: number }>();
    const levelMap = new Map<number, number>();

    // BFS from root to assign generations
    const rootId = rootPersonId || (persons[0]?.id);
    if (rootId) {
      const queue = [{ id: rootId, level: 0 }];
      const visited = new Set<number>();
      while (queue.length) {
        const { id, level } = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        levelMap.set(id, level);

        // Parents go up (level - 1)
        parentChildRels.filter(r => r.personBId === id && !visited.has(r.personAId))
          .forEach(r => queue.push({ id: r.personAId, level: level - 1 }));
        // Children go down (level + 1)
        parentChildRels.filter(r => r.personAId === id && !visited.has(r.personBId))
          .forEach(r => queue.push({ id: r.personBId, level: level + 1 }));
        // Spouses same level
        spouseRels.filter(r => (r.personAId === id || r.personBId === id))
          .forEach(r => {
            const otherId = r.personAId === id ? r.personBId : r.personAId;
            if (!visited.has(otherId)) queue.push({ id: otherId, level });
          });
      }
    }

    // Assign levels to unvisited
    persons.forEach(p => { if (!levelMap.has(p.id)) levelMap.set(p.id, 0); });

    // Group by level
    const byLevel = new Map<number, number[]>();
    persons.forEach(p => {
      const lvl = levelMap.get(p.id) ?? 0;
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      byLevel.get(lvl)!.push(p.id);
    });

    const VERT_GAP = 200;
    const HORIZ_GAP = 180;

    byLevel.forEach((ids, level) => {
      ids.forEach((pid, idx) => {
        const x = (idx - (ids.length - 1) / 2) * HORIZ_GAP;
        const y = level * VERT_GAP;
        positioned.set(pid, { x, y });
      });
    });

    // Add person nodes
    persons.forEach(p => {
      const pos = positioned.get(p.id) || { x: 0, y: 0 };
      newNodes.push({
        id: `person-${p.id}`,
        type: "person",
        position: pos,
        data: {
          ...p,
          isRoot: p.id === rootPersonId,
        } as PersonNodeData,
      });
    });

    // Add couple nodes and edges
    coupleNodes.forEach(({ id: coupleId, aId, bId, rel }) => {
      const posA = positioned.get(aId) || { x: 0, y: 0 };
      const posB = positioned.get(bId) || { x: 0, y: 0 };
      const cx = (posA.x + posB.x) / 2;
      const cy = (posA.y + posB.y) / 2;

      newNodes.push({
        id: coupleId,
        type: "couple",
        position: { x: cx, y: cy },
        data: { ceremonyType: rel.ceremonyType, startDate: rel.startDate, unionOrder: rel.unionOrder },
      });

      const unionStroke = "#49838F";
      newEdges.push(
        {
          id: `${coupleId}-a`,
          source: `person-${aId}`,
          target: coupleId,
          type: "smoothstep",
          style: { stroke: unionStroke, strokeWidth: 2 },
          markerEnd: { type: MarkerType.Arrow, color: unionStroke },
        },
        {
          id: `${coupleId}-b`,
          source: `person-${bId}`,
          target: coupleId,
          type: "smoothstep",
          style: { stroke: unionStroke, strokeWidth: 2 },
          markerEnd: { type: MarkerType.Arrow, color: unionStroke },
        },
      );
    });

    // Parent-child edges (from couple node → child, or direct person → child)
    parentChildRels.forEach(r => {
      const parentId = r.personAId;
      const childId = r.personBId;

      // Find if parent is in a couple
      const coupleKey = [...coupleNodes.values()].find(c => c.aId === parentId || c.bId === parentId);
      const sourceId = coupleKey ? coupleKey.id : `person-${parentId}`;

      newEdges.push({
        id: `rel-${r.id}`,
        source: sourceId,
        target: `person-${childId}`,
        type: "smoothstep",
        style: { stroke: isDark ? "#78716c" : "#a8a29e", strokeWidth: 1.5, strokeDasharray: r.type !== "parent_child" ? "5,5" : undefined },
        label: r.type !== "parent_child" ? (r.type === "adopted" ? "adopted" : "step") : undefined,
        labelStyle: { fontSize: 10, fill: isDark ? "#a8a29e" : "#78716c" },
        markerEnd: { type: MarkerType.ArrowClosed, color: isDark ? "#78716c" : "#a8a29e" },
      });
    });

    // Sibling edges (dashed horizontal)
    siblingRels.forEach(r => {
      newEdges.push({
        id: `sib-${r.id}`,
        source: `person-${r.personAId}`,
        target: `person-${r.personBId}`,
        type: "straight",
        style: { stroke: isDark ? "#a16207" : "#b45309", strokeWidth: 1, strokeDasharray: "4,4" },
        label: r.type === "half_sibling" ? "half" : undefined,
        labelStyle: { fontSize: 9, fill: isDark ? "#fbbf24" : "#92400e" },
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [persons, relationships, rootPersonId, isDark]);

  useEffect(() => { buildGraph(); }, [buildGraph]);

  const dotColor = isDark ? "#44403c" : "#d6d3d1";
  const minimapMask = isDark ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.75)";

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-border bg-muted/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-right"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} color={dotColor} />
        <Controls className="!border-border !bg-card !shadow-md [&_button]:!border-border [&_button]:!bg-background [&_svg]:!fill-foreground" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === "couple") return "#49838F";
            const data = n.data as PersonNodeData;
            if (data.gender === "male") return isDark ? "#3b82f6" : "#2563eb";
            if (data.gender === "female") return isDark ? "#ec4899" : "#db2777";
            return isDark ? "#78716c" : "#a8a29e";
          }}
          maskColor={minimapMask}
          className="!border-border !bg-card"
        />
      </ReactFlow>
    </div>
  );
}
