import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum ProposedEditStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum ProposedEditKind {
  FIELD_EDIT = "field_edit",
  REMOVE_RELATIONSHIP = "remove_relationship",
}

@Entity()
export class ProposedEdit {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  personId: number;

  @Column()
  proposedByUserId: number;

  @Column({
    type: "enum",
    enum: ProposedEditKind,
    default: ProposedEditKind.FIELD_EDIT,
  })
  kind: ProposedEditKind;

  /** Set when kind is remove_relationship */
  @Column({ type: "int", nullable: true })
  relationshipId: number | null;

  /** Partial Person fields as JSON (empty object for remove_relationship) */
  @Column({ type: "text" })
  changes: string;

  @Column({ type: "text", nullable: true })
  note: string | null;

  @Column({
    type: "enum",
    enum: ProposedEditStatus,
    default: ProposedEditStatus.PENDING,
  })
  status: ProposedEditStatus;

  @Column({ type: "int", nullable: true })
  reviewedByUserId: number | null;

  @Column({ type: "text", nullable: true })
  reviewNotes: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
