"use client";
import { useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  DefaultEdgeOptions,
} from "reactflow";
import dagre from "dagre";

import "reactflow/dist/style.css";
import PersonNode, { PersonNodeData } from "./PersonNode";
import CoupleNode from "./CoupleNode";

const nodeTypes = { person: PersonNode, couple: CoupleNode };

const PERSON_NODE_WIDTH = 160;
const PERSON_NODE_HEIGHT = 170;
const COUPLE_NODE_WIDTH = 40;
const COUPLE_NODE_HEIGHT = 40;

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "smoothstep",
};

interface Person {
  id: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  nickname?: string | null;
  gender: string;
  birthDate?: string | null;
  deathDate?: string | null;
  aliveStatus: string;
  photoUrl?: string | null;
  tribeEthnicity?: string | null;
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
  onAddRelative?: (person: Person, role: "parent" | "child" | "spouse") => void;
}

/** Parents of a person via parent_child / adopted / step_parent (personA = parent). */
function parentsOf(
  personId: number,
  parentChildRels: Relationship[],
): Set<number> {
  const parents = new Set<number>();

  for (const r of parentChildRels) {
    if (r.personBId === personId) parents.add(r.personAId);
  }

  return parents;
}

function shareParent(
  aId: number,
  bId: number,
  parentChildRels: Relationship[],
): boolean {
  const aParents = parentsOf(aId, parentChildRels);
  const bParents = parentsOf(bId, parentChildRels);

  for (const p of aParents) {
    if (bParents.has(p)) return true;
  }

  return false;
}

export default function FamilyTreeViewer({
  persons,
  relationships,
  rootPersonId,
  onAddRelative,
}: Props) {
  const { resolvedTheme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const isDark = resolvedTheme !== "light";

  const buildGraph = useCallback(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    const spouseRels = relationships.filter((r) =>
      ["spouse", "partner", "co_wife", "levirate"].includes(r.type),
    );
    const parentChildRels = relationships.filter(
      (r) =>
        r.type === "parent_child" ||
        r.type === "adopted" ||
        r.type === "step_parent",
    );
    const siblingRels = relationships.filter(
      (r) => r.type === "sibling" || r.type === "half_sibling",
    );

    // Build couple nodes for each spouse pair
    const coupleNodes = new Map<
      string,
      { id: string; aId: number; bId: number; rel: Relationship }
    >();

    spouseRels.forEach((r) => {
      const key = `couple-${Math.min(r.personAId, r.personBId)}-${Math.max(r.personAId, r.personBId)}`;

      if (!coupleNodes.has(key)) {
        coupleNodes.set(key, {
          id: key,
          aId: r.personAId,
          bId: r.personBId,
          rel: r,
        });
      }
    });

    const g = new dagre.graphlib.Graph();

    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: "TB",
      ranksep: 80,
      nodesep: 60,
      edgesep: 20,
      marginx: 40,
      marginy: 40,
    });

    persons.forEach((p) => {
      g.setNode(`person-${p.id}`, {
        width: PERSON_NODE_WIDTH,
        height: PERSON_NODE_HEIGHT,
      });
    });

    coupleNodes.forEach(({ id: coupleId }) => {
      g.setNode(coupleId, {
        width: COUPLE_NODE_WIDTH,
        height: COUPLE_NODE_HEIGHT,
      });
    });

    // Ranking edges: parents → couple junction
    coupleNodes.forEach(({ id: coupleId, aId, bId }) => {
      g.setEdge(`person-${aId}`, coupleId);
      g.setEdge(`person-${bId}`, coupleId);
    });

    // Ranking edges: couple (or solo parent) → child
    parentChildRels.forEach((r) => {
      const parentId = r.personAId;
      const childId = r.personBId;
      const coupleKey = [...coupleNodes.values()].find(
        (c) => c.aId === parentId || c.bId === parentId,
      );
      const sourceId = coupleKey ? coupleKey.id : `person-${parentId}`;

      g.setEdge(sourceId, `person-${childId}`);
    });

    dagre.layout(g);

    // Person nodes from dagre positions (center → top-left)
    persons.forEach((p) => {
      const nodeId = `person-${p.id}`;
      const layout = g.node(nodeId);

      newNodes.push({
        id: nodeId,
        type: "person",
        position: {
          x: layout.x - PERSON_NODE_WIDTH / 2,
          y: layout.y - PERSON_NODE_HEIGHT / 2,
        },
        data: {
          ...p,
          isRoot: p.id === rootPersonId,
          onAddRelative,
        } as PersonNodeData,
      });
    });

    const unionStroke = "#49838F";

    // Couple nodes + union edges (parent → couple)
    coupleNodes.forEach(({ id: coupleId, aId, bId, rel }) => {
      const layout = g.node(coupleId);

      newNodes.push({
        id: coupleId,
        type: "couple",
        position: {
          x: layout.x - COUPLE_NODE_WIDTH / 2,
          y: layout.y - COUPLE_NODE_HEIGHT / 2,
        },
        data: {
          ceremonyType: rel.ceremonyType,
          startDate: rel.startDate,
          unionOrder: rel.unionOrder,
        },
      });

      newEdges.push(
        {
          id: `${coupleId}-a`,
          source: `person-${aId}`,
          target: coupleId,
          type: "smoothstep",
          style: { stroke: unionStroke, strokeWidth: 2 },
        },
        {
          id: `${coupleId}-b`,
          source: `person-${bId}`,
          target: coupleId,
          type: "smoothstep",
          style: { stroke: unionStroke, strokeWidth: 2 },
        },
      );
    });

    const parentStroke = isDark ? "#a8a29e" : "#78716c";

    // Parent-child edges (from couple node → child, or direct person → child)
    parentChildRels.forEach((r) => {
      const parentId = r.personAId;
      const childId = r.personBId;
      const coupleKey = [...coupleNodes.values()].find(
        (c) => c.aId === parentId || c.bId === parentId,
      );
      const sourceId = coupleKey ? coupleKey.id : `person-${parentId}`;

      newEdges.push({
        id: `rel-${r.id}`,
        source: sourceId,
        target: `person-${childId}`,
        type: "smoothstep",
        style: {
          stroke: parentStroke,
          strokeWidth: 2,
          strokeDasharray: r.type !== "parent_child" ? "5,5" : undefined,
        },
        label:
          r.type !== "parent_child"
            ? r.type === "adopted"
              ? "adopted"
              : "step"
            : undefined,
        labelStyle: { fontSize: 10, fill: parentStroke },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: parentStroke,
        },
      });
    });

    // Sibling edges only when not already implied by a shared parent
    const siblingStroke = isDark ? "#a16207" : "#b45309";

    siblingRels.forEach((r) => {
      if (shareParent(r.personAId, r.personBId, parentChildRels)) return;

      newEdges.push({
        id: `sib-${r.id}`,
        source: `person-${r.personAId}`,
        target: `person-${r.personBId}`,
        type: "smoothstep",
        style: {
          stroke: siblingStroke,
          strokeWidth: 1,
          strokeDasharray: "4,4",
        },
        label: r.type === "half_sibling" ? "half" : "sibling",
        labelStyle: { fontSize: 9, fill: isDark ? "#fbbf24" : "#92400e" },
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [persons, relationships, rootPersonId, isDark, onAddRelative]);

  useEffect(() => {
    buildGraph();
  }, [buildGraph]);

  const dotColor = isDark ? "#44403c" : "#d6d3d1";
  const minimapMask = isDark ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.75)";

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-border bg-muted/30">
      <ReactFlow
        fitView
        attributionPosition="bottom-right"
        defaultEdgeOptions={defaultEdgeOptions}
        edges={edges}
        fitViewOptions={{ padding: 0.3 }}
        maxZoom={2}
        minZoom={0.2}
        nodeTypes={nodeTypes}
        nodes={nodes}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
      >
        <Background
          color={dotColor}
          gap={20}
          variant={BackgroundVariant.Dots}
        />
        <Controls className="!border-border !bg-card !shadow-md [&_button]:!border-border [&_button]:!bg-background [&_svg]:!fill-foreground" />
        <MiniMap
          className="!border-border !bg-card"
          maskColor={minimapMask}
          nodeColor={(n) => {
            if (n.type === "couple") return "#49838F";
            const data = n.data as PersonNodeData;

            if (data.gender === "male") return isDark ? "#3b82f6" : "#2563eb";
            if (data.gender === "female") return isDark ? "#ec4899" : "#db2777";

            return isDark ? "#78716c" : "#a8a29e";
          }}
        />
      </ReactFlow>
    </div>
  );
}
