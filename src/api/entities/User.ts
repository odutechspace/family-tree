import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Exclude } from "class-transformer";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: "varchar", length: 2048, nullable: true })
  profilePhotoUrl: string | null;

  @Column({ type: "int", nullable: true })
  linkedPersonId: number | null;

  /**
   * HMAC-SHA256 of the user's E.164 phone number.
   * Matched against Person.phoneHash to auto-link when a user registers
   * or updates their phone, or when a person record is given a phone number.
   */
  @Column({ type: "varchar", length: 64, nullable: true })
  phoneHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
