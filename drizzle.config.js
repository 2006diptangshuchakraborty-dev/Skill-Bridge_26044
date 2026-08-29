import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined. Add it to .env.local before running Drizzle commands."
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/index.js",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});