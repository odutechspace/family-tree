import "dotenv/config";

import mysql from "mysql2/promise";

import { ensureGraphSchema } from "./ensure-graph-schema";

/**
 * Seed PersonSteward rows from Person.linkedUserId and Person.createdByUserId.
 * Idempotent — safe to re-run. Uses mysql2 (not TypeORM) so tsx does not need
 * emitDecoratorMetadata.
 */
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

    const [persons] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT id, linkedUserId, createdByUserId FROM person
       WHERE linkedUserId IS NOT NULL OR createdByUserId IS NOT NULL`,
    );

    let created = 0;
    let skipped = 0;

    for (const p of persons) {
      const userIds = new Set<number>();
      if (p.linkedUserId) userIds.add(Number(p.linkedUserId));
      if (p.createdByUserId) userIds.add(Number(p.createdByUserId));

      for (const userId of userIds) {
        const [existing] = await conn.query<mysql.RowDataPacket[]>(
          `SELECT id FROM person_steward WHERE personId = ? AND userId = ? LIMIT 1`,
          [p.id, userId],
        );
        if (existing.length > 0) {
          skipped += 1;
          continue;
        }
        const createdBy = p.createdByUserId
          ? Number(p.createdByUserId)
          : userId;
        await conn.query(
          `INSERT INTO person_steward (personId, userId, role, createdByUserId, createdAt)
           VALUES (?, ?, 'steward', ?, NOW(6))`,
          [p.id, userId, createdBy],
        );
        created += 1;
      }
    }

    console.log(
      `[backfill-stewards] persons=${persons.length} created=${created} skipped=${skipped}`,
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[backfill-stewards] failed", err);
  process.exit(1);
});
