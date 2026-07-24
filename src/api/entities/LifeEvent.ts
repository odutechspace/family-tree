import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * African-relevant life event categories:
 * - BIRTH, DEATH: standard lifecycle
 * - NAMING_CEREMONY: many cultures name a baby 7-40 days after birth
 * - INITIATION: rite of passage (circumcision, female initiation)
 * - LOBOLA / BRIDEWEALTH: bride-price negotiations and handover
 * - TRADITIONAL_MARRIAGE, CHURCH_MARRIAGE, CIVIL_MARRIAGE
 * - GRADUATION, EDUCATION
 * - MIGRATION: moved to another country/region (diaspora tracking)
 * - ACHIEVEMENT: notable accomplishment
 * - MEMORIAL: annual or periodic remembrance
 * - BURIAL / FUNERAL: place and date of burial
 * - CUSTOM: user-defined category
 */
export enum LifeEventType {
  BIRTH = "birth",
  DEATH = "death",
  NAMING_CEREMONY = "naming_ceremony",
  INITIATION = "initiation",
  LOBOLA = "lobola",
  BRIDEWEALTH = "bridewealth",
  TRADITIONAL_MARRIAGE = "traditional_marriage",
  CHURCH_MARRIAGE = "church_marriage",
  CIVIL_MARRIAGE = "civil_marriage",
  GRADUATION = "graduation",
  EDUCATION = "education",
  MIGRATION = "migration",
  ACHIEVEMENT = "achievement",
  MEMORIAL = "memorial",
  BURIAL = "burial",
  CUSTOM = "custom",
}

@Entity()
export class LifeEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  personId: number;

  @Column({ type: "enum", enum: LifeEventType })
  type: LifeEventType;

  @Column({ nullable: true })
  customType: string;

  @Column({ nullable: true })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "date", nullable: true })
  eventDate: Date;

  @Column({ nullable: true })
  eventDateApprox: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  mediaUrl: string;

  @Column({ nullable: true })
  createdByUserId: number;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
