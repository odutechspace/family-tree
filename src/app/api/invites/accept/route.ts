import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { FamilyInvite, InviteStatus } from "@/src/api/entities/FamilyInvite";
import {
  FamilyTreeMember,
  TreeMemberRole,
} from "@/src/api/entities/FamilyTreeMember";
import { FamilyTree } from "@/src/api/entities/FamilyTree";
import { Person } from "@/src/api/entities/Person";
import { PersonSteward } from "@/src/api/entities/PersonSteward";
import { User } from "@/src/api/entities/User";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { generateToken } from "@/src/lib/jwt";
import { ensureSteward } from "@/src/lib/permissions";
import { getRelatives } from "@/src/api/services/graph/relatives.service";
import { matchSets } from "@/src/api/services/person.match";
import { mergePersons } from "@/src/api/services/merge.service";
import { awardXP } from "@/src/api/services/gamification/gamification.service";
import { formatPersonDisplayName } from "@/src/lib/personDisplayName";

/** GET /api/invites/accept?token=xxx */
export async function GET(req: NextRequest) {
  await initializeDataSource();

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return apiError(ApiError.badRequest("token is required."));

  const repo = AppDataSource.getRepository(FamilyInvite);
  const invite = await repo.findOne({ where: { token } });

  if (!invite) return apiError(ApiError.notFound("Invite not found."));
  if (invite.status === InviteStatus.REVOKED) {
    return apiError(ApiError.badRequest("This invite has been revoked."));
  }
  if (invite.status === InviteStatus.ACCEPTED) {
    return apiError(ApiError.badRequest("This invite has already been used."));
  }
  if (new Date() > invite.expiresAt) {
    invite.status = InviteStatus.EXPIRED;
    await repo.save(invite);
    return apiError(ApiError.badRequest("This invite has expired."));
  }

  const tree = await AppDataSource.getRepository(FamilyTree).findOne({
    where: { id: invite.treeId },
  });
  let person: Person | null = null;
  if (invite.personId) {
    person = await AppDataSource.getRepository(Person).findOne({
      where: { id: invite.personId },
    });
  }

  const existingUser = await AppDataSource.getRepository(User).findOne({
    where: { email: invite.email },
    select: ["id", "name", "email"],
  });

  return apiSuccess(
    {
      invite: {
        id: invite.id,
        email: invite.email,
        message: invite.message,
        treeId: invite.treeId,
        personId: invite.personId,
        expiresAt: invite.expiresAt,
      },
      tree: tree ? { id: tree.id, name: tree.name } : null,
      person: person
        ? {
            id: person.id,
            firstName: person.firstName,
            middleName: person.middleName,
            lastName: person.lastName,
            maidenName: person.maidenName,
            nickname: person.nickname,
          }
        : null,
      hasAccount: !!existingUser,
    },
    "Invite details retrieved",
  );
}

export async function POST(req: NextRequest) {
  await initializeDataSource();

  const body = await req.json();
  const { token, name, password } = body as {
    token: string;
    name?: string;
    password?: string;
  };

  if (!token) return apiError(ApiError.badRequest("token is required."));

  const inviteRepo = AppDataSource.getRepository(FamilyInvite);
  const invite = await inviteRepo.findOne({ where: { token } });

  if (!invite) return apiError(ApiError.notFound("Invite not found."));
  if (invite.status !== InviteStatus.PENDING) {
    return apiError(ApiError.badRequest(`Invite is ${invite.status}.`));
  }
  if (new Date() > invite.expiresAt) {
    invite.status = InviteStatus.EXPIRED;
    await inviteRepo.save(invite);
    return apiError(ApiError.badRequest("This invite has expired."));
  }

  const userRepo = AppDataSource.getRepository(User);
  const personRepo = AppDataSource.getRepository(Person);
  const memberRepo = AppDataSource.getRepository(FamilyTreeMember);
  const stewardRepo = AppDataSource.getRepository(PersonSteward);

  let userId: number;
  let jwtToken: string | null = null;

  const authUser = await getAuthUser(req);

  if (authUser) {
    userId = authUser.id;
  } else {
    const existing = await userRepo.findOne({ where: { email: invite.email } });
    if (existing) {
      return apiError(
        ApiError.badRequest(
          "An account already exists for this email. Please log in first, then follow the invite link again.",
        ),
      );
    }
    if (!name || !password) {
      return apiError(
        ApiError.badRequest(
          "name and password are required to create a new account.",
        ),
      );
    }
    const hashed = await bcrypt.hash(password, 10);
    const savedUser = await userRepo.save(
      userRepo.create({
        name,
        email: invite.email,
        password: hashed,
      }),
    );
    userId = savedUser.id;
    jwtToken = await generateToken(userId, "user");
  }

  const claimedPersonId = invite.personId ?? null;

  // Link person ↔ user + steward
  if (claimedPersonId) {
    const person = await personRepo.findOne({ where: { id: claimedPersonId } });
    if (person) {
      if (!person.linkedUserId) {
        person.linkedUserId = userId;
        await personRepo.save(person);
      }
      const user = await userRepo.findOne({ where: { id: userId } });
      if (user && !user.linkedPersonId) {
        user.linkedPersonId = claimedPersonId;
        await userRepo.save(user);
      }
      await ensureSteward(claimedPersonId, userId, userId);
    }
  }

  // Always ensure tree membership (fixes personId ?? 0 short-circuit)
  const existingMembership = await memberRepo.findOne({
    where: { treeId: invite.treeId, userId },
  });

  if (!existingMembership) {
    if (claimedPersonId) {
      const byPerson = await memberRepo.findOne({
        where: { treeId: invite.treeId, personId: claimedPersonId },
      });
      if (byPerson) {
        byPerson.userId = userId;
        byPerson.role = TreeMemberRole.EDITOR;
        await memberRepo.save(byPerson);
      } else {
        await memberRepo.save(
          memberRepo.create({
            treeId: invite.treeId,
            personId: claimedPersonId,
            userId,
            role: TreeMemberRole.EDITOR,
          }),
        );
      }
    } else {
      // Collaborator without a person node — use placeholder personId 0
      await memberRepo.save(
        memberRepo.create({
          treeId: invite.treeId,
          personId: 0,
          userId,
          role: TreeMemberRole.EDITOR,
        }),
      );
    }
  }

  // Phase 2: auto-merge common people
  let autoMerged: Array<{ sourceId: number; targetId: number }> = [];
  let pendingMerges: Array<{
    sourceId: number;
    targetId: number;
    score: number;
    reasons: string[];
    source: { id: number; label: string };
    target: { id: number; label: string };
  }> = [];

  if (claimedPersonId) {
    const myStewardRows = await stewardRepo.find({ where: { userId } });
    const myCreated = await personRepo.find({
      where: { createdByUserId: userId },
      select: ["id"],
    });
    const myLinked = await userRepo.findOne({
      where: { id: userId },
      select: ["linkedPersonId"],
    });
    const myPersonIds = [
      ...new Set([
        ...myStewardRows.map((s) => s.personId),
        ...myCreated.map((p) => p.id),
        ...(myLinked?.linkedPersonId ? [myLinked.linkedPersonId] : []),
      ]),
    ];

    const treeRelatives = await getRelatives([claimedPersonId]);
    const treePersonIds = treeRelatives.nodes.map((n) => n.person.id);

    const matches = await matchSets(myPersonIds, treePersonIds);
    const personById = new Map(
      treeRelatives.nodes.map((n) => [n.person.id, n.person]),
    );
    // Also load my persons for labels
    if (myPersonIds.length > 0) {
      const mine = await personRepo
        .createQueryBuilder("p")
        .where("p.id IN (:...ids)", { ids: myPersonIds })
        .getMany();
      for (const p of mine) personById.set(p.id, p);
    }

    for (const m of matches) {
      // Keep tree's person as target (candidateId is from set B = tree)
      const sourceId = m.personId; // mine
      const targetId = m.candidateId; // tree
      if (!treePersonIds.includes(targetId) || !myPersonIds.includes(sourceId)) {
        // swap if orientation flipped
        continue;
      }
      if (sourceId === targetId) continue;

      if (m.deterministic) {
        try {
          await mergePersons(sourceId, targetId, userId);
          autoMerged.push({ sourceId, targetId });
          await awardXP(
            userId,
            XPEventType.CONFIRM_MERGE,
            targetId,
            "Auto-merged matching person on invite accept",
          );
        } catch {
          // skip failed auto-merge
        }
      } else if (m.score >= 30) {
        const source = personById.get(sourceId);
        const target = personById.get(targetId);
        if (source && target) {
          pendingMerges.push({
            sourceId,
            targetId,
            score: m.score,
            reasons: m.reasons,
            source: {
              id: source.id,
              label: formatPersonDisplayName(source),
            },
            target: {
              id: target.id,
              label: formatPersonDisplayName(target),
            },
          });
        }
      }
    }
  }

  // Relatives preview
  let relativesSummary: {
    count: number;
    sample: Array<{
      id: number;
      firstName: string;
      lastName: string;
      photoUrl?: string | null;
      label: string;
    }>;
  } = { count: 0, sample: [] };

  if (claimedPersonId) {
    const relatives = await getRelatives([claimedPersonId], {
      viewerUserId: userId,
      viewerRole: "user",
    });
    relativesSummary = {
      count: relatives.nodes.length,
      sample: relatives.nodes.slice(0, 8).map((n) => ({
        id: n.person.id,
        firstName: n.person.firstName,
        lastName: n.person.lastName,
        photoUrl: n.person.photoUrl,
        label: formatPersonDisplayName(n.person),
      })),
    };
    await awardXP(
      userId,
      XPEventType.CLAIM_PERSON,
      claimedPersonId,
      "Claimed your person node via invite",
    );
  }

  invite.status = InviteStatus.ACCEPTED;
  await inviteRepo.save(invite);

  const response = apiSuccess(
    {
      treeId: invite.treeId,
      personId: claimedPersonId,
      relatives: relativesSummary,
      autoMerged,
      pendingMerges,
    },
    "Invite accepted. Welcome to the family tree!",
  );

  if (jwtToken) {
    response.cookies.set("token", jwtToken, { httpOnly: true, maxAge: 3600 });
  }

  return response;
}

export async function DELETE(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return apiError(ApiError.badRequest("token is required."));

  const repo = AppDataSource.getRepository(FamilyInvite);
  const invite = await repo.findOne({ where: { token } });

  if (!invite) return apiError(ApiError.notFound("Invite not found."));
  if (invite.invitedByUserId !== user.id) {
    return apiError(ApiError.forbidden("Not authorized."));
  }

  invite.status = InviteStatus.REVOKED;
  await repo.save(invite);

  return apiSuccess({}, "Invite revoked");
}
