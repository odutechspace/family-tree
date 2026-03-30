import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
  UNKNOWN = "unknown",
}

export enum AliveStatus {
  ALIVE = "alive",
  DECEASED = "deceased",
  UNKNOWN = "unknown",
}

@Entity()
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  maidenName: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ type: "enum", enum: Gender, default: Gender.UNKNOWN })
  gender: Gender;

  @Column({ type: "date", nullable: true })
  birthDate: Date;

  @Column({ nullable: true })
  birthPlace: string;

  @Column({ type: "enum", enum: AliveStatus, default: AliveStatus.UNKNOWN })
  aliveStatus: AliveStatus;

  @Column({ type: "date", nullable: true })
  deathDate: Date;

  @Column({ nullable: true })
  deathPlace: string;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ type: "text", nullable: true })
  biography: string;

  @Column({ type: "text", nullable: true })
  oralHistory: string;

  // Clan / ethnic identity fields
  @Column({ nullable: true })
  clanId: number;

  @Column({ nullable: true })
  tribeEthnicity: string;

  @Column({ nullable: true })
  totem: string;

  @Column({ nullable: true })
  originVillage: string;

  @Column({ nullable: true })
  originCountry: string;

  /**
   * Short shareable platform code e.g. "UKOO-7K3M2".
   * Auto-generated on creation. Anyone can share this code with a relative
   * building their own tree to say "this node = this person."
   */
  @Column({ nullable: true, unique: true })
  personCode: string;

  /**
   * HMAC-SHA256 hash of the person's E.164 phone number (never stored in plain).
   * Used to auto-link a Person record to a User account when the user's
   * phoneHash matches on registration or profile update.
   */
  @Column({ type: "varchar", length: 64, nullable: true })
  phoneHash: string | null;

  // The user account that manages this person (optional — guests may have no account)
  @Column({ nullable: true })
  linkedUserId: number;

  // Who created this person entry
  @Column({ nullable: true })
  createdByUserId: number;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isPrivate: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
