import { pgTable, text, timestamp, boolean, pgEnum, uniqueIndex, index, uuid, integer, jsonb, varchar, doublePrecision } from "drizzle-orm/pg-core";
import { defineRelations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "STUDENT",
  "INDUSTRY",
  "INSTITUTE",
  "ORGANIZATION",
  "ADMIN",
]);

export const accountStatusEnum = pgEnum("account_status", [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
]);

export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
]);

export const orgVerificationStatusEnum = pgEnum("org_verification_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "INFO_REQUESTED",
]);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").default(false).notNull(),
    image: text("image"),
    role: userRoleEnum("role").default("STUDENT").notNull(),
    accountStatus: accountStatusEnum("account_status").default("ACTIVE").notNull(),
    onboardingStatus: onboardingStatusEnum("onboarding_status").default("NOT_STARTED").notNull(),
    profileCompleted: boolean("profile_completed").default(false).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userEmailIdx: uniqueIndex("user_email_idx").on(table.email),
    userRoleIdx: index("user_role_idx").on(table.role),
    userStatusIdx: index("user_status_idx").on(table.accountStatus),
  })
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    sessionUserIdIdx: index("session_user_idx").on(table.userId),
    sessionTokenIdx: uniqueIndex("session_token_idx").on(table.token),
    sessionExpiresIdx: index("session_expires_idx").on(table.expiresAt),
  })
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true, mode: "date" }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true, mode: "date" }),
    scope: text("scope"),
    idToken: text("idToken"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    accountUserIdx: index("account_user_idx").on(table.userId),
    accountProviderAccountIdx: uniqueIndex("account_provider_account_idx").on(
      table.providerId,
      table.accountId
    ),
  })
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    verificationIdentifierIdx: index("verification_identifier_idx").on(table.identifier),
  })
);

export const institutes = pgTable(
  "institutes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    instituteName: text("institute_name").notNull(),
    instituteCode: text("institute_code").unique(),
    instituteType: text("institute_type"),
    address: jsonb("address").default({}).notNull(),
    website: text("website"),
    logoUrl: text("logo_url"),
    contactPhone: text("contact_phone"),
    officialEmail: text("official_email"),
    departments: jsonb("departments").default([]).notNull(),
    placementContact: jsonb("placement_contact").default({}).notNull(),
    verificationStatus: orgVerificationStatusEnum("verification_status")
      .default("PENDING")
      .notNull(),
    verificationDocs: jsonb("verification_docs").default([]).notNull(),
    profileCompletion: integer("profile_completion").default(0).notNull(),
    currentOnboardingStep: integer("current_onboarding_step").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    instituteUserIdx: uniqueIndex("institutes_user_id_idx").on(table.userId),
    instituteCodeIdx: uniqueIndex("institutes_code_idx").on(table.instituteCode),
    instituteStatusIdx: index("institutes_verification_status_idx").on(table.verificationStatus),
  })
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    email: text("email"),
    headline: text("headline"),
    bio: text("bio"),
    instituteId: uuid("institute_id").references(() => institutes.id, { onDelete: "set null" }),
    instituteName: text("institute_name"),
    degree: text("degree"),
    department: text("department"),
    graduationYear: integer("graduation_year"),
    yearOfStudy: text("year_of_study"),
    cgpa: text("cgpa"),
    skills: jsonb("skills").default([]).notNull(),
    projects: jsonb("projects").default([]).notNull(),
    certifications: jsonb("certifications").default([]).notNull(),
    experience: jsonb("experience").default([]).notNull(),
    github: text("github"),
    linkedin: text("linkedin"),
    portfolio: text("portfolio"),
    hobby: text("hobby"),
    careerPreferences: jsonb("career_preferences").default({}).notNull(),
    profileCompletion: integer("profile_completion").default(0).notNull(),
    currentOnboardingStep: integer("current_onboarding_step").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    studentUserIdx: uniqueIndex("students_user_id_idx").on(table.userId),
    studentInstituteIdx: index("students_institute_id_idx").on(table.instituteId),
    studentDeptIdx: index("students_department_idx").on(table.department),
  })
);

export const industries = pgTable(
  "industries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    registrationNumber: text("registration_number").unique(),
    taxIdGstin: text("tax_id_gstin"),
    companyType: text("company_type"),
    industry: text("industry"),
    companySize: text("company_size"),
    website: text("website"),
    logoUrl: text("logo_url"),
    contactPhone: text("contact_phone"),
    address: jsonb("address").default({}).notNull(),
    primaryContactName: text("primary_contact_name"),
    primaryContactPhone: text("primary_contact_phone"),
    primaryContactDesignation: text("primary_contact_designation"),
    documents: jsonb("documents").default([]).notNull(),
    verificationDocs: jsonb("verification_docs").default([]).notNull(),
    hiringPreferences: jsonb("hiring_preferences").default({}).notNull(),
    verificationStatus: orgVerificationStatusEnum("verification_status")
      .default("PENDING")
      .notNull(),
    verificationNotes: text("verification_notes"),
    adminNotes: text("admin_notes"),
    verifiedByAdminId: text("verified_by_admin_id").references(() => user.id, {
      onDelete: "set null",
    }),
    verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "date" }),
    profileCompletion: integer("profile_completion").default(0).notNull(),
    currentOnboardingStep: integer("current_onboarding_step").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    industryUserIdx: uniqueIndex("industries_user_id_idx").on(table.userId),
    industryRegIdx: uniqueIndex("industries_registration_number_idx").on(table.registrationNumber),
    industryStatusIdx: index("industries_verification_status_idx").on(table.verificationStatus),
  })
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionCode: varchar("question_code", { length: 255 }).unique(),
    field: varchar("field", { length: 255 }).notNull(),
    exam: varchar("exam", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    chapter: varchar("chapter", { length: 255 }).notNull(),
    topic: varchar("topic", { length: 255 }).notNull(),
    subtopic: varchar("subtopic", { length: 255 }),
    examDate: varchar("exam_date", { length: 255 }),
    examShift: varchar("exam_shift", { length: 255 }),
    questionType: varchar("question_type", { length: 255 }).default("MCQ").notNull(),
    difficulty: varchar("difficulty", { length: 255 }).default("MEDIUM").notNull(),
    marks: integer("marks").default(1).notNull(),
    negativeMarks: doublePrecision("negative_marks").default(0).notNull(),
    questionStatement: text("question_statement").notNull(),
    questionImgUrl1: varchar("question_img_url_1", { length: 255 }),
    questionImgUrl2: varchar("question_img_url_2", { length: 255 }),
    questionImgUrl3: varchar("question_img_url_3", { length: 255 }),
    optionA: text("option_a").notNull(),
    optionAImgUrl: varchar("option_a_img_url", { length: 255 }),
    optionB: text("option_b").notNull(),
    optionBImgUrl: varchar("option_b_img_url", { length: 255 }),
    optionC: text("option_c").notNull(),
    optionCImgUrl: varchar("option_c_img_url", { length: 255 }),
    optionD: text("option_d").notNull(),
    optionDImgUrl: varchar("option_d_img_url", { length: 255 }),
    optionE: text("option_e"),
    optionEImgUrl: varchar("option_e_img_url", { length: 255 }),
    optionF: text("option_f"),
    optionFImgUrl: varchar("option_f_img_url", { length: 255 }),
    correctAnswer: varchar("correct_answer", { length: 255 }).notNull(),
    numericalAnswer: integer("numerical_answer"),
    solutionText: text("solution_text").default("").notNull(),
    solutionImgUrl: varchar("solution_img_url_1", { length: 255 }),
    videoSolutionUrl: varchar("video_solution_url", { length: 255 }),
    language: varchar("language", { length: 255 }).default("EN").notNull(),
    estimatedTimeSec: integer("estimated_time_sec").default(60).notNull(),
    tags: varchar("tags", { length: 255 }).default("").notNull(),
    status: varchar("status", { length: 255 }).default("ACTIVE").notNull(),
    industryId: uuid("industry_id").references(() => industries.id, { onDelete: "set null" }),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    questionCodeIdx: uniqueIndex("questions_code_idx").on(table.questionCode),
    questionSubjectIdx: index("questions_subject_idx").on(table.subject),
    questionDifficultyIdx: index("questions_difficulty_idx").on(table.difficulty),
    questionFieldIdx: index("questions_field_idx").on(table.field),
    questionIndustryIdx: index("questions_industry_id_idx").on(table.industryId),
  })
);

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    interactionId: text("interaction_id"),
    reviewerUserId: text("reviewer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reviewerRole: text("reviewer_role").notNull(),
    targetUserId: text("target_user_id").references(() => user.id, { onDelete: "cascade" }),
    targetRole: text("target_role").notNull(),
    targetEntityId: text("target_entity_id"),
    questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => students.id, { onDelete: "cascade" }),
    industryId: uuid("industry_id").references(() => industries.id, { onDelete: "cascade" }),
    instituteId: uuid("institute_id").references(() => institutes.id, { onDelete: "cascade" }),
    contextType: text("context_type"),
    overallScore: doublePrecision("overall_score").notNull(),
    scores: jsonb("scores").default({}).notNull(),
    feedback: text("feedback"),
    recommendation: text("recommendation"),
    status: text("status").default("PUBLISHED").notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    ratingReviewerIdx: index("ratings_reviewer_user_id_idx").on(table.reviewerUserId),
    ratingTargetUserIdx: index("ratings_target_user_id_idx").on(table.targetUserId),
    ratingTargetRoleIdx: index("ratings_target_role_entity_idx").on(
      table.targetRole,
      table.targetEntityId
    ),
    ratingQuestionIdx: index("ratings_question_id_idx").on(table.questionId),
    ratingStudentIdx: index("ratings_student_id_idx").on(table.studentId),
    ratingIndustryIdx: index("ratings_industry_id_idx").on(table.industryId),
  })
);

export const relations = defineRelations(
  {
    user,
    session,
    account,
    verification,
    students,
    industries,
    institutes,
    questions,
    ratings,
  },
  ({
    one,
    many,
    user: u,
    session: se,
    account: ac,
    students: st,
    industries: ind,
    institutes: ins,
    questions: q,
    ratings: r,
  }) => ({
    user: {
      studentProfile: one.students({ from: u.id, to: st.userId }),
      industryProfile: one.industries({ from: u.id, to: ind.userId }),
      instituteProfile: one.institutes({ from: u.id, to: ins.userId }),
      sessions: many.session(),
      accounts: many.account(),
      createdQuestions: many.questions(),
      ratingsGiven: many.ratings({ from: u.id, to: r.reviewerUserId }),
      ratingsReceived: many.ratings({ from: u.id, to: r.targetUserId }),
    },
    session: {
      user: one.user({ from: se.userId, to: u.id }),
    },
    account: {
      user: one.user({ from: ac.userId, to: u.id }),
    },
    students: {
      user: one.user({ from: st.userId, to: u.id }),
      institute: one.institutes({ from: st.instituteId, to: ins.id }),
      ratings: many.ratings({ from: st.id, to: r.studentId }),
    },
    industries: {
      user: one.user({ from: ind.userId, to: u.id }),
      questions: many.questions({ from: ind.id, to: q.industryId }),
      ratings: many.ratings({ from: ind.id, to: r.industryId }),
    },
    institutes: {
      user: one.user({ from: ins.userId, to: u.id }),
      students: many.students({ from: ins.id, to: st.instituteId }),
      ratings: many.ratings({ from: ins.id, to: r.instituteId }),
    },
    questions: {
      industry: one.industries({ from: q.industryId, to: ind.id }),
      createdBy: one.user({ from: q.createdById, to: u.id }),
      ratings: many.ratings({ from: q.id, to: r.questionId }),
    },
    ratings: {
      reviewerUser: one.user({ from: r.reviewerUserId, to: u.id }),
      targetUser: one.user({ from: r.targetUserId, to: u.id }),
      question: one.questions({ from: r.questionId, to: q.id }),
      student: one.students({ from: r.studentId, to: st.id }),
      industry: one.industries({ from: r.industryId, to: ind.id }),
      institute: one.institutes({ from: r.instituteId, to: ins.id }),
    },
  })
);
