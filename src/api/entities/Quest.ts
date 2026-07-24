import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum QuestType {
  DAILY = "daily",
  WEEKLY = "weekly",
  ONBOARDING = "onboarding",
  DISCOVERY = "discovery",
}

/**
 * Quest definitions seeded into the DB.
 * UserQuest tracks per-user progress.
 */
@Entity()
export class Quest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column()
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column()
  icon: string;

  @Column({ type: "enum", enum: QuestType })
  type: QuestType;

  // XP event type that counts toward this quest
  @Column()
  trackedEvent: string;

  // How many of that event needed
  @Column({ default: 1 })
  targetCount: number;

  @Column({ default: 100 })
  xpReward: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
