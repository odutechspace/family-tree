import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Quest, QuestType } from "@/src/api/entities/Quest";
import { UserQuest } from "@/src/api/entities/UserQuest";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";
import { QUEST_SEEDS } from "@/src/api/services/gamification/quests.seed";

function getWeekStart(): string {
  const d = new Date();

  d.setDate(d.getDate() - d.getDay());

  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const auth = await getAuthUser(req);

  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const questRepo = AppDataSource.getRepository(Quest);
  const userQuestRepo = AppDataSource.getRepository(UserQuest);

  // Ensure quests seeded
  for (const seed of QUEST_SEEDS) {
    const existing = await questRepo.findOne({ where: { key: seed.key } });

    if (!existing) await questRepo.save(questRepo.create(seed as any));
  }

  const allQuests = await questRepo.find({ where: { isActive: true } });

  const today = new Date().toISOString().split("T")[0];
  const weekStart = getWeekStart();

  const questsWithProgress = await Promise.all(
    allQuests.map(async (q) => {
      let userQuest: UserQuest | null = null;

      if (q.type === QuestType.DAILY) {
        userQuest = await userQuestRepo.findOne({
          where: {
            userId: auth.id,
            questKey: q.key,
            windowDate: new Date(today) as any,
          },
        });
      } else if (q.type === QuestType.WEEKLY) {
        userQuest = await userQuestRepo.findOne({
          where: {
            userId: auth.id,
            questKey: q.key,
            windowDate: new Date(weekStart) as any,
          },
        });
      } else {
        userQuest = await userQuestRepo.findOne({
          where: { userId: auth.id, questKey: q.key },
        });
      }

      return {
        id: q.id,
        key: q.key,
        title: q.title,
        description: q.description,
        icon: q.icon,
        type: q.type,
        targetCount: q.targetCount,
        xpReward: q.xpReward,
        progress: userQuest?.progress ?? 0,
        isCompleted: userQuest?.isCompleted ?? false,
        completedAt: userQuest?.completedAt ?? null,
      };
    }),
  );

  // Group by type
  const grouped = {
    onboarding: questsWithProgress.filter(
      (q) => q.type === QuestType.ONBOARDING,
    ),
    daily: questsWithProgress.filter((q) => q.type === QuestType.DAILY),
    weekly: questsWithProgress.filter((q) => q.type === QuestType.WEEKLY),
    discovery: questsWithProgress.filter((q) => q.type === QuestType.DISCOVERY),
  };

  return apiSuccess({ quests: grouped }, "Quests retrieved");
}
