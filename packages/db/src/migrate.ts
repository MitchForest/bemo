import { promises as fs } from "node:fs";
import * as path from "node:path";
import { config } from "dotenv";
import { FileMigrationProvider, Migrator } from "kysely";

// Load environment variables
config({ path: path.join(__dirname, "../../../.env") });

import { getDb } from "./index";

async function migrateToLatest() {
  const db = getDb();
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, "../migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  for (const it of results || []) {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  }

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

async function migrateDown() {
  const db = getDb();
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, "../migrations"),
    }),
  });

  const { error, results } = await migrator.migrateDown();

  for (const it of results || []) {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was reverted successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to revert migration "${it.migrationName}"`);
    }
  }

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

// Handle command line arguments
const command = process.argv[2];

if (command === "up" || command === "latest") {
  migrateToLatest();
} else if (command === "down") {
  migrateDown();
} else {
  console.log("Usage: tsx migrate.ts [up|down|latest]");
  process.exit(1);
}
