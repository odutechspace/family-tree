import { AppDataSource } from "@/src/config/db";
import { UserXP, calcLevel, LEVEL_THRESHOLDS } from "@/src/api/entities/UserXP";
import { XPEvent, XPEventType } from "@/src/api/entities/XPEvent";
import { Achievement } from "@/src/api/entities/Achievement";
import { UserAchievement } from "@/src/api/entities/UserAchievement";
import { Quest, QuestType } from "@/src/api/entities/Quest";
import { UserQuest } from "@/src/api/entities/UserQuest";
import { ACHIEVEMENT_SEEDS } from "./achievements.seed";
import { QUEST_SEEDS } from "./quests.seed";

// XP values per action
export const XP_VALUES: Record<XPEventType, number> = {
  [XPEventType.ADD_PERSON]: 20,
  [XPEventType.ADD_RELATIONSHIP]: 15,
  [XPEventType.ADD_LIFE_EVENT]: 15,
  [XPEventType.ADD_PHOTO]: 10,
  [XPEventType.WRITE_BIOGRAPHY]: 30,
  [XPEventType.WRITE_ORAL_HISTORY]: 40,
  [XPEventType.CREATE_TREE]: 25,
  [XPEventType.ADD_PERSON_TO_TREE]: 5,
  [XPEventType.CREATE_CLAN]: 30,
  [XPEventType.SUBMIT_MERGE_REQUEST]: 50,
  [XPEventType.MERGE_APPROVED]: 150,
  [XPEventType.DAILY_STREAK]: 20,
  [XPEventType.WEEKLY_STREAK]: 100,
  [XPEventType.FIRST_LOGIN]: 10,
  [XPEventType.INVITE_MEMBER]: 80,
  [XPEventType.ACHIEVEMENT_UNLOCKED]: 0,
  [XPEventType.QUEST_COMPLETED]: 0,
  [XPEventType.PROFILE_COMPLETE]: 50,
};

export interface GamificationResult {
  xpAwarded: number;
  totalXP: number;
  level: number;
  leveledUp: boolean;
  newLevel?: number;
  newLevelName?: string;
  newAchievements: Array<{ key: string; name: string; icon: string; xpReward: number }>;
  newQuestsCompleted: Array<{ key: string; title: string; icon: string; xpReward: number }>;
  streakBonus: number;
}

let seedDone = false;

async function ensureSeeded() {
  if (seedDone) return;
  await seedAchievements();
  await seedQuests();
  seedDone = true;
}

async function seedAchievements() {
  const repo = AppDataSource.getRepository(Achievement);
  for (const seed of ACHIEVEMENT_SEEDS) {
    const existing = await repo.findOne({ where: { key: seed.key } });
    if (!existing) {
      await repo.save(repo.create(seed as any));
    }
  }
}

async function seedQuests() {
  const repo = AppDataSource.getRepository(Quest);
  for (const seed of QUEST_SEEDS) {
    const existing = await repo.findOne({ where: { key: seed.key } });
    if (!existing) {
      await repo.save(repo.create(seed as any));
    }
  }
}

async function getOrCreateUserXP(userId: number): Promise<UserXP> {
  const repo = AppDataSource.getRepository(UserXP);
  let xp = await repo.findOne({ where: { userId } });
  if (!xp) {
    xp = repo.create({ userId, totalXP: 0, level: 1 });
    xp = await repo.save(xp) as unknown as UserXP;
  }
  return xp;
}

function updateStreak(xp: UserXP): number {
  const today = new Date().toISOString().split("T")[0];
  const last = xp.lastActivityDate
    ? new Date(xp.lastActivityDate).toISOString().split("T")[0]
    : null;

  if (last === today) return 0; // already active today, no bonus

  let streakBonus = 0;
  if (last) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = yesterday.toISOString().split("T")[0];

    if (last === yDate) {
      xp.currentStreak += 1;
    } else {
      xp.currentStreak = 1; // streak broken
    }
  } else {
    xp.currentStreak = 1;
  }

  if (xp.currentStreak > xp.longestStreak) {
    xp.longestStreak = xp.currentStreak;
  }

  xp.lastActivityDate = new Date();

  // Streak bonus XP: 7-day multiples give extra
  if (xp.currentStreak % 7 === 0) streakBonus = XP_VALUES[XPEventType.WEEKLY_STREAK];
  else if (xp.currentStreak > 1) streakBonus = XP_VALUES[XPEventType.DAILY_STREAK];

  return streakBonus;
}

async function checkAchievements(userId: number, xp: UserXP): Promise<Array<{ key: string; name: string; icon: string; xpReward: number }>> {
  const achievementRepo = AppDataSource.getRepository(Achievement);
  const userAchRepo = AppDataSource.getRepository(UserAchievement);

  const allAchievements = await achievementRepo.find({ where: { isActive: true } });
  const unlocked = await userAchRepo.find({ where: { userId } });
  const unlockedKeys = new Set(unlocked.map(u => u.achievementKey));

  const newlyUnlocked: Array<{ key: string; name: string; icon: string; xpReward: number }> = [];

  for (const ach of allAchievements) {
    if (unlockedKeys.has(ach.key)) continue;
    if (!ach.progressField || !ach.progressTarget) continue;

    const current = (xp as any)[ach.progressField] as number;
    if (current >= ach.progressTarget) {
      await userAchRepo.save(userAchRepo.create({
        userId,
        achievementId: ach.id,
        achievementKey: ach.key,
      }));
      newlyUnlocked.push({ key: ach.key, name: ach.name, icon: ach.icon, xpReward: ach.xpReward });
    }
  }

  return newlyUnlocked;
}

async function checkQuestProgress(userId: number, eventType: XPEventType): Promise<Array<{ key: string; title: string; icon: string; xpReward: number }>> {
  const questRepo = AppDataSource.getRepository(Quest);
  const userQuestRepo = AppDataSource.getRepository(UserQuest);

  // Get quests that track this event type
  const matchingQuests = await questRepo.find({ where: { trackedEvent: eventType, isActive: true } });
  const completed: Array<{ key: string; title: string; icon: string; xpReward: number }> = [];

  const today = new Date().toISOString().split("T")[0];
  const weekStart = getWeekStart();

  for (const quest of matchingQuests) {
    // For onboarding/discovery quests, check if already fully completed (no window)
    if (quest.type === QuestType.ONBOARDING || quest.type === QuestType.DISCOVERY) {
      const existing = await userQuestRepo.findOne({ where: { userId, questKey: quest.key } });
      if (existing?.isCompleted) continue;

      const uq = existing || userQuestRepo.create({ userId, questId: quest.id, questKey: quest.key, progress: 0 });
      uq.progress += 1;
      if (uq.progress >= quest.targetCount) {
        uq.isCompleted = true;
        uq.completedAt = new Date();
        completed.push({ key: quest.key, title: quest.title, icon: quest.icon, xpReward: quest.xpReward });
      }
      await userQuestRepo.save(uq);
    }

    // Daily quests
    if (quest.type === QuestType.DAILY) {
      const existing = await userQuestRepo.findOne({ where: { userId, questKey: quest.key, windowDate: new Date(today) as any } });
      if (existing?.isCompleted) continue;

      const uq = existing || userQuestRepo.create({ userId, questId: quest.id, questKey: quest.key, progress: 0, windowDate: new Date(today) as any });
      uq.progress += 1;
      if (uq.progress >= quest.targetCount) {
        uq.isCompleted = true;
        uq.completedAt = new Date();
        completed.push({ key: quest.key, title: quest.title, icon: quest.icon, xpReward: quest.xpReward });
      }
      await userQuestRepo.save(uq);
    }

    // Weekly quests
    if (quest.type === QuestType.WEEKLY) {
      const existing = await userQuestRepo.findOne({ where: { userId, questKey: quest.key, windowDate: new Date(weekStart) as any } });
      if (existing?.isCompleted) continue;

      const uq = existing || userQuestRepo.create({ userId, questId: quest.id, questKey: quest.key, progress: 0, windowDate: new Date(weekStart) as any });
      uq.progress += 1;
      if (uq.progress >= quest.targetCount) {
        uq.isCompleted = true;
        uq.completedAt = new Date();
        completed.push({ key: quest.key, title: quest.title, icon: quest.icon, xpReward: quest.xpReward });
      }
      await userQuestRepo.save(uq);
    }
  }

  return completed;
}

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

/**
 * Central entry point called by every API route that earns XP.
 */
export async function awardXP(
  userId: number,
  eventType: XPEventType,
  referenceId?: number,
  description?: string,
  overrides?: Partial<Record<keyof UserXP, number>>,
): Promise<GamificationResult> {
  await ensureSeeded();

  const xpRepo = AppDataSource.getRepository(UserXP);
  const eventRepo = AppDataSource.getRepository(XPEvent);

  const xp = await getOrCreateUserXP(userId);
  const previousLevel = xp.level;

  // Streak bonus
  const streakBonus = updateStreak(xp);

  // Base XP
  const baseXP = XP_VALUES[eventType] ?? 0;
  const totalAwarded = baseXP + streakBonus;

  xp.totalXP += totalAwarded;

  // Update counters for achievement checks
  const counterMap: Partial<Record<XPEventType, keyof UserXP>> = {
    [XPEventType.ADD_PERSON]: "personsAdded",
    [XPEventType.ADD_RELATIONSHIP]: "relationshipsAdded",
    [XPEventType.ADD_LIFE_EVENT]: "eventsAdded",
    [XPEventType.ADD_PHOTO]: "photosAdded",
    [XPEventType.WRITE_BIOGRAPHY]: "biographiesWritten",
    [XPEventType.WRITE_ORAL_HISTORY]: "oralHistoriesWritten",
    [XPEventType.CREATE_CLAN]: "clansCreated",
    [XPEventType.CREATE_TREE]: "treesCreated",
    [XPEventType.SUBMIT_MERGE_REQUEST]: "mergeRequestsSubmitted",
    [XPEventType.MERGE_APPROVED]: "mergesApproved",
  };

  const field = counterMap[eventType];
  if (field) (xp as any)[field] = ((xp as any)[field] as number) + 1;

  // Apply any caller-provided overrides (e.g. level field for level-based achievements)
  if (overrides) {
    Object.assign(xp, overrides);
  }

  // Recalculate level
  xp.level = calcLevel(xp.totalXP);
  const leveledUp = xp.level > previousLevel;

  await xpRepo.save(xp);

  // Log the XP event
  await eventRepo.save(eventRepo.create({
    userId,
    type: eventType,
    xpAwarded: totalAwarded,
    referenceId,
    description,
  }));

  // Check achievements
  const newAchievements = await checkAchievements(userId, xp);

  // Award bonus XP for achievements
  let achievementXP = 0;
  for (const ach of newAchievements) {
    achievementXP += ach.xpReward;
    await eventRepo.save(eventRepo.create({
      userId,
      type: XPEventType.ACHIEVEMENT_UNLOCKED,
      xpAwarded: ach.xpReward,
      description: `Achievement: ${ach.name}`,
    }));
  }
  if (achievementXP > 0) {
    xp.totalXP += achievementXP;
    xp.level = calcLevel(xp.totalXP);
    await xpRepo.save(xp);
  }

  // Check quest progress
  const newQuestsCompleted = await checkQuestProgress(userId, eventType);

  // Award quest XP
  let questXP = 0;
  for (const q of newQuestsCompleted) {
    questXP += q.xpReward;
    await eventRepo.save(eventRepo.create({
      userId,
      type: XPEventType.QUEST_COMPLETED,
      xpAwarded: q.xpReward,
      description: `Quest: ${q.title}`,
    }));
  }
  if (questXP > 0) {
    xp.totalXP += questXP;
    xp.level = calcLevel(xp.totalXP);
    await xpRepo.save(xp);
  }

  // Resolve level name for level-up notification
  const LEVEL_NAMES = ["Seedling", "Root Finder", "Branch Builder", "Tree Keeper", "Elder Scribe", "Clan Historian", "Ancestral Voice", "Griot Master"];

  return {
    xpAwarded: totalAwarded + achievementXP + questXP,
    totalXP: xp.totalXP,
    level: xp.level,
    leveledUp: xp.level > previousLevel,
    newLevel: xp.level > previousLevel ? xp.level : undefined,
    newLevelName: xp.level > previousLevel ? LEVEL_NAMES[xp.level - 1] : undefined,
    newAchievements,
    newQuestsCompleted,
    streakBonus,
  };
}
