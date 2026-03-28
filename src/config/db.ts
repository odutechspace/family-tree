import "reflect-metadata";
import { DataSource } from "typeorm";

const User = require("@/src/api/entities/User").User;
const Person = require("@/src/api/entities/Person").Person;
const Relationship = require("@/src/api/entities/Relationship").Relationship;
const FamilyTree = require("@/src/api/entities/FamilyTree").FamilyTree;
const FamilyTreeMember =
  require("@/src/api/entities/FamilyTreeMember").FamilyTreeMember;
const MergeRequest = require("@/src/api/entities/MergeRequest").MergeRequest;
const LifeEvent = require("@/src/api/entities/LifeEvent").LifeEvent;
const Clan = require("@/src/api/entities/Clan").Clan;
const UserXP = require("@/src/api/entities/UserXP").UserXP;
const XPEvent = require("@/src/api/entities/XPEvent").XPEvent;
const Achievement = require("@/src/api/entities/Achievement").Achievement;
const UserAchievement =
  require("@/src/api/entities/UserAchievement").UserAchievement;
const Quest = require("@/src/api/entities/Quest").Quest;
const UserQuest = require("@/src/api/entities/UserQuest").UserQuest;
const FamilyInvite = require("@/src/api/entities/FamilyInvite").FamilyInvite;

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "my_ukoo",
  entities: [
    User,
    Person,
    Relationship,
    FamilyTree,
    FamilyTreeMember,
    MergeRequest,
    LifeEvent,
    Clan,
    UserXP,
    XPEvent,
    Achievement,
    UserAchievement,
    Quest,
    UserQuest,
    FamilyInvite,
  ],
  synchronize: process.env.NODE_ENV !== "production",
  logging: ["error", "schema"],
});

let isInitialized = false;

export const initializeDataSource = async () => {
  if (!isInitialized) {
    try {
      await AppDataSource.initialize();
      isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }
};
