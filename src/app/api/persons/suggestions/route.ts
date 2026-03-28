import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";

/**
 * GET /api/persons/suggestions?personId=X
 *
 * Returns potential duplicate / same-person matches for person X across
 * all other person records. Uses a weighted scoring model — no external
 * service needed, runs entirely in-DB + JS.
 *
 * Score weights (max 100):
 *  - Exact full name match          : 40 pts
 *  - Same birth year                : 20 pts
 *  - Same birth year ±1             : 10 pts
 *  - Same gender (non-unknown)      :  5 pts
 *  - Same clan                      : 10 pts
 *  - Same totem                     :  5 pts
 *  - Same origin country            :  5 pts
 *  - Same origin village            :  5 pts
 *  - Same tribe/ethnicity           :  5 pts
 *  - Same maiden name (non-empty)   :  5 pts  (bonus)
 *
 * Only results with score >= 30 are returned, capped at 10.
 * Results exclude persons already linked to the same user.
 */
export async function GET(req: NextRequest) {
  await initializeDataSource();

  const { searchParams } = new URL(req.url);
  const personId = searchParams.get("personId");

  if (!personId) return apiError(ApiError.badRequest("personId is required."));

  const repo = AppDataSource.getRepository(Person);
  const subject = await repo.findOne({ where: { id: Number(personId) } });

  if (!subject) return apiError(ApiError.notFound("Person not found."));

  // Pull candidates: same or similar name (SQL pre-filter for performance)
  // We use a broad LIKE on firstName to limit the scan, then score in JS
  const subjectYear = subject.birthDate
    ? new Date(subject.birthDate).getFullYear()
    : null;

  const candidates = await repo
    .createQueryBuilder("person")
    .where("person.id != :id", { id: subject.id })
    .andWhere("person.linkedUserId IS NULL OR person.linkedUserId != :uid", {
      uid: subject.linkedUserId ?? -1,
    })
    .andWhere(
      // Broad pre-filter: first letter of first name OR same last name
      "(LEFT(person.firstName, 1) = :fl OR person.lastName = :lastName)",
      {
        fl: (subject.firstName?.[0] || "").toUpperCase(),
        lastName: subject.lastName,
      },
    )
    .take(200)
    .getMany();

  const scored = candidates
    .map((c) => {
      let score = 0;

      // Name
      const fullA = `${subject.firstName} ${subject.lastName}`
        .toLowerCase()
        .trim();
      const fullB = `${c.firstName} ${c.lastName}`.toLowerCase().trim();

      if (fullA === fullB) score += 40;
      else if (c.lastName.toLowerCase() === subject.lastName.toLowerCase())
        score += 10;

      // Birth year
      if (subjectYear && c.birthDate) {
        const cYear = new Date(c.birthDate).getFullYear();

        if (cYear === subjectYear) score += 20;
        else if (Math.abs(cYear - subjectYear) === 1) score += 10;
      }

      // Gender (only score non-unknown)
      if (
        subject.gender !== "unknown" &&
        c.gender !== "unknown" &&
        subject.gender === c.gender
      )
        score += 5;

      // Clan
      if (subject.clanId && c.clanId && subject.clanId === c.clanId)
        score += 10;

      // Totem
      if (
        subject.totem &&
        c.totem &&
        subject.totem.toLowerCase() === c.totem.toLowerCase()
      )
        score += 5;

      // Origin country
      if (
        subject.originCountry &&
        c.originCountry &&
        subject.originCountry.toLowerCase() === c.originCountry.toLowerCase()
      )
        score += 5;

      // Origin village
      if (
        subject.originVillage &&
        c.originVillage &&
        subject.originVillage.toLowerCase() === c.originVillage.toLowerCase()
      )
        score += 5;

      // Tribe / ethnicity
      if (
        subject.tribeEthnicity &&
        c.tribeEthnicity &&
        subject.tribeEthnicity.toLowerCase() === c.tribeEthnicity.toLowerCase()
      )
        score += 5;

      // Maiden name bonus
      if (
        subject.maidenName &&
        c.maidenName &&
        subject.maidenName.toLowerCase() === c.maidenName.toLowerCase()
      )
        score += 5;

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
        score,
        reasons: buildReasons(subject, c, subjectYear),
      };
    })
    .filter((r) => r.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return apiSuccess(
    { suggestions: scored, subjectId: subject.id },
    "Suggestions retrieved",
  );
}

function buildReasons(
  subject: Person,
  candidate: Person,
  subjectYear: number | null,
): string[] {
  const reasons: string[] = [];

  if (
    `${subject.firstName} ${subject.lastName}`.toLowerCase() ===
    `${candidate.firstName} ${candidate.lastName}`.toLowerCase()
  ) {
    reasons.push("Same full name");
  }

  if (subjectYear && candidate.birthDate) {
    const cYear = new Date(candidate.birthDate).getFullYear();

    if (cYear === subjectYear) reasons.push(`Same birth year (${subjectYear})`);
    else if (Math.abs(cYear - subjectYear) === 1)
      reasons.push(`Similar birth year (${cYear} vs ${subjectYear})`);
  }

  if (subject.clanId && candidate.clanId && subject.clanId === candidate.clanId)
    reasons.push("Same clan");

  if (
    subject.totem &&
    candidate.totem &&
    subject.totem.toLowerCase() === candidate.totem.toLowerCase()
  )
    reasons.push(`Same totem (${subject.totem})`);

  if (
    subject.tribeEthnicity &&
    candidate.tribeEthnicity &&
    subject.tribeEthnicity.toLowerCase() ===
      candidate.tribeEthnicity.toLowerCase()
  )
    reasons.push(`Same tribe/ethnicity (${subject.tribeEthnicity})`);

  if (
    subject.originCountry &&
    candidate.originCountry &&
    subject.originCountry.toLowerCase() ===
      candidate.originCountry.toLowerCase()
  )
    reasons.push(`Same origin country (${subject.originCountry})`);

  return reasons;
}
