import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Relationship types covering African family structures:
 * - PARENT_CHILD: biological parent → child
 * - SPOUSE: marriage or union (supports polygamy via multiple SPOUSE rows)
 * - PARTNER: non-married union / traditional union
 * - SIBLING: full sibling
 * - HALF_SIBLING: shares one parent
 * - STEP_PARENT: step-parent → step-child
 * - ADOPTED: adoptive parent → child
 * - GUARDIAN: guardian of a person
 * - CO_WIFE: second/subsequent wife to the same husband (co-wife relationship)
 * - LEVIRATE: levirate marriage (widow married to late husband's brother)
 */
export enum RelationshipType {
  PARENT_CHILD = "parent_child",
  SPOUSE = "spouse",
  PARTNER = "partner",
  SIBLING = "sibling",
  HALF_SIBLING = "half_sibling",
  STEP_PARENT = "step_parent",
  ADOPTED = "adopted",
  GUARDIAN = "guardian",
  CO_WIFE = "co_wife",
  LEVIRATE = "levirate",
}

export enum RelationshipStatus {
  ACTIVE = "active",
  DIVORCED = "divorced",
  WIDOWED = "widowed",
  SEPARATED = "separated",
  DECEASED = "deceased",
  ENDED = "ended",
}

@Entity()
export class Relationship {
  @PrimaryGeneratedColumn()
  id: number;

  // For PARENT_CHILD: personAId = parent, personBId = child
  // For SPOUSE / PARTNER: personAId and personBId are the couple
  // For SIBLING: both are siblings
  @Column()
  personAId: number;

  @Column()
  personBId: number;

  @Column({ type: "enum", enum: RelationshipType })
  type: RelationshipType;

  @Column({ type: "enum", enum: RelationshipStatus, default: RelationshipStatus.ACTIVE })
  status: RelationshipStatus;

  // Marriage-specific fields
  @Column({ type: "date", nullable: true })
  startDate: Date;

  @Column({ type: "date", nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  marriagePlace: string;

  // Traditional ceremony type (e.g., "Lobola", "Bridewealth", "Church", "Civil")
  @Column({ nullable: true })
  ceremonyType: string;

  // Union order — e.g., 1=first wife, 2=second wife for polygamous marriages
  @Column({ default: 1 })
  unionOrder: number;

  @Column({ type: "text", nullable: true })
  notes: string;

  // Who added this relationship
  @Column({ nullable: true })
  createdByUserId: number;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
