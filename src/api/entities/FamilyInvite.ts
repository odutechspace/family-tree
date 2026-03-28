import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum InviteStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  REVOKED = "revoked",
}

@Entity()
export class FamilyInvite {
  @PrimaryGeneratedColumn()
  id: number;

  /** Unique one-time token embedded in invite link */
  @Column({ unique: true })
  token: string;

  /** Who was invited */
  @Column()
  email: string;

  /** Which tree they're being invited to */
  @Column()
  treeId: number;

  /**
   * Optional: the Person record in the tree that represents the invitee.
   * When they accept, their user account gets linked to this person.
   */
  @Column({ nullable: true })
  personId: number;

  /** A friendly note shown on the accept page (e.g. "Your cousin Amara invited you") */
  @Column({ type: "text", nullable: true })
  message: string;

  /** Who sent the invite */
  @Column()
  invitedByUserId: number;

  @Column({
    type: "enum",
    enum: InviteStatus,
    default: InviteStatus.PENDING,
  })
  status: InviteStatus;

  /** When the invite link expires */
  @Column({ type: "datetime" })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
