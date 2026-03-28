import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Achievement } from "@/src/api/entities/Achievement";
import { UserAchievement } from "@/src/api/entities/UserAchievement";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";
import { ACHIEVEMENT_SEEDS } from "@/src/api/services/gamification/achievements.seed";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const auth = await getAuthUser(req);
  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const achRepo = AppDataSource.getRepository(Achievement);
  const userAchRepo = AppDataSource.getRepository(UserAchievement);

  // Ensure seeded
  for (const seed of ACHIEVEMENT_SEEDS) {
    const existing = await achRepo.findOne({ where: { key: seed.key } });
    if (!existing) await achRepo.save(achRepo.create(seed as any));
  }

  const allAchievements = await achRepo.find({ where: { isActive: true }, order: { category: "ASC", rarity: "ASC" } });
  const unlocked = await userAchRepo.find({ where: { userId: auth.id } });
  const unlockedMap = new Map(unlocked.map(u => [u.achievementKey, u.unlockedAt]));

  const achievements = allAchievements.map(a => ({
    id: a.id,
    key: a.key,
    name: a.name,
    description: a.description,
    icon: a.icon,
    category: a.category,
    rarity: a.rarity,
    xpReward: a.xpReward,
    progressTarget: a.progressTarget,
    progressField: a.progressField,
    isUnlocked: unlockedMap.has(a.key),
    unlockedAt: unlockedMap.get(a.key) ?? null,
  }));

  const totalUnlocked = achievements.filter(a => a.isUnlocked).length;

  return apiSuccess({ achievements, totalUnlocked, total: achievements.length }, "Achievements retrieved");
}
