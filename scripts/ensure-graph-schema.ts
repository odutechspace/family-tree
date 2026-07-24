import "dotenv/config";

import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";

/**
 * Idempotent DDL for Shared Graph Growth entities/columns.
 * TypeORM synchronize normally creates these on first Next.js request;
 * this script lets CLI tools (e.g. backfill:stewards) run without that.
 */
export async function ensureGraphSchema(conn: Connection): Promise<void> {
  await addColumnIfMissing(
    conn,
    "person",
    "visibility",
    `ENUM('public','connections','stewards') NOT NULL DEFAULT 'connections'`,
  );

  await addColumnIfMissing(
    conn,
    "user_xp",
    "claimsMade",
    `INT NOT NULL DEFAULT 0`,
  );
  await addColumnIfMissing(
    conn,
    "user_xp",
    "connectionsMade",
    `INT NOT NULL DEFAULT 0`,
  );

  await conn.query(`
    CREATE TABLE IF NOT EXISTS person_steward (
      id INT NOT NULL AUTO_INCREMENT,
      personId INT NOT NULL,
      userId INT NOT NULL,
      role ENUM('steward','contributor') NOT NULL DEFAULT 'steward',
      createdByUserId INT NULL,
      createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      UNIQUE KEY UQ_person_steward_person_user (personId, userId),
      KEY IDX_person_steward_personId (personId),
      KEY IDX_person_steward_userId (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS merge_audit (
      id INT NOT NULL AUTO_INCREMENT,
      sourcePersonId INT NOT NULL,
      targetPersonId INT NOT NULL,
      sourcePersonSnapshot TEXT NOT NULL,
      sourceRelationshipsSnapshot TEXT NULL,
      repointedCounts TEXT NULL,
      mergeRequestId INT NULL,
      performedByUserId INT NOT NULL,
      createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      undoneAt DATETIME NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS proposed_edit (
      id INT NOT NULL AUTO_INCREMENT,
      personId INT NOT NULL,
      proposedByUserId INT NOT NULL,
      kind ENUM('field_edit','remove_relationship') NOT NULL DEFAULT 'field_edit',
      relationshipId INT NULL,
      changes TEXT NOT NULL,
      note TEXT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      reviewedByUserId INT NULL,
      reviewNotes TEXT NULL,
      reviewedAt DATETIME NULL,
      createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      KEY IDX_proposed_edit_personId (personId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await addColumnIfMissing(
    conn,
    "proposed_edit",
    "kind",
    `ENUM('field_edit','remove_relationship') NOT NULL DEFAULT 'field_edit'`,
  );
  await addColumnIfMissing(
    conn,
    "proposed_edit",
    "relationshipId",
    `INT NULL`,
  );

  await conn.query(`
    CREATE TABLE IF NOT EXISTS connection_request (
      id INT NOT NULL AUTO_INCREMENT,
      fromUserId INT NOT NULL,
      fromPersonId INT NULL,
      targetPersonId INT NOT NULL,
      proposedRelationshipType VARCHAR(255) NULL,
      message TEXT NULL,
      status ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
      respondedByUserId INT NULL,
      createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Extend XP event enum with graph-growth types (MySQL requires full ENUM rewrite).
  await conn.query(`
    ALTER TABLE xp_event
    MODIFY COLUMN type ENUM(
      'add_person','add_relationship','add_life_event','add_photo',
      'write_biography','write_oral_history','create_tree','add_person_to_tree',
      'create_clan','submit_merge_request','merge_approved','daily_streak',
      'weekly_streak','first_login','invite_member','achievement_unlocked',
      'quest_completed','profile_complete',
      'claim_person','connect_relative','confirm_merge'
    ) NOT NULL
  `);
}

async function addColumnIfMissing(
  conn: Connection,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SHOW COLUMNS FROM \`${table}\` LIKE ?`,
    [column],
  );
  if (rows.length > 0) return;
  await conn.query(
    `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
  );
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "my_ukoo",
  });

  try {
    await ensureGraphSchema(conn);
    console.log("[ensure-graph-schema] ok");
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[ensure-graph-schema] failed", err);
    process.exit(1);
  });
}
