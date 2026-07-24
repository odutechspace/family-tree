import { AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import { Relationship } from "@/src/api/entities/Relationship";
import { canViewPerson } from "@/src/lib/permissions";

export interface GraphNode {
  person: Person;
  degree: number;
}

export interface GraphEdge {
  relationship: Relationship;
}

export interface RelativesResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * BFS from root person ids over Relationship edges.
 * Caps rounds (default 30, matching historical trees GET) and optional maxNodes.
 */
export async function getRelatives(
  rootPersonIds: number[],
  opts?: {
    maxRounds?: number;
    maxNodes?: number;
    viewerUserId?: number;
    viewerRole?: string;
    /** Person ids that bypass per-person visibility (e.g. direct tree members for a collaborator). */
    alwaysVisibleIds?: Iterable<number>;
  },
): Promise<RelativesResult> {
  const maxRounds = opts?.maxRounds ?? 30;
  const maxNodes = opts?.maxNodes ?? 5000;
  const seeds = rootPersonIds.filter((id) => id > 0);

  if (seeds.length === 0) {
    return { nodes: [], edges: [] };
  }

  const personRepo = AppDataSource.getRepository(Person);
  const relRepo = AppDataSource.getRepository(Relationship);

  const degreeById = new Map<number, number>();
  for (const id of seeds) {
    degreeById.set(id, 0);
  }

  let frontier = [...seeds];

  for (let round = 0; round < maxRounds; round++) {
    if (frontier.length === 0) break;
    if (degreeById.size >= maxNodes) break;

    const touching = await relRepo
      .createQueryBuilder("r")
      .where("r.personAId IN (:...ids) OR r.personBId IN (:...ids)", {
        ids: frontier,
      })
      .getMany();

    const nextFrontier: number[] = [];
    for (const r of touching) {
      for (const id of [r.personAId, r.personBId]) {
        if (!degreeById.has(id) && degreeById.size < maxNodes) {
          degreeById.set(id, round + 1);
          nextFrontier.push(id);
        }
      }
    }
    frontier = nextFrontier;
  }

  const allIds = [...degreeById.keys()];
  if (allIds.length === 0) {
    return { nodes: [], edges: [] };
  }

  let persons = await personRepo
    .createQueryBuilder("p")
    .where("p.id IN (:...ids)", { ids: allIds })
    .getMany();

  let relationships = await relRepo
    .createQueryBuilder("r")
    .where("r.personAId IN (:...ids) AND r.personBId IN (:...ids)", {
      ids: allIds,
    })
    .getMany();

  if (opts?.viewerUserId != null) {
    const viewer = {
      id: opts.viewerUserId,
      role: opts.viewerRole ?? "user",
    };
    const alwaysVisible = new Set<number>(opts.alwaysVisibleIds ?? []);
    const visibleIds = new Set<number>();
    for (const p of persons) {
      if (alwaysVisible.has(p.id) || (await canViewPerson(viewer, p))) {
        visibleIds.add(p.id);
      }
    }
    persons = persons.filter((p) => visibleIds.has(p.id));
    relationships = relationships.filter(
      (r) => visibleIds.has(r.personAId) && visibleIds.has(r.personBId),
    );
  }

  return {
    nodes: persons.map((person) => ({
      person,
      degree: degreeById.get(person.id) ?? 0,
    })),
    edges: relationships.map((relationship) => ({ relationship })),
  };
}
