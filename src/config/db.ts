import "reflect-metadata";
import { DataSource } from "typeorm";

// import { User } from "@/src/api/entities/User";
const User = require("@/src/api/entities/User").User;

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "chama_smart",
  entities: [User], // Add all your entity files here
  // entities: [__dirname + "/../api/entities/*.js"],
  // synchronize: true, // Auto-create tables (disable in production)
  synchronize: process.env.NODE_ENV !== "production", // Auto-create tables (disable in production)
  logging: ["query", "error", "schema"],
});

let isInitialized = false;

export const initializeDataSource = async () => {
  if (!isInitialized) {
    try {
      await AppDataSource.initialize();
      isInitialized = true;
      console.log("Entities registered:", AppDataSource.options.entities);
      console.log("Database connection initialized.");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error; // Rethrow the error for proper error handling
    }
  }
};
