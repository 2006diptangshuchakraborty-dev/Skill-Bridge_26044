import { pgTable, text, timestamp, integer, jsonb, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { userRoleEnum } from "./user.js";
import { user } from "./user.js";

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  email: text("email"),
  role: userRoleEnum("role").default("STUDENT"),
  phone: text("phone"),
  headline: text("headline"),
  bio: text("bio"),
  instituteName: text("institute_name"),
  department: text("department"),
  degree: text("degree"),
  yearOfStudy: text("year_of_study"),
  graduationYear: integer("graduation_year"),
  cgpa: text("cgpa"),
  skills: jsonb("skills").default([]),
  projects: jsonb("projects").default([]),
  certifications: jsonb("certifications").default([]),
  experience: jsonb("experience").default([]),
  careerPreferences: jsonb("career_preferences").default({}),
  githubUrl: text("github_url"),
  linkedinUrl: text("linkedin_url"),
  profileCompletion: integer("profile_completion").default(0),
  currentOnboardingStep: integer("current_onboarding_step").default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex("students_user_id_idx").on(table.userId),
}));

