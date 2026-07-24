import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum AchievementCategory {
  BUILDER = "builder", // Adding people & relationships
  HISTORIAN = "historian", // Stories, oral history, biographies
  CONNECTOR = "connector", // Merging trees & linking clans
  EXPLORER = "explorer", // Discovering new branches
  SOCIAL = "social", // Inviting family, sharing
  STREAK = "streak", // Consistency
  MILESTONE = "milestone", // Big numerical milestones
  SPECIAL = "special", // Cultural, seasonal
}

export enum AchievementRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
  EPIC = "epic",
  LEGENDARY = "legendary",
}

@Entity()
export class Achievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column()
  name: string;

  @Column({ type: "text" })
  description: string;

  @Column()
  icon: string;

  @Column({ type: "enum", enum: AchievementCategory })
  category: AchievementCategory;

  @Column({
    type: "enum",
    enum: AchievementRarity,
    default: AchievementRarity.COMMON,
  })
  rarity: AchievementRarity;

  @Column({ default: 50 })
  xpReward: number;

  // For progress-based achievements (e.g., add 10 people)
  @Column({ nullable: true })
  progressTarget: number;

  // The XP counter field on UserXP to track against
  @Column({ nullable: true })
  progressField: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
