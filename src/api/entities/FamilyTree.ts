import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum TreeVisibility {
  PUBLIC = "public",
  FAMILY_ONLY = "family_only",
  PRIVATE = "private",
}

@Entity()
export class FamilyTree {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  // The user who owns/created this tree
  @Column()
  ownerUserId: number;

  @Column({ type: "enum", enum: TreeVisibility, default: TreeVisibility.PRIVATE })
  visibility: TreeVisibility;

  // Cover image for the tree
  @Column({ nullable: true })
  coverImageUrl: string;

  // The root ancestor of this tree
  @Column({ nullable: true })
  rootPersonId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
