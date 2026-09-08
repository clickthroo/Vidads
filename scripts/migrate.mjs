import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Add it to .env.local or your shell env.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

await client.connect();

try {
  for (const file of files) {
    console.log(`Applying migration: ${file}`);
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await client.query(sql);
  }
  console.log("Migrations applied successfully.");
} finally {
  await client.end();
}
