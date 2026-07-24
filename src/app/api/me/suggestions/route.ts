import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { User } from "@/src/api/entities/User";
import { Person } from "@/src/api/entities/Person";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { matchOne } from "@/src/api/services/person.match";
import { getRelatives } from "@/src/api/services/graph/relatives.service";
import { canViewPerson } from "@/src/lib/permissions";
import { kinshipLabel } from "@/src/lib/kinshipLabel";

/** GET /api/me/suggestions — matches to connect + nearby relatives (view-only) */
export async function GET(req: NextRequest) {
  await initializeDataSource();
  const auth = await getAuthUser(req);
  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: auth.id },
    select: ["id", "linkedPersonId"],
  });

  if (!user?.linkedPersonId) {
    return apiSuccess(
      {
        matches: [],
        relativesNearby: [],
        secondDegree: [],
        reachablePersonIds: [],
        linkedPersonId: null,
      },
      "No linked person",
    );
  }

  const linkedPersonId = user.linkedPersonId;

  const relatives = await getRelatives([linkedPersonId], {
    maxRounds: 2,
    viewerUserId: auth.id,
    viewerRole: auth.role,
  });

  const reachablePersonIds = relatives.nodes.map((n) => n.person.id);
  const reachableSet = new Set(reachablePersonIds);

  const peopleForLabel = relatives.nodes.map((n) => ({
    id: n.person.id,
    gender: n.person.gender,
  }));
  const edgesForLabel = relatives.edges.map((e) => ({
    personAId: e.relationship.personAId,
    personBId: e.relationship.personBId,
    type: e.relationship.type,
  }));

  const relativesNearby = relatives.nodes
    .filter((n) => n.degree >= 1 && n.degree <= 2)
    .map((n) => ({
      id: n.person.id,
      firstName: n.person.firstName,
      lastName: n.person.lastName,
      middleName: n.person.middleName,
      photoUrl: n.person.photoUrl,
      gender: n.person.gender,
      degree: n.degree,
      kinshipLabel: kinshipLabel(
        linkedPersonId,
        n.person.id,
        n.degree,
        peopleForLabel,
        edgesForLabel,
      ),
    }));

  // Compat alias used by older clients
  const secondDegree = relativesNearby.filter((n) => n.degree === 2);

  const matches = await matchOne(linkedPersonId);
  const candidateIds = matches
    .map((m) => m.candidateId)
    .filter((id) => !reachableSet.has(id));
  const personRepo = AppDataSource.getRepository(Person);
  const candidates =
    candidateIds.length > 0
      ? await personRepo
          .createQueryBuilder("p")
          .where("p.id IN (:...ids)", { ids: candidateIds })
          .getMany()
      : [];
  const byId = new Map(candidates.map((c) => [c.id, c]));

  const visibleMatches = [];
  for (const m of matches) {
    if (reachableSet.has(m.candidateId)) continue;
    const p = byId.get(m.candidateId);
    if (!p) continue;
    if (!(await canViewPerson(auth, p))) continue;
    visibleMatches.push({
      candidateId: m.candidateId,
      score: m.score,
      reasons: m.reasons,
      deterministic: m.deterministic,
      suggestedRelType: "same_person",
      person: {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        middleName: p.middleName,
        photoUrl: p.photoUrl,
      },
    });
  }

  return apiSuccess(
    {
      linkedPersonId,
      matches: visibleMatches,
      relativesNearby,
      secondDegree,
      reachablePersonIds,
    },
    "Suggestions retrieved",
  );
}
