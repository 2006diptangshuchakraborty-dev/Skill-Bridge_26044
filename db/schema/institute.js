import { pgTable, text, timestamp, jsonb, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { user, userRoleEnum } from "./user.js";

export const institutes = pgTable("institutes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").default("INSTITUTE"),
  instituteName: text("institute_name").notNull(),
  email: text("email"),
  instituteCode: text("institute_code"),
  instituteType: text("institute_type"),
  aisheCode: text("aishe_code"),
  contactPhone: text("contact_phone"),
  officialEmail: text("official_email"),
  logoUrl: text("logo_url"),
  website: text("website"),
  address: jsonb("address").default({}),
  departments: jsonb("departments").default([]),
  placementContact: jsonb("placement_contact").default({}),
  accreditationDetails: jsonb("accreditation_details").default({}),
  verificationDocs: jsonb("verification_docs").default([]),
  verificationStatus: text("verification_status").default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex("institutes_user_id_idx").on(table.userId),
}));

