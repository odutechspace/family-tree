import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class MergeAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sourcePersonId: number;

  @Column()
  targetPersonId: number;

  /** Full Person row before delete */
  @Column({ type: "text" })
  sourcePersonSnapshot: string;

  /** Relationships that touched the source person before re-point */
  @Column({ type: "text", nullable: true })
  sourceRelationshipsSnapshot: string | null;

  /** Counts of rows re-pointed per table */
  @Column({ type: "text", nullable: true })
  repointedCounts: string | null;

  @Column({ type: "int", nullable: true })
  mergeRequestId: number | null;

  @Column()
  performedByUserId: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "datetime", nullable: true })
  undoneAt: Date | null;
}
