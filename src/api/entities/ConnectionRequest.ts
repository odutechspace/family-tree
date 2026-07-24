import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum ConnectionRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
}

@Entity()
export class ConnectionRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fromUserId: number;

  /** Requester's linked person (optional) */
  @Column({ type: "int", nullable: true })
  fromPersonId: number | null;

  /** The person they claim relation to (or same-person claim) */
  @Column()
  targetPersonId: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  proposedRelationshipType: string | null;

  @Column({ type: "text", nullable: true })
  message: string | null;

  @Column({
    type: "enum",
    enum: ConnectionRequestStatus,
    default: ConnectionRequestStatus.PENDING,
  })
  status: ConnectionRequestStatus;

  @Column({ type: "int", nullable: true })
  respondedByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
