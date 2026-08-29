import { pgTable, text, timestamp, jsonb, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { user, userRoleEnum } from "./user.js";

export const industries = pgTable("industries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").default("INDUSTRY"),
  companyName: text("company_name").notNull(),
  email: text("email"),
  registrationNumber: text("registration_number"),
  taxIdGstin: text("tax_id_gstin"),
  companyType: text("company_type"),
  companySize: text("company_size"),
  industry: text("industry"),
  industryType: text("industry_type"),
  website: text("website"),
  description: text("description"),
  primaryContactName: text("primary_contact_name"),
  primaryContactPhone: text("primary_contact_phone"),
  primaryContactDesignation: text("primary_contact_designation"),
  contactPhone: text("contact_phone"),
  officialEmail: text("official_email"),
  logoUrl: text("logo_url"),
  domainFocus: jsonb("domain_focus").default([]),
  address: jsonb("address").default({}),
  documents: jsonb("documents").default([]),
  verificationDocs: jsonb("verification_docs").default([]),
  hiringPreferences: jsonb("hiring_preferences").default({}),
  verificationStatus: text("verification_status").default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex("industries_user_id_idx").on(table.userId),
}));

