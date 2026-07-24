import { Gender } from "@/src/api/entities/Person";
import { RelationshipType } from "@/src/api/entities/Relationship";

export type KinshipPerson = {
  id: number;
  gender?: Gender | string | null;
};

export type KinshipEdge = {
  personAId: number;
  personBId: number;
  type: RelationshipType | string;
};

const PARENT_LIKE = new Set<string>([
  RelationshipType.PARENT_CHILD,
  RelationshipType.STEP_PARENT,
  RelationshipType.ADOPTED,
  RelationshipType.GUARDIAN,
]);

const SIBLING_LIKE = new Set<string>([
  RelationshipType.SIBLING,
  RelationshipType.HALF_SIBLING,
]);

const COUPLE_LIKE = new Set<string>([
  RelationshipType.SPOUSE,
  RelationshipType.PARTNER,
  RelationshipType.CO_WIFE,
  RelationshipType.LEVIRATE,
]);

function genderOf(p: KinshipPerson | undefined): "f" | "m" | "u" {
  const g = (p?.gender || "").toString().toLowerCase();
  if (g === Gender.FEMALE || g === "female") return "f";
  if (g === Gender.MALE || g === "male") return "m";
  return "u";
}

function pick(f: string, m: string, u: string, g: "f" | "m" | "u") {
  if (g === "f") return f;
  if (g === "m") return m;
  return u;
}

function neighbors(
  id: number,
  edges: KinshipEdge[],
): Array<{ id: number; type: string; toward: "a_is_parent" | "b_is_parent" | "sym" }> {
  const out: Array<{
    id: number;
    type: string;
    toward: "a_is_parent" | "b_is_parent" | "sym";
  }> = [];
  for (const e of edges) {
    if (e.personAId === id) {
      if (PARENT_LIKE.has(e.type)) {
        out.push({ id: e.personBId, type: e.type, toward: "a_is_parent" });
      } else if (SIBLING_LIKE.has(e.type) || COUPLE_LIKE.has(e.type)) {
        out.push({ id: e.personBId, type: e.type, toward: "sym" });
      }
    } else if (e.personBId === id) {
      if (PARENT_LIKE.has(e.type)) {
        out.push({ id: e.personAId, type: e.type, toward: "b_is_parent" });
      } else if (SIBLING_LIKE.has(e.type) || COUPLE_LIKE.has(e.type)) {
        out.push({ id: e.personAId, type: e.type, toward: "sym" });
      }
    }
  }
  return out;
}

/**
 * Best-effort display kinship from viewer → target using direct graph edges.
 * Grandmother/etc. are inferred; they are not stored RelationshipType values.
 */
export function kinshipLabel(
  viewerId: number,
  targetId: number,
  degree: number,
  people: KinshipPerson[],
  edges: KinshipEdge[],
): string {
  if (viewerId === targetId) return "You";

  const byId = new Map(people.map((p) => [p.id, p]));
  const target = byId.get(targetId);
  const tg = genderOf(target);

  // Degree 1: inspect the direct edge
  if (degree === 1) {
    for (const e of edges) {
      const connects =
        (e.personAId === viewerId && e.personBId === targetId) ||
        (e.personAId === targetId && e.personBId === viewerId);
      if (!connects) continue;

      if (PARENT_LIKE.has(e.type)) {
        // personA = parent, personB = child
        if (e.personAId === targetId && e.personBId === viewerId) {
          return pick("Mother", "Father", "Parent", tg);
        }
        if (e.personAId === viewerId && e.personBId === targetId) {
          return pick("Daughter", "Son", "Child", tg);
        }
      }
      if (e.type === RelationshipType.SIBLING) {
        return pick("Sister", "Brother", "Sibling", tg);
      }
      if (e.type === RelationshipType.HALF_SIBLING) {
        return pick("Half-sister", "Half-brother", "Half-sibling", tg);
      }
      if (e.type === RelationshipType.SPOUSE) return "Spouse";
      if (e.type === RelationshipType.PARTNER) return "Partner";
      if (e.type === RelationshipType.CO_WIFE) return "Co-wife";
      if (e.type === RelationshipType.LEVIRATE) return "Levirate spouse";
    }
    return "Related (1 hop)";
  }

  if (degree === 2) {
    // Find a shortest path viewer → mid → target and classify
    const fromViewer = neighbors(viewerId, edges);
    for (const step1 of fromViewer) {
      const mid = step1.id;
      const fromMid = neighbors(mid, edges).filter((n) => n.id === targetId);
      for (const step2 of fromMid) {
        // Parent → Parent of parent = grandparent
        if (
          step1.toward === "b_is_parent" &&
          PARENT_LIKE.has(step1.type) &&
          step2.toward === "b_is_parent" &&
          PARENT_LIKE.has(step2.type)
        ) {
          return pick("Grandmother", "Grandfather", "Grandparent", tg);
        }
        // Child → Child of child = grandchild
        if (
          step1.toward === "a_is_parent" &&
          PARENT_LIKE.has(step1.type) &&
          step2.toward === "a_is_parent" &&
          PARENT_LIKE.has(step2.type)
        ) {
          return pick("Granddaughter", "Grandson", "Grandchild", tg);
        }
        // Parent → sibling of parent = aunt/uncle
        if (
          step1.toward === "b_is_parent" &&
          PARENT_LIKE.has(step1.type) &&
          step2.toward === "sym" &&
          SIBLING_LIKE.has(step2.type)
        ) {
          return pick("Aunt", "Uncle", "Parent's sibling", tg);
        }
        // Sibling → child of sibling = niece/nephew
        if (
          step1.toward === "sym" &&
          SIBLING_LIKE.has(step1.type) &&
          step2.toward === "a_is_parent" &&
          PARENT_LIKE.has(step2.type)
        ) {
          return pick("Niece", "Nephew", "Sibling's child", tg);
        }
        // Sibling → spouse of sibling = sibling-in-law
        if (
          step1.toward === "sym" &&
          SIBLING_LIKE.has(step1.type) &&
          step2.toward === "sym" &&
          COUPLE_LIKE.has(step2.type)
        ) {
          return pick("Sister-in-law", "Brother-in-law", "Sibling-in-law", tg);
        }
        // Parent → spouse of parent = step-parent-ish / other parent
        if (
          step1.toward === "b_is_parent" &&
          PARENT_LIKE.has(step1.type) &&
          step2.toward === "sym" &&
          COUPLE_LIKE.has(step2.type)
        ) {
          return pick("Stepmother", "Stepfather", "Parent's partner", tg);
        }
        // Spouse → parent of spouse = parent-in-law
        if (
          step1.toward === "sym" &&
          COUPLE_LIKE.has(step1.type) &&
          step2.toward === "b_is_parent" &&
          PARENT_LIKE.has(step2.type)
        ) {
          return pick("Mother-in-law", "Father-in-law", "Parent-in-law", tg);
        }
        // Two sibling hops via shared mid often = cousin (parent's sibling's child)
        if (
          step1.toward === "b_is_parent" &&
          PARENT_LIKE.has(step1.type) &&
          step2.toward === "a_is_parent" &&
          PARENT_LIKE.has(step2.type)
        ) {
          // viewer → parent → other child of that parent = sibling (degree 1 usually)
          // If mid is aunt/uncle path differently handled above.
          // viewer parent → that parent's other child: degree 1 sibling.
        }
      }
    }

    // Cousin heuristic: parent's sibling's child
    for (const step1 of fromViewer) {
      if (!(step1.toward === "b_is_parent" && PARENT_LIKE.has(step1.type))) {
        continue;
      }
      const parentId = step1.id;
      for (const sib of neighbors(parentId, edges)) {
        if (!(sib.toward === "sym" && SIBLING_LIKE.has(sib.type))) continue;
        const auntUncleId = sib.id;
        for (const child of neighbors(auntUncleId, edges)) {
          if (
            child.id === targetId &&
            child.toward === "a_is_parent" &&
            PARENT_LIKE.has(child.type)
          ) {
            return "Cousin";
          }
        }
      }
    }

    return pick(
      "Relative (2 hops)",
      "Relative (2 hops)",
      "Related (2 hops)",
      tg,
    );
  }

  return `Related (${degree} hops)`;
}

/** Human labels for stored RelationshipType values (compose picker). */
export const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  same_person: "Same person (merge)",
  [RelationshipType.PARENT_CHILD]: "Parent / child",
  [RelationshipType.SIBLING]: "Sibling",
  [RelationshipType.HALF_SIBLING]: "Half-sibling",
  [RelationshipType.SPOUSE]: "Spouse",
  [RelationshipType.PARTNER]: "Partner",
  [RelationshipType.STEP_PARENT]: "Step-parent",
  [RelationshipType.ADOPTED]: "Adoptive parent / child",
  [RelationshipType.GUARDIAN]: "Guardian",
  [RelationshipType.CO_WIFE]: "Co-wife",
  [RelationshipType.LEVIRATE]: "Levirate",
};

export const CONNECTION_REL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "same_person", label: RELATIONSHIP_TYPE_LABELS.same_person },
  ...Object.values(RelationshipType).map((value) => ({
    value,
    label: RELATIONSHIP_TYPE_LABELS[value] || value,
  })),
];
