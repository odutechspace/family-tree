import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { matchOne } from "@/src/api/services/person.match";

/**
 * GET /api/persons/suggestions?personId=X
 * Delegates to person.match.matchOne; response shape preserved.
 */
export async function GET(req: NextRequest) {
  await initializeDataSource();

  const { searchParams } = new URL(req.url);
  const personId = searchParams.get("personId");

  if (!personId) return apiError(ApiError.badRequest("personId is required."));

  const repo = AppDataSource.getRepository(Person);
  const subject = await repo.findOne({ where: { id: Number(personId) } });

  if (!subject) return apiError(ApiError.notFound("Person not found."));

  const matches = await matchOne(Number(personId));
  const candidateIds = matches.map((m) => m.candidateId);
  const candidates =
    candidateIds.length > 0
      ? await repo
          .createQueryBuilder("p")
          .where("p.id IN (:...ids)", { ids: candidateIds })
          .getMany()
      : [];
  const byId = new Map(candidates.map((c) => [c.id, c]));

  const suggestions = matches
    .map((m) => {
      const c = byId.get(m.candidateId);
      if (!c) return null;
      return {
        person: {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          nickname: c.nickname,
          gender: c.gender,
          birthDate: c.birthDate,
          aliveStatus: c.aliveStatus,
          photoUrl: c.photoUrl,
          personCode: c.personCode,
          tribeEthnicity: c.tribeEthnicity,
          originCountry: c.originCountry,
        },
        score: m.score,
        reasons: m.reasons,
        deterministic: m.deterministic,
      };
    })
    .filter(Boolean);

  return apiSuccess(
    { suggestions, subjectId: subject.id },
    "Suggestions retrieved",
  );
}
