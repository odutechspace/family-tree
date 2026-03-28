import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum TreeMemberRole {
  OWNER = "owner",
  EDITOR = "editor",
  VIEWER = "viewer",
}

/**
 * Junction table — links a Person to a FamilyTree and
 * also tracks which Users are collaborators on a tree.
 */
@Entity()
export class FamilyTreeMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  treeId: number;

  @Column()
  personId: number;

  // Optional: user collaborator access on this tree
  @Column({ nullable: true })
  userId: number;

  @Column({
    type: "enum",
    enum: TreeMemberRole,
    default: TreeMemberRole.VIEWER,
  })
  role: TreeMemberRole;

  @Column({ default: false })
  isRootPerson: boolean;

  @CreateDateColumn()
  joinedAt: Date;
}
