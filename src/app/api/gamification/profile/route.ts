import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { UserXP, LEVEL_THRESHOLDS, LEVEL_NAMES, calcLevel, xpForNextLevel } from "@/src/api/entities/UserXP";
import { UserAchievement } from "@/src/api/entities/UserAchievement";
import { Achievement } from "@/src/api/entities/Achievement";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const auth = getAuthUser(req);
  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId") ? Number(searchParams.get("userId")) : auth.id;

  const xpRepo = AppDataSource.getRepository(UserXP);
  const userAchRepo = AppDataSource.getRepository(UserAchievement);
  const achRepo = AppDataSource.getRepository(Achievement);

  let xp = await xpRepo.findOne({ where: { userId: targetUserId } });
  if (!xp) {
    xp = xpRepo.create({ userId: targetUserId, totalXP: 0, level: 1 });
    xp = await xpRepo.save(xp) as unknown as UserXP;
  }

  const level = calcLevel(xp.totalXP);
  const levelName = LEVEL_NAMES[level - 1];
  const currentLevelXP = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextLevelXP = xpForNextLevel(level);
  const xpIntoLevel = xp.totalXP - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const progressPercent = Math.min(Math.floor((xpIntoLevel / xpNeededForLevel) * 100), 100);

  const userAchs = await userAchRepo.find({ where: { userId: targetUserId }, order: { unlockedAt: "DESC" } });
  const achIds = userAchs.map(ua => ua.achievementId);

  let recentAchievements: Achievement[] = [];
  if (achIds.length > 0) {
    recentAchievements = await achRepo
      .createQueryBuilder("a")
      .where("a.id IN (:...ids)", { ids: achIds.slice(0, 5) })
      .getMany();
  }

  return apiSuccess({
    userId: targetUserId,
    totalXP: xp.totalXP,
    level,
    levelName,
    xpIntoLevel,
    xpNeededForLevel,
    progressPercent,
    currentStreak: xp.currentStreak,
    longestStreak: xp.longestStreak,
    lastActivityDate: xp.lastActivityDate,
    stats: {
      personsAdded: xp.personsAdded,
      relationshipsAdded: xp.relationshipsAdded,
      eventsAdded: xp.eventsAdded,
      clansCreated: xp.clansCreated,
      treesCreated: xp.treesCreated,
      mergesApproved: xp.mergesApproved,
      photosAdded: xp.photosAdded,
      biographiesWritten: xp.biographiesWritten,
      oralHistoriesWritten: xp.oralHistoriesWritten,
    },
    achievementsUnlocked: userAchs.length,
    recentAchievements,
  }, "Gamification profile retrieved");
}
