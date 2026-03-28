import { AppDataSource } from "@/src/config/db";
import {
  Relationship,
  RelationshipType,
} from "@/src/api/entities/Relationship";

/**
 * After a new relationship is created, automatically infer additional
 * relationships that logically follow from the existing tree structure.
 *
 * Rules:
 * 1. New SIBLING (A ↔ B):
 *    - All existing siblings of A become siblings of B, and vice-versa.
 *    - All parents of A become parents of B (parent_child A-parent→B), and vice-versa.
 *
 * 2. New HALF_SIBLING (A ↔ B):
 *    - Same sibling propagation but creates half_sibling rows.
 *
 * 3. New PARENT_CHILD (parent=A, child=B):
 *    - All existing children of A become siblings of B.
 *    - All existing parents of A's spouse(s) are NOT automatically added (too aggressive).
 *    - B's existing siblings get A as a parent too.
 *
 * 4. New SPOUSE / PARTNER (A ↔ B):
 *    - Children of A become parent_child of B (and vice-versa), only if B has no
 *      existing parent_child link with those children yet.
 */

type PairType =
  | "sibling"
  | "half_sibling"
  | "parent_child"
  | "spouse"
  | "partner";

interface PersonPair {
  parentId?: number;
  childId?: number;
  aId?: number;
  bId?: number;
}

async function relExists(
  repo: ReturnType<typeof AppDataSource.getRepository<Relationship>>,
  personAId: number,
  personBId: number,
  type: RelationshipType,
): Promise<boolean> {
  const a = await repo.findOne({
    where: { personAId, personBId, type },
  });

  if (a) return true;
  // symmetric check for symmetric types
  if (
    [
      RelationshipType.SIBLING,
      RelationshipType.HALF_SIBLING,
      RelationshipType.SPOUSE,
      RelationshipType.PARTNER,
      RelationshipType.CO_WIFE,
    ].includes(type)
  ) {
    const b = await repo.findOne({
      where: { personAId: personBId, personBId: personAId, type },
    });

    if (b) return true;
  }

  return false;
}

async function maybeCreate(
  repo: ReturnType<typeof AppDataSource.getRepository<Relationship>>,
  personAId: number,
  personBId: number,
  type: RelationshipType,
  createdByUserId: number,
) {
  if (personAId === personBId) return;
  if (await relExists(repo, personAId, personBId, type)) return;
  await repo.save(repo.create({ personAId, personBId, type, createdByUserId }));
}

/** Return all sibling IDs of personId (both directions) */
async function getSiblings(
  repo: ReturnType<typeof AppDataSource.getRepository<Relationship>>,
  personId: number,
  type: RelationshipType = RelationshipType.SIBLING,
): Promise<number[]> {
  const rows = await repo.find({
    where: [
      { personAId: personId, type },
      { personBId: personId, type },
    ],
  });

  return rows.map((r) =>
    r.personAId === personId ? r.personBId : r.personAId,
  );
}

/** Return all parent IDs of personId (parent_child where personId = personBId) */
async function getParents(
  repo: ReturnType<typeof AppDataSource.getRepository<Relationship>>,
  personId: number,
): Promise<number[]> {
  const rows = await repo.find({
    where: { personBId: personId, type: RelationshipType.PARENT_CHILD },
  });

  return rows.map((r) => r.personAId);
}

/** Return all children IDs of personId (parent_child where personId = personAId) */
async function getChildren(
  repo: ReturnType<typeof AppDataSource.getRepository<Relationship>>,
  personId: number,
): Promise<number[]> {
  const rows = await repo.find({
    where: { personAId: personId, type: RelationshipType.PARENT_CHILD },
  });

  return rows.map((r) => r.personBId);
}

export async function inferRelationships(
  newRelationship: Relationship,
  createdByUserId: number,
): Promise<void> {
  const repo = AppDataSource.getRepository(Relationship);
  const { personAId, personBId, type } = newRelationship;

  if (
    type === RelationshipType.SIBLING ||
    type === RelationshipType.HALF_SIBLING
  ) {
    // Siblings of A → become siblings of B
    const siblingsOfA = await getSiblings(repo, personAId, type);
    const siblingsOfB = await getSiblings(repo, personBId, type);

    for (const sib of siblingsOfA) {
      if (sib !== personBId)
        await maybeCreate(repo, sib, personBId, type, createdByUserId);
    }
    for (const sib of siblingsOfB) {
      if (sib !== personAId)
        await maybeCreate(repo, sib, personAId, type, createdByUserId);
    }

    // Parents of A → become parents of B
    const parentsOfA = await getParents(repo, personAId);
    const parentsOfB = await getParents(repo, personBId);

    for (const p of parentsOfA) {
      await maybeCreate(
        repo,
        p,
        personBId,
        RelationshipType.PARENT_CHILD,
        createdByUserId,
      );
    }
    for (const p of parentsOfB) {
      await maybeCreate(
        repo,
        p,
        personAId,
        RelationshipType.PARENT_CHILD,
        createdByUserId,
      );
    }
  }

  if (type === RelationshipType.PARENT_CHILD) {
    // parent = personAId, child = personBId
    const parentId = personAId;
    const childId = personBId;

    // All other children of this parent → become siblings of new child
    const siblings = await getChildren(repo, parentId);

    for (const sib of siblings) {
      if (sib !== childId) {
        await maybeCreate(
          repo,
          sib,
          childId,
          RelationshipType.SIBLING,
          createdByUserId,
        );
      }
    }

    // All existing siblings of this child → get the same parent
    const childSiblings = await getSiblings(
      repo,
      childId,
      RelationshipType.SIBLING,
    );

    for (const sib of childSiblings) {
      await maybeCreate(
        repo,
        parentId,
        sib,
        RelationshipType.PARENT_CHILD,
        createdByUserId,
      );
    }
  }

  if (type === RelationshipType.SPOUSE || type === RelationshipType.PARTNER) {
    // Children of A → B becomes their parent too (if not already)
    const childrenOfA = await getChildren(repo, personAId);

    for (const child of childrenOfA) {
      await maybeCreate(
        repo,
        personBId,
        child,
        RelationshipType.PARENT_CHILD,
        createdByUserId,
      );
    }
    // Children of B → A becomes their parent too
    const childrenOfB = await getChildren(repo, personBId);

    for (const child of childrenOfB) {
      await maybeCreate(
        repo,
        personAId,
        child,
        RelationshipType.PARENT_CHILD,
        createdByUserId,
      );
    }
  }
}
