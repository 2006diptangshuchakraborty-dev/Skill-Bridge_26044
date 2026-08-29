import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { industries } from "./industry.js";
import { students } from "./student.js";

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  industryId: uuid("industry_id").references(() => industries.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  difficulty: text("difficulty").default("MEDIUM"),
  status: text("status").default("OPEN"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  industryIdIdx: index("questions_industry_id_idx").on(table.industryId),
  studentIdIdx: index("questions_student_id_idx").on(table.studentId),
}));
