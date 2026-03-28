import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { UserXP, LEVEL_NAMES, calcLevel } from "@/src/api/entities/UserXP";
import { User } from "@/src/api/entities/User";
import { apiSuccess } from "@/src/lib/ApiResponse";

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
      .select(["u.id", "u.name", "u.profilePhotoUrl"])
      .getMany();
  }

  const userMap = new Map(users.map((u) => [u.id, u]));

  const leaderboard = topXP.map((xp, index) => {
    const user = userMap.get(xp.userId);
    const level = calcLevel(xp.totalXP);

    return {
      rank: index + 1,
      userId: xp.userId,
      name: user?.name || "Unknown",
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
