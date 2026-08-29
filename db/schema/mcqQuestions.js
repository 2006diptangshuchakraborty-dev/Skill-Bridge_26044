import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";

export const mcqQuestions = pgTable(
  "mcq_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    sourceId: text("source_id").notNull().unique(),

    field: text("field").notNull(),

    subject: text("subject").notNull(),

    questionStatement: text("question_statement").notNull(),

    optionA: text("option_a").notNull(),

    optionB: text("option_b").notNull(),

    optionC: text("option_c").notNull(),

    optionD: text("option_d").notNull(),

    correctAnswer: text("correct_answer").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    fieldIdx: index("mcq_questions_field_idx").on(table.field),

    subjectIdx: index("mcq_questions_subject_idx").on(table.subject),
  })
);