import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

export enum StewardRole {
  STEWARD = "steward",
  CONTRIBUTOR = "contributor",
}

@Entity()
@Unique(["personId", "userId"])
export class PersonSteward {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  personId: number;

  @Index()
  @Column()
  userId: number;

  @Column({ type: "enum", enum: StewardRole, default: StewardRole.STEWARD })
  role: StewardRole;

  @Column({ type: "int", nullable: true })
  createdByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
