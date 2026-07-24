import { In } from "typeorm";

import { AppDataSource } from "@/src/config/db";
import { FamilyTree } from "@/src/api/entities/FamilyTree";
import {
  FamilyTreeMember,
  TreeMemberRole,
} from "@/src/api/entities/FamilyTreeMember";
import { Person, PersonVisibility } from "@/src/api/entities/Person";
import { PersonSteward } from "@/src/api/entities/PersonSteward";
import { User } from "@/src/api/entities/User";
import { Relationship } from "@/src/api/entities/Relationship";

/** Membership for a user on a tree (by collaborator userId or linked person). */
export async function getTreeMembership(
  treeId: number,
  userId: number,
): Promise<FamilyTreeMember | null> {
  const memberRepo = AppDataSource.getRepository(FamilyTreeMember);
  const byUser = await memberRepo.findOne({ where: { treeId, userId } });
  if (byUser) return byUser;

  const me = await AppDataSource.getRepository(User).findOne({
    where: { id: userId },
    select: ["id", "linkedPersonId"],
  });
  if (!me?.linkedPersonId) return null;

  return memberRepo.findOne({
    where: { treeId, personId: me.linkedPersonId },
  });
}

/** Add/remove members and mutate tree contents (owner, admin, OWNER/EDITOR role). */
export async function canEditTree(
  user: { id: number; role?: string },
  tree: Pick<FamilyTree, "id" | "ownerUserId">,
): Promise<boolean> {
  if (user.role === "admin") return true;
  if (tree.ownerUserId === user.id) return true;

  const membership = await getTreeMembership(tree.id, user.id);
  if (!membership) return false;
  return (
    membership.role === TreeMemberRole.OWNER ||
    membership.role === TreeMemberRole.EDITOR
  );
}

/** Tree settings, delete, invites (owner or admin only). */
export async function canManageTree(
  user: { id: number; role?: string },
  tree: Pick<FamilyTree, "ownerUserId">,
): Promise<boolean> {
  if (user.role === "admin") return true;
  return tree.ownerUserId === user.id;
}

/** Max hops for `connections` visibility (env override). */
export function connectionsDegreeLimit(): number {
  const n = Number(process.env.CONNECTIONS_VISIBILITY_DEGREE || "4");
  return Number.isFinite(n) && n > 0 ? n : 4;
}

export async function isSteward(
  userId: number,
  personId: number,
): Promise<boolean> {
  const repo = AppDataSource.getRepository(PersonSteward);
  const row = await repo.findOne({ where: { personId, userId } });
  return !!row;
}

export async function canEditPerson(
  user: { id: number; role?: string },
  person: Person,
): Promise<boolean> {
  if (user.role === "admin") return true;
  if (person.linkedUserId === user.id) return true;
  if (person.createdByUserId === user.id) return true;
  return isSteward(user.id, person.id);
}

/**
 * Direct unlink on a person page: admin, relationship creator, or
 * linked user / steward of the context person.
 */
export async function canUnlinkRelationship(
  user: { id: number; role?: string },
  rel: Pick<Relationship, "createdByUserId">,
  contextPerson: Pick<Person, "id" | "linkedUserId">,
): Promise<boolean> {
  if (user.role === "admin") return true;
  if (rel.createdByUserId != null && rel.createdByUserId === user.id) {
    return true;
  }
  if (contextPerson.linkedUserId === user.id) return true;
  return isSteward(user.id, contextPerson.id);
}

/**
 * Who may review a remove-relationship proposal: admin, relationship creator,
 * or linked/steward of either endpoint person.
 */
export async function canReviewRelationshipRemoval(
  user: { id: number; role?: string },
  rel: Pick<Relationship, "createdByUserId" | "personAId" | "personBId">,
): Promise<boolean> {
  if (user.role === "admin") return true;
  if (rel.createdByUserId != null && rel.createdByUserId === user.id) {
    return true;
  }

  const personRepo = AppDataSource.getRepository(Person);
  const endpoints = await personRepo.find({
    where: [{ id: rel.personAId }, { id: rel.personBId }],
    select: ["id", "linkedUserId"],
  });
  for (const p of endpoints) {
    if (p.linkedUserId === user.id) return true;
    if (await isSteward(user.id, p.id)) return true;
  }
  return false;
}

/**
 * Lightweight BFS of person ids within maxRounds (no visibility filter).
 * Used by canViewPerson to avoid circular imports with relatives.service.
 */
async function reachablePersonIds(
  rootIds: number[],
  maxRounds: number,
): Promise<Set<number>> {
  const seeds = rootIds.filter((id) => id > 0);
  const seen = new Set(seeds);
  if (seeds.length === 0) return seen;

  const relRepo = AppDataSource.getRepository(Relationship);
  let frontier = [...seeds];

  for (let round = 0; round < maxRounds; round++) {
    if (frontier.length === 0) break;
    const touching = await relRepo
      .createQueryBuilder("r")
      .where("r.personAId IN (:...ids) OR r.personBId IN (:...ids)", {
        ids: frontier,
      })
      .getMany();
    const next: number[] = [];
    for (const r of touching) {
      for (const id of [r.personAId, r.personBId]) {
        if (!seen.has(id)) {
          seen.add(id);
          next.push(id);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

export async function canViewPerson(
  viewer: { id: number; role?: string } | null,
  person: Person,
): Promise<boolean> {
  const hardHidden = !!person.isPrivate;

  if (!viewer) {
    return person.visibility === PersonVisibility.PUBLIC && !hardHidden;
  }
  if (viewer.role === "admin") return true;
  if (await canEditPerson(viewer, person)) return true;

  // Hard opt-out: only stewards/creator/linked/admin (handled above) may view.
  if (hardHidden) return false;

  const vis = person.visibility || PersonVisibility.CONNECTIONS;

  if (vis === PersonVisibility.PUBLIC) return true;

  // connections and stewards: visible to relatives within N hops of viewer's linked person
  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: viewer.id },
    select: ["id", "linkedPersonId"],
  });
  if (!user?.linkedPersonId) return false;

  const reachable = await reachablePersonIds(
    [user.linkedPersonId],
    connectionsDegreeLimit(),
  );
  return reachable.has(person.id);
}

/** Ensure a steward row exists (idempotent). */
export async function ensureSteward(
  personId: number,
  userId: number,
  createdByUserId?: number,
): Promise<void> {
  const repo = AppDataSource.getRepository(PersonSteward);
  const existing = await repo.findOne({ where: { personId, userId } });
  if (existing) return;
  await repo.save(
    repo.create({
      personId,
      userId,
      createdByUserId: createdByUserId ?? userId,
    }),
  );
}

export async function stewardPersonIds(userId: number): Promise<number[]> {
  const rows = await AppDataSource.getRepository(PersonSteward).find({
    where: { userId },
  });
  return rows.map((r) => r.personId);
}

export async function getStewardsForPerson(
  personId: number,
): Promise<PersonSteward[]> {
  return AppDataSource.getRepository(PersonSteward).find({
    where: { personId },
  });
}

export async function stewardsForPersons(
  personIds: number[],
): Promise<PersonSteward[]> {
  if (personIds.length === 0) return [];
  return AppDataSource.getRepository(PersonSteward).find({
    where: { personId: In(personIds) },
  });
}
