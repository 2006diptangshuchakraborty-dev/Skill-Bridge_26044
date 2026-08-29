import { pgTable, text, timestamp, numeric, jsonb, uuid, index } from "drizzle-orm/pg-core";
import { questions } from "./questions.js";
import { user } from "./user.js";
import { students } from "./student.js";
import { industries } from "./industry.js";

export const ratings = pgTable("ratings", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").references(() => students.id, { onDelete: "cascade" }),
  industryId: uuid("industry_id").references(() => industries.id, { onDelete: "cascade" }),
  overallScore: numeric("overall_score", { precision: 3, scale: 2 }),
  scores: jsonb("scores").default({}),
  recommendation: text("recommendation"),
  review: text("review"),
  status: text("status").default("PUBLISHED"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  studentIdIdx: index("ratings_student_id_idx").on(table.studentId),
  industryIdIdx: index("ratings_industry_id_idx").on(table.industryId),
}));
