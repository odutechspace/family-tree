import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Clan / lineage group — a core concept in many African societies.
 * A clan tracks shared ancestry, totems, and cultural practices.
 */
@Entity()
export class Clan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // Alternate or praise name
  @Column({ nullable: true })
  alternateName: string;

  // Totem animal/plant/object
  @Column({ nullable: true })
  totem: string;

  // Clan praise poem / "izibongo" / "oriki"
  @Column({ type: "text", nullable: true })
  praisePoem: string;

  @Column({ nullable: true })
  originRegion: string;

  @Column({ nullable: true })
  originCountry: string;

  @Column({ nullable: true })
  ethnicGroup: string;

  @Column({ type: "text", nullable: true })
  history: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  createdByUserId: number;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
