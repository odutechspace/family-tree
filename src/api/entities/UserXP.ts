import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Tracks a user's total XP, current level, and streak info.
 * One row per user — upserted each time XP is awarded.
 *
 * Level thresholds (XP needed to reach level N):
 *   Level 1:    0 XP   — Seedling
 *   Level 2:  100 XP   — Root Finder
 *   Level 3:  300 XP   — Branch Builder
 *   Level 4:  700 XP   — Tree Keeper
 *   Level 5: 1500 XP   — Elder Scribe
 *   Level 6: 3000 XP   — Clan Historian
 *   Level 7: 6000 XP   — Ancestral Voice
 *   Level 8:12000 XP   — Griot Master
 */
export const LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3000, 6000, 12000];
export const LEVEL_NAMES = [
  "Seedling",
  "Root Finder",
  "Branch Builder",
  "Tree Keeper",
  "Elder Scribe",
  "Clan Historian",
  "Ancestral Voice",
  "Griot Master",
];

export function calcLevel(xp: number): number {
  let level = 1;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  return Math.min(level, LEVEL_THRESHOLDS.length);
}

export function xpForNextLevel(level: number): number {
  const next = level; // index is level-1+1 = level

  return (
    LEVEL_THRESHOLDS[next] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  );
}

@Entity()
export class UserXP {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @Column({ default: 0 })
  totalXP: number;

  @Column({ default: 1 })
  level: number;

  // Streak tracking
  @Column({ default: 0 })
  currentStreak: number;

  @Column({ default: 0 })
  longestStreak: number;

  @Column({ type: "date", nullable: true })
  lastActivityDate: Date;

  // Counts for milestone checks
  @Column({ default: 0 })
  personsAdded: number;

  @Column({ default: 0 })
  relationshipsAdded: number;

  @Column({ default: 0 })
  eventsAdded: number;

  @Column({ default: 0 })
  clansCreated: number;

  @Column({ default: 0 })
  treesCreated: number;

  @Column({ default: 0 })
  mergeRequestsSubmitted: number;

  @Column({ default: 0 })
  mergesApproved: number;

  @Column({ default: 0 })
  photosAdded: number;

  @Column({ default: 0 })
  biographiesWritten: number;

  @Column({ default: 0 })
  oralHistoriesWritten: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
