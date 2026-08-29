import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as user from "./schema/user.js";
import * as student from "./schema/student.js";
import * as industry from "./schema/industry.js";
import * as institute from "./schema/institute.js";
import * as questions from "./schema/questions.js";
import * as ratings from "./schema/ratings.js";
import * as mcqQuestions from "./schema/mcqQuestions.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing. Make sure .env.local is in the project root and restart Next.js."
  );
}

const sql = neon(databaseUrl);


export const schema = {
  ...user,
  ...student,
  ...industry,
  ...institute,
  ...questions,
  ...ratings,
  ...mcqQuestions,
};



export const db = drizzle({
  client: sql,
  schema,
});