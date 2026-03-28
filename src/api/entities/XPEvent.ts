import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Immutable log of every XP award. Used for the activity feed
 * and for ensuring idempotency (no double-awarding the same action).
 */
export enum XPEventType {
  ADD_PERSON = "add_person",
  ADD_RELATIONSHIP = "add_relationship",
  ADD_LIFE_EVENT = "add_life_event",
  ADD_PHOTO = "add_photo",
  WRITE_BIOGRAPHY = "write_biography",
  WRITE_ORAL_HISTORY = "write_oral_history",
  CREATE_TREE = "create_tree",
  ADD_PERSON_TO_TREE = "add_person_to_tree",
  CREATE_CLAN = "create_clan",
  SUBMIT_MERGE_REQUEST = "submit_merge_request",
  MERGE_APPROVED = "merge_approved",
  DAILY_STREAK = "daily_streak",
  WEEKLY_STREAK = "weekly_streak",
  FIRST_LOGIN = "first_login",
  INVITE_MEMBER = "invite_member",
  ACHIEVEMENT_UNLOCKED = "achievement_unlocked",
  QUEST_COMPLETED = "quest_completed",
  PROFILE_COMPLETE = "profile_complete",
}

@Entity()
export class XPEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: "enum", enum: XPEventType })
  type: XPEventType;

  @Column({ default: 0 })
  xpAwarded: number;

  @Column({ nullable: true })
  referenceId: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
