/**
 * Skill Bridge Platform - Unified Profile Setup & Persistence API
 * 
 * File: app/api/profile/setup/route.js
 * 
 * Methods:
 * - GET: Load authoritative profile for authenticated user from Neon PostgreSQL
 * - POST / PUT: Save/update profile with atomic Drizzle ORM UPSERT on user_id,
 *               validate fields, synchronize user table state & companion cookies.
 * 
 * Database:
 * Neon PostgreSQL + Drizzle ORM
 * 
 * Tables:
 * - schema.students
 * - schema.industries
 * - schema.institutes
 * - schema.user
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import {
  getStudentCompletionDetails,
  getOrgCompletionDetails,
  getInstituteCompletionDetails,
} from "@/lib/onboarding-calc";

export const runtime = "nodejs";

/* -------------------------------------------------------------------------- */
/*                              ROLE CONFIGURATION                            */
/* -------------------------------------------------------------------------- */

const SCHEMA_TABLES = {
  STUDENT: schema.students,
  INDUSTRY: schema.industries,
  INSTITUTE: schema.institutes,
};

/*
 * Fields that the client is NEVER allowed to overwrite or tamper with.
 * Controlled exclusively by Better Auth / the server.
 */
const PROTECTED_FIELDS = new Set([
  "id",
  "userId",
  "user_id",
  "role",
  "accountStatus",
  "account_status",
  "verificationStatus",
  "verification_status",
  "emailVerified",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
  "lastLoginAt",
  "last_login_at",
]);

/* -------------------------------------------------------------------------- */
/*                              ROLE NORMALIZATION                            */
/* -------------------------------------------------------------------------- */

function normalizeRole(role) {
  const value = String(role || "STUDENT")
    .trim()
    .toUpperCase();

  if (value === "INDUSTRY" || value === "ORGANIZATION") {
    return "INDUSTRY";
  }

  if (value === "INSTITUTE") {
    return "INSTITUTE";
  }

  return "STUDENT";
}

/* -------------------------------------------------------------------------- */
/*                         INCOMING KEY NORMALIZATION                         */
/* -------------------------------------------------------------------------- */

function normalizeIncomingKeys(data = {}) {
  const normalized = {};
  const aliasMap = {
    institute_name: "instituteName",
    full_name: "fullName",
    year_of_study: "yearOfStudy",
    graduation_year: "graduationYear",
    github_url: "githubUrl",
    githubURL: "githubUrl",
    linkedin_url: "linkedinUrl",
    linkedinURL: "linkedinUrl",
    website_url: "website",
    websiteURL: "website",
    logo_url: "logoUrl",
    logoURL: "logoUrl",
    career_preferences: "careerPreferences",
    company_name: "companyName",
    company_type: "companyType",
    company_size: "companySize",
    industry_type: "industryType",
    registration_number: "registrationNumber",
    tax_id_gstin: "taxIdGstin",
    primary_contact_name: "primaryContactName",
    primary_contact_phone: "primaryContactPhone",
    primary_contact_designation: "primaryContactDesignation",
    contact_phone: "contactPhone",
    official_email: "officialEmail",
    domain_focus: "domainFocus",
    institute_code: "instituteCode",
    institute_type: "instituteType",
    aishe_code: "aisheCode",
    placement_contact: "placementContact",
    accreditation_details: "accreditationDetails",
    verification_docs: "verificationDocs",
    hiring_preferences: "hiringPreferences",
    profile_completion: "profileCompletion",
    current_onboarding_step: "currentOnboardingStep",
  };

  for (const [k, v] of Object.entries(data)) {
    const mappedKey = aliasMap[k] || k;
    normalized[mappedKey] = v;
  }
  return normalized;
}

/* -------------------------------------------------------------------------- */
/*                         GET PROFILE COMPLETION                             */
/* -------------------------------------------------------------------------- */

function getCompletionDetails(role, profile) {
  if (!profile) {
    return {
      completion: 0,
      breakdown: {},
      missingFields: [],
    };
  }

  try {
    if (role === "STUDENT") {
      return getStudentCompletionDetails(profile);
    }
    if (role === "INDUSTRY") {
      return getOrgCompletionDetails(profile);
    }
    if (role === "INSTITUTE") {
      return getInstituteCompletionDetails(profile);
    }
  } catch (error) {
    console.warn("[Profile Setup] Completion calculation failed:", error?.message);
  }

  return {
    completion: Number(profile.profileCompletion || 0),
    breakdown: {},
    missingFields: [],
  };
}

function normalizeProfileForClient(role, profile, user = null) {
  if (!profile) return null;

  if (role === "STUDENT") {
    return {
      ...profile,
      fullName: profile.fullName ?? user?.name ?? "",
      email: profile.email ?? user?.email ?? "",
      githubURL: profile.githubURL ?? profile.githubUrl ?? "",
      linkedinURL: profile.linkedinURL ?? profile.linkedinUrl ?? "",
      githubUrl: profile.githubUrl ?? profile.githubURL ?? null,
      linkedinUrl: profile.linkedinUrl ?? profile.linkedinURL ?? null,
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      projects: Array.isArray(profile.projects) ? profile.projects : [],
      certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
      experience: Array.isArray(profile.experience) ? profile.experience : [],
      careerPreferences:
        profile.careerPreferences && typeof profile.careerPreferences === "object"
          ? profile.careerPreferences
          : {},
    };
  }

  return profile;
}

/* -------------------------------------------------------------------------- */
/*                         GET /api/profile/setup                             */
/* -------------------------------------------------------------------------- */

export async function GET(request) {
  try {
    /*
     * Authoritative ownership: Strict resolution of user identity via Better Auth session.
     * Do NOT trust client-supplied headers.
     */
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Please sign in.",
        },
        { status: 401 }
      );
    }

    const user = session.user;
    const role = normalizeRole(user.role);
    const tableSchema = SCHEMA_TABLES[role];

    if (!tableSchema) {
      return NextResponse.json(
        {
          success: false,
          error: "This account type does not have a profile setup.",
        },
        { status: 400 }
      );
    }

    /*
     * Query authoritative profile directly from Neon PostgreSQL using Drizzle ORM
     */
    const records = await db
      .select()
      .from(tableSchema)
      .where(eq(tableSchema.userId, user.id))
      .limit(1);

    const rawProfile = records[0] || null;
    const profile = normalizeProfileForClient(role, rawProfile, user);
    const completionDetails = getCompletionDetails(role, rawProfile);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        image: user.image || null,
        role,
        accountStatus: user.accountStatus || "ACTIVE",
        onboardingStatus:
          user.onboardingStatus ||
          (completionDetails.completion >= 70 ? "COMPLETED" : "IN_PROGRESS"),
        profileCompleted: user.profileCompleted === true,
      },
      role,
      profileExists: Boolean(profile),
      profile,
      profileCompletion: completionDetails.completion,
      breakdown: completionDetails.breakdown,
      missingFields: completionDetails.missingFields,
      currentStep: rawProfile?.currentOnboardingStep || 1,
    });
  } catch (error) {
    console.error("[GET /api/profile/setup] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve profile setup state.",
        message: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                    POST /api/profile/setup                                 */
/* -------------------------------------------------------------------------- */

export async function POST(request) {
  return saveProfile(request);
}

/* -------------------------------------------------------------------------- */
/*                     PUT /api/profile/setup                                 */
/* -------------------------------------------------------------------------- */

export async function PUT(request) {
  return saveProfile(request);
}

/* -------------------------------------------------------------------------- */
/*                         SAVE PROFILE (ATOMIC UPSERT)                       */
/* -------------------------------------------------------------------------- */

async function saveProfile(request) {
  try {
    /* -------------------------------------------------------------------- */
    /*                         1. AUTHENTICATION                            */
    /* -------------------------------------------------------------------- */

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Please sign in.",
        },
        { status: 401 }
      );
    }

    const user = session.user;
    const role = normalizeRole(user.role);
    const tableSchema = SCHEMA_TABLES[role];

    if (!tableSchema) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported profile role.",
        },
        { status: 400 }
      );
    }

    /* -------------------------------------------------------------------- */
    /*                           2. REQUEST BODY                            */
    /* -------------------------------------------------------------------- */

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid profile data.",
        },
        { status: 400 }
      );
    }

    const { step, stepData, profileData, action } = body;

    const rawIncoming = {
      ...(stepData && typeof stepData === "object" ? stepData : {}),
      ...(profileData && typeof profileData === "object" ? profileData : {}),
      ...(body.profile && typeof body.profile === "object" ? body.profile : {}),
    };

    // Also collect top-level profile fields if passed directly in body
    for (const [k, v] of Object.entries(body)) {
      if (!["step", "stepData", "profileData", "profile", "action", "section"].includes(k)) {
        rawIncoming[k] = v;
      }
    }

    const incomingData = normalizeIncomingKeys(rawIncoming);

    /* -------------------------------------------------------------------- */
    /*                 3. STRIP SERVER-CONTROLLED FIELDS                    */
    /* -------------------------------------------------------------------- */

    for (const field of PROTECTED_FIELDS) {
      delete incomingData[field];
    }
    delete incomingData.role;

    /* -------------------------------------------------------------------- */
    /*                     4. FETCH EXISTING PROFILE                        */
    /* -------------------------------------------------------------------- */

    const existingRecords = await db
      .select()
      .from(tableSchema)
      .where(eq(tableSchema.userId, user.id))
      .limit(1);

    const existingProfile = existingRecords[0] || null;

    /* -------------------------------------------------------------------- */
    /*                     5. MERGE PROFILE DATA                            */
    /* -------------------------------------------------------------------- */

    const mergedProfile = {
      ...(existingProfile || {}),
      ...incomingData,
    };

    /* -------------------------------------------------------------------- */
    /*                     6. STEP PROGRESSION                              */
    /* -------------------------------------------------------------------- */

    let currentStep = Number(mergedProfile.currentOnboardingStep || 1);
    if (typeof step === "number" && Number.isFinite(step)) {
      currentStep = Math.max(currentStep, Math.max(1, step));
    }
    mergedProfile.currentOnboardingStep = currentStep;

    /* -------------------------------------------------------------------- */
    /*                     7. SERVER-SIDE VALIDATION                        */
    /* -------------------------------------------------------------------- */

    if (role === "STUDENT") {
      // CGPA Validation
      if (
        mergedProfile.cgpa !== undefined &&
        mergedProfile.cgpa !== null &&
        mergedProfile.cgpa !== ""
      ) {
        const cgpaNum = Number(mergedProfile.cgpa);
        if (!Number.isFinite(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid CGPA. CGPA must be between 0 and 10.",
            },
            { status: 400 }
          );
        }
      }

      // Graduation Year Validation
      if (
        mergedProfile.graduationYear !== undefined &&
        mergedProfile.graduationYear !== null &&
        mergedProfile.graduationYear !== ""
      ) {
        const gradYear = Number(mergedProfile.graduationYear);
        if (!Number.isFinite(gradYear) || gradYear < 1950 || gradYear > 2100) {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid graduation year. Year must be between 1950 and 2100.",
            },
            { status: 400 }
          );
        }
      }

      // Sync student's email and name with Better Auth if not already set
      if (!mergedProfile.email && user.email) {
        mergedProfile.email = user.email;
      }
      if (!mergedProfile.fullName && user.name) {
        mergedProfile.fullName = user.name;
      }
    } else if (role === "INDUSTRY") {
      if (!mergedProfile.companyName) {
        mergedProfile.companyName = incomingData.companyName || user.name || "Company";
      }
      if (!mergedProfile.email && user.email) {
        mergedProfile.email = user.email;
      }
      if (incomingData.industry && !mergedProfile.industryType) {
        mergedProfile.industryType = incomingData.industry;
      }
      if (incomingData.industryType && !mergedProfile.industry) {
        mergedProfile.industry = incomingData.industryType;
      }
    } else if (role === "INSTITUTE") {
      if (!mergedProfile.instituteName) {
        mergedProfile.instituteName = incomingData.instituteName || user.name || "Institute";
      }
      if (!mergedProfile.email && user.email) {
        mergedProfile.email = user.email;
      }
      if (incomingData.instituteCode && !mergedProfile.aisheCode) {
        mergedProfile.aisheCode = incomingData.instituteCode;
      }
      if (incomingData.aisheCode && !mergedProfile.instituteCode) {
        mergedProfile.instituteCode = incomingData.aisheCode;
      }
    }

    /* -------------------------------------------------------------------- */
    /*                     8. COMPLETION CALCULATION                        */
    /* -------------------------------------------------------------------- */

    const completionDetails = getCompletionDetails(role, mergedProfile);
    mergedProfile.profileCompletion = completionDetails.completion;

    /* -------------------------------------------------------------------- */
    /*                     9. SUBMISSION GATE                               */
    /* -------------------------------------------------------------------- */

    const isCompleteAction =
      action === "COMPLETE_ONBOARDING" ||
      action === "SUBMIT";

    if (isCompleteAction) {
      if (
        completionDetails.completion < 70 &&
        completionDetails.missingFields.length > 3
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Incomplete profile. Please complete the required fields before submitting.",
            missingFields: completionDetails.missingFields,
            profileCompletion: completionDetails.completion,
          },
          { status: 400 }
        );
      }
    }

    /* -------------------------------------------------------------------- */
    /*            10. PREPARE TYPED DATA & ATOMIC DRIZZLE UPSERT            */
    /* -------------------------------------------------------------------- */

    let targetData;

    if (role === "STUDENT") {
      targetData = {
        userId: user.id,
        email: user.email || mergedProfile.email || "",
        fullName: mergedProfile.fullName || user.name || "",
        role: "STUDENT",
        phone: mergedProfile.phone ?? null,
        headline: mergedProfile.headline ?? null,
        bio: mergedProfile.bio ?? null,
        instituteName: mergedProfile.instituteName ?? null,
        department: mergedProfile.department ?? null,
        degree: mergedProfile.degree ?? null,
        yearOfStudy: mergedProfile.yearOfStudy ? String(mergedProfile.yearOfStudy) : null,
        graduationYear:
          mergedProfile.graduationYear !== undefined &&
          mergedProfile.graduationYear !== null &&
          mergedProfile.graduationYear !== ""
            ? Number(mergedProfile.graduationYear)
            : null,
        cgpa:
          mergedProfile.cgpa !== undefined && mergedProfile.cgpa !== null && mergedProfile.cgpa !== ""
            ? String(mergedProfile.cgpa)
            : null,
        skills: Array.isArray(mergedProfile.skills) ? mergedProfile.skills : [],
        projects: Array.isArray(mergedProfile.projects) ? mergedProfile.projects : [],
        certifications: Array.isArray(mergedProfile.certifications) ? mergedProfile.certifications : [],
        experience: Array.isArray(mergedProfile.experience) ? mergedProfile.experience : [],
        careerPreferences:
          mergedProfile.careerPreferences && typeof mergedProfile.careerPreferences === "object"
            ? mergedProfile.careerPreferences
            : {},
        githubUrl: mergedProfile.githubUrl ?? null,
        linkedinUrl: mergedProfile.linkedinUrl ?? null,
        profileCompletion: completionDetails.completion,
        currentOnboardingStep: currentStep,
        updatedAt: new Date(),
      };
    } else if (role === "INDUSTRY") {
      targetData = {
        userId: user.id,
        email: user.email || mergedProfile.email || "",
        companyName: mergedProfile.companyName || user.name || "Company",
        role: "INDUSTRY",
        registrationNumber: mergedProfile.registrationNumber ?? null,
        taxIdGstin: mergedProfile.taxIdGstin ?? null,
        companyType: mergedProfile.companyType ?? null,
        companySize: mergedProfile.companySize ?? null,
        industry: mergedProfile.industry || mergedProfile.industryType || null,
        industryType: mergedProfile.industryType || mergedProfile.industry || null,
        website: mergedProfile.website ?? null,
        description: mergedProfile.description ?? null,
        primaryContactName: mergedProfile.primaryContactName ?? null,
        primaryContactPhone: mergedProfile.primaryContactPhone ?? null,
        primaryContactDesignation: mergedProfile.primaryContactDesignation ?? null,
        contactPhone: mergedProfile.contactPhone ?? mergedProfile.primaryContactPhone ?? null,
        officialEmail: mergedProfile.officialEmail ?? user.email ?? null,
        logoUrl: mergedProfile.logoUrl ?? null,
        domainFocus: Array.isArray(mergedProfile.domainFocus) ? mergedProfile.domainFocus : [],
        address:
          mergedProfile.address && typeof mergedProfile.address === "object"
            ? mergedProfile.address
            : typeof mergedProfile.address === "string"
              ? { raw: mergedProfile.address }
              : {},
        documents: Array.isArray(mergedProfile.documents) ? mergedProfile.documents : [],
        verificationDocs: Array.isArray(mergedProfile.verificationDocs) ? mergedProfile.verificationDocs : [],
        hiringPreferences:
          mergedProfile.hiringPreferences && typeof mergedProfile.hiringPreferences === "object"
            ? mergedProfile.hiringPreferences
            : {},
        verificationStatus: existingProfile?.verificationStatus || "PENDING",
        createdAt: existingProfile?.createdAt || new Date(),
        updatedAt: new Date(),
      };
    } else {
      targetData = {
        userId: user.id,
        email: user.email || mergedProfile.email || "",
        instituteName: mergedProfile.instituteName || user.name || "Institute",
        role: "INSTITUTE",
        instituteCode: mergedProfile.instituteCode || mergedProfile.aisheCode || null,
        instituteType: mergedProfile.instituteType ?? null,
        aisheCode: mergedProfile.aisheCode || mergedProfile.instituteCode || null,
        contactPhone: mergedProfile.contactPhone ?? null,
        officialEmail: mergedProfile.officialEmail ?? user.email ?? null,
        logoUrl: mergedProfile.logoUrl ?? null,
        website: mergedProfile.website ?? null,
        address:
          mergedProfile.address && typeof mergedProfile.address === "object"
            ? mergedProfile.address
            : typeof mergedProfile.address === "string"
              ? { raw: mergedProfile.address }
              : {},
        departments: Array.isArray(mergedProfile.departments) ? mergedProfile.departments : [],
        placementContact:
          mergedProfile.placementContact && typeof mergedProfile.placementContact === "object"
            ? mergedProfile.placementContact
            : typeof mergedProfile.placementContact === "string"
              ? { raw: mergedProfile.placementContact }
              : {},
        accreditationDetails:
          mergedProfile.accreditationDetails && typeof mergedProfile.accreditationDetails === "object"
            ? mergedProfile.accreditationDetails
            : {},
        verificationDocs: Array.isArray(mergedProfile.verificationDocs) ? mergedProfile.verificationDocs : [],
        verificationStatus: existingProfile?.verificationStatus || "PENDING",
        createdAt: existingProfile?.createdAt || new Date(),
        updatedAt: new Date(),
      };
    }

    /*
     * Atomic UPSERT in Neon PostgreSQL using Drizzle ORM
     */
    const upsertResult = await db
      .insert(tableSchema)
      .values(targetData)
      .onConflictDoUpdate({
        target: tableSchema.userId,
        set: targetData,
      })
      .returning();

    const savedProfile = normalizeProfileForClient(role, upsertResult[0] || targetData, user);

    /* -------------------------------------------------------------------- */
    /*             11. USER TABLE & ONBOARDING STATUS STATE SYNC            */
    /* -------------------------------------------------------------------- */

    const profileCompleted = isCompleteAction || completionDetails.completion >= 70;
    const finalStatus =
      isCompleteAction || profileCompleted
        ? "COMPLETED"
        : completionDetails.completion > 0
          ? "IN_PROGRESS"
          : "NOT_STARTED";
    const onboardingStatus = finalStatus;

    if (profileCompleted || isCompleteAction) {
      await db
        .update(schema.user)
        .set({
          onboardingStatus: "COMPLETED",
          profileCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.user.id, user.id));
    } else if (completionDetails.completion > 0 && user.onboardingStatus !== "COMPLETED") {
      await db
        .update(schema.user)
        .set({
          onboardingStatus: "IN_PROGRESS",
          updatedAt: new Date(),
        })
        .where(eq(schema.user.id, user.id));
    }

    /* -------------------------------------------------------------------- */
    /*             12. BUILD JSON RESPONSE & COMPANION COOKIES              */
    /* -------------------------------------------------------------------- */

    const responsePayload = {
      success: true,
      message: isCompleteAction
        ? `${role} profile completed successfully.`
        : "Profile draft saved successfully.",
      role,
      profileCompleted: Boolean(profileCompleted),
      onboardingStatus: finalStatus,
      verificationStatus:
        role === "STUDENT"
          ? undefined
          : savedProfile.verificationStatus || "PENDING",
      profileCompletion: completionDetails.completion,
      breakdown: completionDetails.breakdown,
      missingFields: completionDetails.missingFields,
      profile: savedProfile,
      currentStep:
        savedProfile.currentOnboardingStep ||
        currentStep ||
        1,
      redirectUrl:
        role === "STUDENT"
          ? "/student/dashboard"
          : role === "INDUSTRY"
            ? "/industry/dashboard"
            : "/institute/dashboard",
    };

    const response = NextResponse.json(responsePayload);

    // Sync companion cookies
    if (profileCompleted || isCompleteAction) {
      response.cookies.set("sb_profile_completed", "true", {
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        sameSite: "lax",
      });
      response.cookies.set("sb_user_status", "ACTIVE", {
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        sameSite: "lax",
      });
    }

    response.cookies.set("sb_user_role", role, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("[POST/PUT /api/profile/setup] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save profile.",
        message: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
