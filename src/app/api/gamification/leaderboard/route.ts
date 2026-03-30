import { NextRequest } from "next/server";
import { In } from "typeorm";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { UserXP, LEVEL_NAMES, calcLevel } from "@/src/api/entities/UserXP";
import { User } from "@/src/api/entities/User";
import { Person } from "@/src/api/entities/Person";
import { apiSuccess } from "@/src/lib/ApiResponse";
import { formatPersonDisplayName } from "@/src/lib/personDisplayName";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  const xpRepo = AppDataSource.getRepository(UserXP);
  const userRepo = AppDataSource.getRepository(User);

  const topXP = await xpRepo.find({ order: { totalXP: "DESC" }, take: limit });

  const userIds = topXP.map((x) => x.userId);
  let users: User[] = [];

  if (userIds.length > 0) {
    users = await userRepo
      .createQueryBuilder("u")
      .where("u.id IN (:...ids)", { ids: userIds })
      .select(["u.id", "u.name", "u.profilePhotoUrl", "u.linkedPersonId"])
      .getMany();
  }

  const userMap = new Map(users.map((u) => [u.id, u]));
  const linkedIds = [
    ...new Set(
      users
        .map((u) => u.linkedPersonId)
        .filter((id): id is number => id != null && id > 0),
    ),
  ];
  let personById = new Map<number, Person>();

  if (linkedIds.length > 0) {
    const persons = await AppDataSource.getRepository(Person).find({
      where: { id: In(linkedIds) },
    });

    personById = new Map(persons.map((p) => [p.id, p]));
  }

  const resolveUserName = (u: User | undefined) => {
    if (!u) return "Unknown";
    if (u.linkedPersonId) {
      const p = personById.get(u.linkedPersonId);

      if (p) return formatPersonDisplayName(p);
    }

    return u.name;
  };

  const leaderboard = topXP.map((xp, index) => {
    const user = userMap.get(xp.userId);
    const level = calcLevel(xp.totalXP);

    return {
      rank: index + 1,
      userId: xp.userId,
      name: resolveUserName(user),
      profilePhotoUrl: user?.profilePhotoUrl,
      totalXP: xp.totalXP,
      level,
      levelName: LEVEL_NAMES[level - 1],
      currentStreak: xp.currentStreak,
      personsAdded: xp.personsAdded,
    };
  });

  return apiSuccess({ leaderboard }, "Leaderboard retrieved");
}
