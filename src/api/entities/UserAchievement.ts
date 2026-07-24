import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class UserAchievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  achievementId: number;

  // The achievement key (denormalized for fast lookup without join)
  @Column()
  achievementKey: string;

  @CreateDateColumn()
  unlockedAt: Date;
}
