import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum MergeRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export enum MergeRequestType {
  /** Two person records that represent the same real person */
  DUPLICATE_PERSON = "duplicate_person",
  /** Two family trees that belong to the same extended family */
  FAMILY_TREES = "family_trees",
}

/**
 * MergeRequest allows users to propose that two person profiles or
 * two family trees are actually the same and should be combined.
 * An admin or the tree owner approves/rejects the merge.
 */
@Entity()
export class MergeRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: MergeRequestType })
  type: MergeRequestType;

  @Column({
    type: "enum",
    enum: MergeRequestStatus,
    default: MergeRequestStatus.PENDING,
  })
  status: MergeRequestStatus;

  // For DUPLICATE_PERSON merges
  @Column({ nullable: true })
  sourcePersonId: number;

  @Column({ nullable: true })
  targetPersonId: number;

  // For FAMILY_TREES merges
  @Column({ nullable: true })
  sourceTreeId: number;

  @Column({ nullable: true })
  targetTreeId: number;

  // The connecting person/ancestor (proof of shared lineage)
  @Column({ nullable: true })
  connectingPersonId: number;

  @Column({ type: "text", nullable: true })
  reason: string;

  @Column({ type: "text", nullable: true })
  evidenceNotes: string;

  @Column()
  requestedByUserId: number;

  @Column({ nullable: true })
  reviewedByUserId: number;

  @Column({ type: "text", nullable: true })
  reviewNotes: string;

  @Column({ nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
