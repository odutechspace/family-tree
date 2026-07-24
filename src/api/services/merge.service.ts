import { EntityManager } from "typeorm";

import { AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import { Relationship } from "@/src/api/entities/Relationship";
import { LifeEvent } from "@/src/api/entities/LifeEvent";
import { FamilyTreeMember } from "@/src/api/entities/FamilyTreeMember";
import { FamilyInvite } from "@/src/api/entities/FamilyInvite";
import { User } from "@/src/api/entities/User";
import { PersonSteward } from "@/src/api/entities/PersonSteward";
import { MergeRequest } from "@/src/api/entities/MergeRequest";
import { ProposedEdit } from "@/src/api/entities/ProposedEdit";
import { MergeAudit } from "@/src/api/entities/MergeAudit";

export interface MergeOutcome {
  targetPersonId: number;
  repointed: Record<string, number>;
  auditId: number;
}

const PERSON_MERGE_FIELDS: (keyof Person)[] = [
  "firstName",
  "middleName",
  "lastName",
  "maidenName",
  "nickname",
  "gender",
  "birthDate",
  "birthPlace",
  "aliveStatus",
  "deathDate",
  "deathPlace",
  "photoUrl",
  "biography",
  "oralHistory",
  "clanId",
  "tribeEthnicity",
  "totem",
  "originVillage",
  "originCountry",
  "personCode",
  "phoneHash",
  "visibility",
];

function isEmpty(v: unknown): boolean {
  return v == null || v === "";
}

function fieldMerge(target: Person, source: Person): void {
  for (const key of PERSON_MERGE_FIELDS) {
    const tVal = target[key];
    const sVal = source[key];
    if (isEmpty(tVal) && !isEmpty(sVal)) {
      (target as any)[key] = sVal;
    }
  }
  if (!target.linkedUserId && source.linkedUserId) {
    target.linkedUserId = source.linkedUserId;
  }
  if (source.isVerified) target.isVerified = true;
}

function edgeKey(a: number, b: number, type: string): string {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${type}:${lo}:${hi}`;
}

async function repointColumn(
  m: EntityManager,
  entity: Function,
  column: string,
  sourceId: number,
  targetId: number,
): Promise<number> {
  const result = await m
    .createQueryBuilder()
    .update(entity)
    .set({ [column]: targetId } as any)
    .where(`${column} = :id`, { id: sourceId })
    .execute();
  return result.affected ?? 0;
}

export async function mergePersons(
  sourceId: number,
  targetId: number,
  actorUserId: number,
  mergeRequestId?: number,
): Promise<MergeOutcome> {
  if (sourceId === targetId) {
    throw new Error("Cannot merge a person into itself.");
  }

  return AppDataSource.transaction(async (m) => {
    const personRepo = m.getRepository(Person);
    const source = await personRepo.findOne({ where: { id: sourceId } });
    const target = await personRepo.findOne({ where: { id: targetId } });
    if (!source || !target) {
      throw new Error("Source or target person not found.");
    }

    const relRepo = m.getRepository(Relationship);
    const sourceRels = await relRepo.find({
      where: [{ personAId: sourceId }, { personBId: sourceId }],
    });

    const counts: Record<string, number> = {};

    counts.relationshipA = await repointColumn(
      m,
      Relationship,
      "personAId",
      sourceId,
      targetId,
    );
    counts.relationshipB = await repointColumn(
      m,
      Relationship,
      "personBId",
      sourceId,
      targetId,
    );
    counts.lifeEvents = await repointColumn(
      m,
      LifeEvent,
      "personId",
      sourceId,
      targetId,
    );

    // FamilyTreeMember: re-point with dedupe
    const memberRepo = m.getRepository(FamilyTreeMember);
    const sourceMembers = await memberRepo.find({
      where: { personId: sourceId },
    });
    let memberMoved = 0;
    let memberDropped = 0;
    for (const mem of sourceMembers) {
      const exists = await memberRepo.findOne({
        where: { treeId: mem.treeId, personId: targetId },
      });
      if (exists) {
        if (mem.userId && !exists.userId) {
          exists.userId = mem.userId;
          await memberRepo.save(exists);
        }
        await memberRepo.remove(mem);
        memberDropped += 1;
      } else {
        mem.personId = targetId;
        await memberRepo.save(mem);
        memberMoved += 1;
      }
    }
    counts.treeMembersMoved = memberMoved;
    counts.treeMembersDropped = memberDropped;

    counts.invites = await repointColumn(
      m,
      FamilyInvite,
      "personId",
      sourceId,
      targetId,
    );

    // User.linkedPersonId
    const userRepo = m.getRepository(User);
    const users = await userRepo.find({ where: { linkedPersonId: sourceId } });
    for (const u of users) {
      u.linkedPersonId = targetId;
      await userRepo.save(u);
    }
    counts.usersLinked = users.length;

    // PersonSteward dedupe
    const stewardRepo = m.getRepository(PersonSteward);
    const sourceStewards = await stewardRepo.find({
      where: { personId: sourceId },
    });
    let stewardsMoved = 0;
    let stewardsDropped = 0;
    for (const s of sourceStewards) {
      const exists = await stewardRepo.findOne({
        where: { personId: targetId, userId: s.userId },
      });
      if (exists) {
        await stewardRepo.remove(s);
        stewardsDropped += 1;
      } else {
        s.personId = targetId;
        await stewardRepo.save(s);
        stewardsMoved += 1;
      }
    }
    counts.stewardsMoved = stewardsMoved;
    counts.stewardsDropped = stewardsDropped;

    // MergeRequest refs
    for (const col of [
      "sourcePersonId",
      "targetPersonId",
      "connectingPersonId",
    ] as const) {
      counts[`mergeRequest.${col}`] = await repointColumn(
        m,
        MergeRequest,
        col,
        sourceId,
        targetId,
      );
    }

    counts.proposedEdits = await repointColumn(
      m,
      ProposedEdit,
      "personId",
      sourceId,
      targetId,
    );

    // Drop self-relationships and duplicate edges
    const allTargetRels = await relRepo.find({
      where: [{ personAId: targetId }, { personBId: targetId }],
    });
    const seen = new Set<string>();
    let selfDeleted = 0;
    let dupDeleted = 0;
    for (const r of allTargetRels) {
      if (r.personAId === r.personBId) {
        await relRepo.remove(r);
        selfDeleted += 1;
        continue;
      }
      const key = edgeKey(r.personAId, r.personBId, r.type);
      if (seen.has(key)) {
        await relRepo.remove(r);
        dupDeleted += 1;
      } else {
        seen.add(key);
      }
    }
    counts.selfRelationshipsDeleted = selfDeleted;
    counts.duplicateRelationshipsDeleted = dupDeleted;

    fieldMerge(target, source);
    await personRepo.save(target);

    const auditRepo = m.getRepository(MergeAudit);
    const audit = await auditRepo.save(
      auditRepo.create({
        sourcePersonId: sourceId,
        targetPersonId: targetId,
        sourcePersonSnapshot: JSON.stringify(source),
        sourceRelationshipsSnapshot: JSON.stringify(sourceRels),
        repointedCounts: JSON.stringify(counts),
        mergeRequestId: mergeRequestId ?? null,
        performedByUserId: actorUserId,
        undoneAt: null,
      }),
    );

    await personRepo.remove(source);

    return {
      targetPersonId: targetId,
      repointed: counts,
      auditId: audit.id,
    };
  });
}

/**
 * Best-effort undo: recreate source person and restore relationship snapshots.
 * Does not perfectly reverse every membership/invite side effect.
 */
export async function undoMerge(
  auditId: number,
  actorUserId: number,
): Promise<void> {
  await AppDataSource.transaction(async (m) => {
    const auditRepo = m.getRepository(MergeAudit);
    const audit = await auditRepo.findOne({ where: { id: auditId } });
    if (!audit) throw new Error("Merge audit not found.");
    if (audit.undoneAt) throw new Error("Merge already undone.");

    const snapshot = JSON.parse(audit.sourcePersonSnapshot) as Person;
    const personRepo = m.getRepository(Person);

    // Recreate without primary key conflict — use original id if free
    const existing = await personRepo.findOne({
      where: { id: audit.sourcePersonId },
    });
    if (existing) {
      throw new Error("Source person id already exists; cannot undo.");
    }

    const {
      id: _id,
      createdAt: _c,
      updatedAt: _u,
      ...rest
    } = snapshot as any;
    const restored = rest as Partial<Person>;
    await m.query(
      // Insert with explicit id for MySQL
      `INSERT INTO person (
        id, firstName, middleName, lastName, maidenName, nickname, gender,
        birthDate, birthPlace, aliveStatus, deathDate, deathPlace, photoUrl,
        biography, oralHistory, clanId, tribeEthnicity, totem, originVillage,
        originCountry, personCode, phoneHash, linkedUserId, createdByUserId,
        isVerified, isPrivate, visibility
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        audit.sourcePersonId,
        restored.firstName,
        restored.middleName ?? null,
        restored.lastName,
        restored.maidenName ?? null,
        restored.nickname ?? null,
        restored.gender,
        restored.birthDate ?? null,
        restored.birthPlace ?? null,
        restored.aliveStatus,
        restored.deathDate ?? null,
        restored.deathPlace ?? null,
        restored.photoUrl ?? null,
        restored.biography ?? null,
        restored.oralHistory ?? null,
        restored.clanId ?? null,
        restored.tribeEthnicity ?? null,
        restored.totem ?? null,
        restored.originVillage ?? null,
        restored.originCountry ?? null,
        restored.personCode ?? null,
        restored.phoneHash ?? null,
        restored.linkedUserId ?? null,
        restored.createdByUserId ?? null,
        restored.isVerified ? 1 : 0,
        restored.isPrivate ? 1 : 0,
        restored.visibility ?? "connections",
      ],
    );

    if (audit.sourceRelationshipsSnapshot) {
      const rels = JSON.parse(audit.sourceRelationshipsSnapshot) as Relationship[];
      const relRepo = m.getRepository(Relationship);
      for (const r of rels) {
        const exists = await relRepo.findOne({
          where: {
            personAId: r.personAId,
            personBId: r.personBId,
            type: r.type,
          },
        });
        if (!exists) {
          await relRepo.save(
            relRepo.create({
              personAId: r.personAId,
              personBId: r.personBId,
              type: r.type,
              status: r.status,
              startDate: r.startDate,
              endDate: r.endDate,
              marriagePlace: r.marriagePlace,
              ceremonyType: r.ceremonyType,
              unionOrder: r.unionOrder,
              notes: r.notes,
              createdByUserId: r.createdByUserId ?? actorUserId,
              isVerified: r.isVerified,
            }),
          );
        }
      }
    }

    audit.undoneAt = new Date();
    await auditRepo.save(audit);
  });
}
