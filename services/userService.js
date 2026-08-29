import "server-only";

import { eq } from "drizzle-orm";

import { db } from "../db/index.js";

import { students } from "../db/schema/student.js";
import { industries } from "../db/schema/industry.js";
import { institutes } from "../db/schema/institute.js";

// --------------------------------------------------
// Get one student by user ID
// --------------------------------------------------
export async function getStudentByUserId(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const result = await db
    .select()
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

// --------------------------------------------------
// Get all students
// --------------------------------------------------
export async function getStudentData() {
  return await db
    .select()
    .from(students);
}

// --------------------------------------------------
// Get all industries
// --------------------------------------------------
export async function getIndustryData() {
  return await db
    .select()
    .from(industries);
}

// --------------------------------------------------
// Get all institutes
// --------------------------------------------------
export async function getInstituteData() {
  return await db
    .select()
    .from(institutes);
}