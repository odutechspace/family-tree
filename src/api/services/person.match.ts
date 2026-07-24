import { AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";

export interface MatchResult {
  personId: number;
  candidateId: number;
  score: number;
  reasons: string[];
  deterministic: boolean;
}

const SCORE_THRESHOLD = 30;

export function scorePair(
  a: Person,
  b: Person,
): { score: number; reasons: string[]; deterministic: boolean } {
  const reasons: string[] = [];
  let score = 0;
  let deterministic = false;

  if (
    a.personCode &&
    b.personCode &&
    a.personCode.toUpperCase() === b.personCode.toUpperCase()
  ) {
    deterministic = true;
    score += 100;
    reasons.push("Same person code");
  }

  if (a.phoneHash && b.phoneHash && a.phoneHash === b.phoneHash) {
    deterministic = true;
    score += 100;
    reasons.push("Same phone identity");
  }

  if (
    a.linkedUserId &&
    b.linkedUserId &&
    a.linkedUserId === b.linkedUserId
  ) {
    deterministic = true;
    score += 100;
    reasons.push("Same linked user");
  }

  const fullA = `${a.firstName} ${a.lastName}`.toLowerCase().trim();
  const fullB = `${b.firstName} ${b.lastName}`.toLowerCase().trim();

  if (fullA === fullB) {
    score += 40;
    reasons.push("Same full name");
  } else if (a.lastName?.toLowerCase() === b.lastName?.toLowerCase()) {
    score += 10;
  }

  const aYear = a.birthDate ? new Date(a.birthDate).getFullYear() : null;
  if (aYear && b.birthDate) {
    const bYear = new Date(b.birthDate).getFullYear();
    if (bYear === aYear) {
      score += 20;
      reasons.push(`Same birth year (${aYear})`);
    } else if (Math.abs(bYear - aYear) === 1) {
      score += 10;
      reasons.push(`Similar birth year (${bYear} vs ${aYear})`);
    }
  }

  if (
    a.gender !== "unknown" &&
    b.gender !== "unknown" &&
    a.gender === b.gender
  ) {
    score += 5;
  }

  if (a.clanId && b.clanId && a.clanId === b.clanId) {
    score += 10;
    reasons.push("Same clan");
  }

  if (
    a.totem &&
    b.totem &&
    a.totem.toLowerCase() === b.totem.toLowerCase()
  ) {
    score += 5;
    reasons.push(`Same totem (${a.totem})`);
  }

  if (
    a.originCountry &&
    b.originCountry &&
    a.originCountry.toLowerCase() === b.originCountry.toLowerCase()
  ) {
    score += 5;
    reasons.push(`Same origin country (${a.originCountry})`);
  }

  if (
    a.originVillage &&
    b.originVillage &&
    a.originVillage.toLowerCase() === b.originVillage.toLowerCase()
  ) {
    score += 5;
  }

  if (
    a.tribeEthnicity &&
    b.tribeEthnicity &&
    a.tribeEthnicity.toLowerCase() === b.tribeEthnicity.toLowerCase()
  ) {
    score += 5;
    reasons.push(`Same tribe/ethnicity (${a.tribeEthnicity})`);
  }

  if (
    a.maidenName &&
    b.maidenName &&
    a.maidenName.toLowerCase() === b.maidenName.toLowerCase()
  ) {
    score += 5;
  }

  return { score, reasons, deterministic };
}

export async function matchOne(personId: number): Promise<MatchResult[]> {
  const repo = AppDataSource.getRepository(Person);
  const subject = await repo.findOne({ where: { id: personId } });
  if (!subject) return [];

  const candidates = await repo
    .createQueryBuilder("person")
    .where("person.id != :id", { id: subject.id })
    .andWhere("person.linkedUserId IS NULL OR person.linkedUserId != :uid", {
      uid: subject.linkedUserId ?? -1,
    })
    .andWhere(
      "(LEFT(person.firstName, 1) = :fl OR person.lastName = :lastName)",
      {
        fl: (subject.firstName?.[0] || "").toUpperCase(),
        lastName: subject.lastName,
      },
    )
    .take(200)
    .getMany();

  return candidates
    .map((c) => {
      const { score, reasons, deterministic } = scorePair(subject, c);
      return {
        personId: subject.id,
        candidateId: c.id,
        score,
        reasons,
        deterministic,
      };
    })
    .filter((r) => r.score >= SCORE_THRESHOLD || r.deterministic)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export async function matchSets(
  idsA: number[],
  idsB: number[],
): Promise<MatchResult[]> {
  const a = [...new Set(idsA.filter((id) => id > 0))];
  const b = [...new Set(idsB.filter((id) => id > 0))];
  if (a.length === 0 || b.length === 0) return [];

  const repo = AppDataSource.getRepository(Person);
  const personsA = await repo
    .createQueryBuilder("p")
    .where("p.id IN (:...ids)", { ids: a })
    .getMany();
  const personsB = await repo
    .createQueryBuilder("p")
    .where("p.id IN (:...ids)", { ids: b })
    .getMany();

  const results: MatchResult[] = [];
  const seen = new Set<string>();

  for (const pa of personsA) {
    for (const pb of personsB) {
      if (pa.id === pb.id) continue;
      const key = [Math.min(pa.id, pb.id), Math.max(pa.id, pb.id)].join(":");
      if (seen.has(key)) continue;
      const { score, reasons, deterministic } = scorePair(pa, pb);
      if (score < SCORE_THRESHOLD && !deterministic) continue;
      seen.add(key);
      results.push({
        personId: pa.id,
        candidateId: pb.id,
        score,
        reasons,
        deterministic,
      });
    }
  }

  return results.sort((x, y) => y.score - x.score);
}
