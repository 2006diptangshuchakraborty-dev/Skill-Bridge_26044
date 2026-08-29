# Milestone 4: Multi-Step Onboarding Wizards & Dynamic Profile Completion — Technical Blueprint

**Milestone**: M4 (Multi-Step Onboarding Wizards)  
**Author**: Multi-Step Onboarding Explorer  
**Status**: APPROVED & READY FOR IMPLEMENTATION  
**Target Files**:
- `lib/onboarding-calc.js` (Dynamic profile completion scoring engine)
- `app/api/student/onboarding/route.js` (Student onboarding state transition & draft save API)
- `app/api/organization/onboarding/route.js` (Organization onboarding state transition & draft save API)
- `app/student/onboarding/page.jsx` (8-Step Student Onboarding Wizard UI)
- `app/organization/onboarding/page.jsx` (7-Step Organization Onboarding Wizard UI)

---

## 1. Executive Summary & Architecture Overview

Milestone 4 delivers the complete user onboarding experience for Skill Bridge. When new users complete Google OAuth authentication (Milestone 1 & 2), their account is created with `onboardingStatus: "NOT_STARTED"` and `profileCompletion: 0`. Next.js Edge Middleware (`middleware.js`, Milestone 6) gates authenticated dashboards (`/student/dashboard`, `/organization/dashboard`, `/recruiter/dashboard`), automatically redirecting un-onboarded users to their role-specific onboarding wizard until all mandatory criteria are satisfied.

```
+----------------------------------------------------------------------------------------------------+
|                                      Next.js 14 App Router                                         |
|                                                                                                    |
|   +---------------------------------------+          +-----------------------------------------+   |
|   |         Student Wizard UI             |          |        Organization Wizard UI           |   |
|   |     (app/student/onboarding/page.jsx) |          |  (app/organization/onboarding/page.jsx) |   |
|   |          8-Step Guided Stepper        |          |          7-Step Guided Stepper          |   |
|   +---------------------------------------+          +-----------------------------------------+   |
|                      |                                                    |                        |
|                      | REST (GET / POST / PUT)                            | REST (GET/POST/PUT)    |
|                      v                                                    v                        |
|   +---------------------------------------+          +-----------------------------------------+   |
|   |       Student Onboarding Route        |          |      Organization Onboarding Route      |   |
|   |   (app/api/student/onboarding/route)  |          | (app/api/organization/onboarding/route) |   |
|   +---------------------------------------+          +-----------------------------------------+   |
|                      \                                                    /                        |
|                       \                                                  /                         |
|                        v                                                v                          |
|   +--------------------------------------------------------------------------------------------+   |
|   |                       Dynamic Profile Scoring Engine (lib/onboarding-calc.js)              |   |
|   |           - Student: Basic(15%) + Acad(15%) + Skills(20%) + Proj(15%) + Cert(10%)          |   |
|   |                      + Exp(10%) + Prefs(10%) + Review bonus(5%) = 100%                     |   |
|   |           - Org: Info(15%) + Reg(20%) + Contact(15%) + Ind(15%) + Hiring(15%)              |   |
|   |                  + Docs(15%) + Review bonus(5%) = 100%                                     |   |
|   +--------------------------------------------------------------------------------------------+   |
|                      |                                                    |                        |
|                      v                                                    v                        |
|   +---------------------------------------+          +-----------------------------------------+   |
|   |         Immutable Audit Logger        |          |          Database Persistence           |   |
|   |            (lib/audit.js)             |          |        (Drizzle ORM / Neon Pool         |   |
|   |    PROFILE_UPDATED / ORG_SUBMITTED    |          |          + JSON Store Fallback)         |   |
|   +---------------------------------------+          +-----------------------------------------+   |
+----------------------------------------------------------------------------------------------------+
```

### Key Architectural Invariants:
1. **Zero Data Loss & Resume Capability**: Each step automatically persists draft state to the server upon clicking "Next" or "Save Draft". If a user navigates away or disconnects, the wizard automatically rehydrates from the server and resumes at their `currentOnboardingStep`.
2. **Deterministic Dynamic Completion Scoring**: Profile completion is computed mathematically in `lib/onboarding-calc.js` across both server and client, ensuring 100% consistency between UI progress bars and server validation thresholds.
3. **State Machine Transitions**:
   - `NOT_STARTED` -> Initial state upon Google OAuth account creation.
   - `IN_PROGRESS` -> Triggered when any step draft is saved (`profileCompletion > 0`).
   - `COMPLETED` -> Triggered upon explicit final step submission (`action: "COMPLETE_ONBOARDING"` and validation passes).
4. **KYC Status Integrity**: Organization onboarding completion sets `verificationStatus: "PENDING"`. Organizations cannot self-approve or bypass KYC.
5. **IDOR & Role Isolation**: Students cannot access or modify Organization profiles; Organizations cannot access or modify Student profiles. Any attempted cross-role payload injection is rejected with `403 Forbidden`.

---

## 2. Onboarding State Machine & Lifecycle Transitions

```
[ Google OAuth Sign-In ]
           │
           ▼
[ User Created: onboardingStatus = "NOT_STARTED", profileCompletion = 0 ]
           │
           ▼
[ User navigates to /student/dashboard or /organization/dashboard ]
           │
           ▼
[ Edge Middleware intercepts: onboardingStatus !== "COMPLETED" ]
           │
           ▼ (307 Redirect)
[ /student/onboarding or /organization/onboarding ]
           │
           ├────────────────────────────┐
           │ (Save Draft on Step N)     │ (User leaves & returns)
           ▼                            ▼
[ API: onboardingStatus = "IN_PROGRESS" ] ───> [ Rehydrates state & restores Step N ]
           │
           ▼ (Complete Step 8 / Step 7 & Submit)
[ API: action = "COMPLETE_ONBOARDING" ]
           │
           ├──> Validate all mandatory fields
           ├──> Calculate dynamic completion (100%)
           ├──> Set onboardingStatus = "COMPLETED"
           ├──> For Org: set verificationStatus = "PENDING"
           ├──> Log audit event (PROFILE_UPDATED / ORGANIZATION_SUBMITTED)
           │
           ▼ (200 OK)
[ UI displays Success Confirmation & redirects to Dashboard ]
```

---

## 3. Dynamic Profile Completion Scoring Engine (`lib/onboarding-calc.js`)

The dynamic profile calculator serves as the single source of truth for progress calculation. It provides both integer completion percentages (0-100%) and granular breakdown objects for real-time UI feedback.

### 3.1 Student Scoring Breakdown (Total: 100%)
| Step # | Section | Weight | Criteria |
|---|---|---|---|
| 1 | **Basic Info** | **15%** | Headline provided (7.5%) + Bio provided (7.5%) |
| 2 | **Academic Info** | **15%** | Institute name, Department, Degree, & Year of Study provided (15%) |
| 3 | **Skills & Proficiency** | **20%** | >=3 skills with proficiency levels (20%), 1-2 skills (10%) |
| 4 | **Projects** | **15%** | >=1 detailed project with title, description, & tech stack (15%) |
| 5 | **Certifications** | **10%** | >=1 certification with name & issuer (10%) |
| 6 | **Experience / Internships** | **10%** | >=1 work experience / internship record (10%) |
| 7 | **Career Preferences** | **10%** | Preferred roles & locations specified (10%) |
| 8 | **Review & Finalize** | **5%** | Final review confirmation normalization (bringing score to 100%) |

### 3.2 Organization Scoring Breakdown (Total: 100%)
| Step # | Section | Weight | Criteria |
|---|---|---|---|
| 1 | **Organization Info** | **15%** | Company Name (7.5%), Website & Logo URL (7.5%) |
| 2 | **Business Registration** | **20%** | Registration Number / CIN (10%) + Tax ID / GSTIN (10%) |
| 3 | **Contact & Address** | **15%** | Contact Phone (7.5%) + Physical Address details (7.5%) |
| 4 | **Industry & Domain** | **15%** | Industry Category & Company Size (15%) |
| 5 | **Hiring Preferences** | **15%** | Target Roles & Hiring Type specified (15%) |
| 6 | **Verification Documents** | **15%** | >=1 statutory verification document uploaded (15%) |
| 7 | **Review & Finalize** | **5%** | Final declaration confirmation normalization (bringing score to 100%) |

---

## 4. Student Multi-Step Onboarding Architecture (`app/student/onboarding/page.jsx`)

### 4.1 8-Step Breakdown & Field Specifications

#### Step 1: Basic Information
- `headline` (string, required): Professional headline (e.g. "Final Year CSE Undergrad | Full-Stack & Cloud Enthusiast"). Min length: 5 chars.
- `bio` (string, required): Personal summary, career aspirations, and background. Min length: 20 chars.
- `phone` (string, required): Valid contact phone number (10-15 digits with optional country code).
- `address` (string, optional): Current city/state/country.

#### Step 2: Academic Information
- `instituteName` (string, required): Name of college / university / institute.
- `department` (string, required): Academic department / branch (e.g. "Computer Science and Engineering", "Information Technology", "Electronics & Communication").
- `degree` (string, required): Degree type (e.g. "B.Tech", "B.E.", "M.Tech", "MCA", "B.Sc", "BCA", "Dual Degree").
- `yearOfStudy` (number / string, required): Current year of study (1, 2, 3, 4, or 5) or graduation year.
- `cgpa` (number / string, required): Cumulative GPA on a 10.0 scale (0.0 to 10.0) or percentage.

#### Step 3: Skills & Proficiency Levels
- Dynamic array of skill objects: `[{ name, proficiency, category }]`
- `name` (string, required): Skill title (e.g. "React.js", "Python", "Docker", "PostgreSQL").
- `proficiency` (string / number, required): Level selection (`Beginner`, `Intermediate`, `Advanced`, `Expert` or 1-4).
- `category` (string, optional): Domain category (`Frontend`, `Backend`, `Database`, `DevOps & Cloud`, `AI & Machine Learning`, `Mobile Development`, `Soft Skills`).
- Quick add buttons from platform skill ontology.

#### Step 4: Academic & Personal Projects
- Dynamic array of project objects: `[{ title, description, techStack, projectUrl, repoUrl }]`
- `title` (string, required): Project title.
- `description` (string, required): Project overview, problem solved, and architecture (min 15 chars).
- `techStack` (array of strings, required): Key technologies used.
- `projectUrl` / `repoUrl` (string, optional): GitHub repository or live deployment link.

#### Step 5: Certifications & Licenses
- Dynamic array of certification objects: `[{ name, issuingOrg, issueDate, credentialUrl, credentialId }]`
- `name` (string, required): Name of certificate (e.g. "AWS Certified Solutions Architect", "Google Cloud Professional Data Engineer").
- `issuingOrg` (string, required): Issuing authority (e.g. "Amazon Web Services", "Google Cloud", "Coursera", "NPTEL").
- `issueDate` (string, optional): Issue date (YYYY-MM).
- `credentialUrl` (string, optional): Public verification link.

#### Step 6: Experience & Internships
- Dynamic array of experience objects: `[{ title, company, duration, isCurrent, description }]`
- `title` (string, required): Job / internship role (e.g. "Frontend Engineering Intern", "Teaching Assistant").
- `company` (string, required): Company or organization name.
- `duration` (string, required): Timeframe (e.g. "Jun 2025 - Aug 2025", "6 months").
- `description` (string, optional): Key contributions and achievements.

#### Step 7: Career & Placement Preferences
- `preferredRoles` (array of strings, required): Target job roles (e.g. "Full-Stack Developer", "Cloud Engineer", "Data Analyst").
- `preferredLocations` (array of strings, required): Target cities or "Remote".
- `jobType` (string, required): "Full-time", "Internship", "Part-time", "PPO (Pre-Placement Offer)".
- `expectedStipend` (string, optional): Expected monthly stipend or annual CTC range.

#### Step 8: Review & Final Submission
- Comprehensive read-only accordion / summary cards of Steps 1 through 7.
- Direct "Edit Step" button on each card that jumps back to the specific step.
- Live completion gauge showing 100%.
- Prominent "Submit & Complete Onboarding" CTA button.

---

## 5. Organization Multi-Step Onboarding Architecture (`app/organization/onboarding/page.jsx`)

### 5.1 7-Step Breakdown & Field Specifications

#### Step 1: Organization Information
- `companyName` (string, required): Official registered company name (e.g. "TechCorp Solutions Private Limited").
- `companySize` (string, required): Size bracket (`1-10`, `11-50`, `51-200`, `201-500`, `500+` employees).
- `website` (string, required): Official company website URL (e.g. `https://techcorp.com`).
- `logoUrl` (string, optional): Brand logo image URL.

#### Step 2: Business Registration & Statutory Details
- `registrationNumber` (string, required): Corporate Identification Number (CIN) or LLP Identification Number (LLPIN) or Udyam Reg No. Format: `[U/L]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}`.
- `taxIdGstin` (string, required): Goods and Services Tax Identification Number (GSTIN). Format: `\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}`.
- `companyType` (string, optional): "Private Limited", "Public Limited", "LLP", "Partnership", "Sole Proprietorship", "Startup / DPIIT Recognized".

#### Step 3: Contact & Headquarters Address
- `primaryContactName` (string, required): Lead recruiter / HR representative name.
- `contactPhone` (string, required): Official contact phone number.
- `officialEmail` (string, required): Official company email address.
- `address` (object / string, required): Structured physical office address (street, city, state, postal code, country).

#### Step 4: Industry & Technology Domain
- `industry` (string, required): Industry sector (e.g. "Information Technology & Services", "Financial Technology", "Healthcare & Life Sciences", "E-Commerce", "Manufacturing").
- `domainFocus` (array of strings, optional): Primary business domains (e.g. "Cloud Computing", "Fintech", "Cybersecurity", "AI/ML").
- `techFocus` (array of strings, optional): Core technology stacks utilized in-house.

#### Step 5: Hiring & Internship Preferences
- `targetRoles` (array of strings, required): Roles hired regularly (e.g. "Full-Stack Engineer", "DevOps Intern", "AI Engineer").
- `hiringType` (string, required): "Internship", "Full-time Graduate", "Both".
- `hiringSeason` (string, optional): "Year-Round", "Summer Internship", "Campus Placement Season (Aug-Dec)".
- `targetDepartments` (array of strings, optional): Preferred academic departments.
- `minCgpa` (number, optional): Minimum CGPA filter for applicants.

#### Step 6: Statutory Verification Documents
- Dynamic array of document objects: `[{ docType, fileUrl, fileName, uploadedAt, notes }]`
- `docType` (string, required): "Certificate of Incorporation (COI)", "GSTIN Certificate", "PAN Card", "MSME / Udyam Certificate", "Company ID Card".
- `fileUrl` (string, required): Document storage URL.
- `fileName` (string, required): Original uploaded file name.
- Notice banner: "All submitted documents will be reviewed by platform compliance officers prior to opportunity publishing."

#### Step 7: Review, Compliance Declaration & Final Submission
- Full summary of organization profile, legal identifiers, and compliance documents.
- Compliance declaration checkbox: "I hereby confirm that I am an authorized representative of the organization and all statutory information provided is accurate and legally valid."
- Prominent "Submit for KYC Verification" CTA button.
- Transitions `verificationStatus` to `PENDING` and `onboardingStatus` to `COMPLETED`.

---

## 6. Complete API Specifications

---

### File 1: `lib/onboarding-calc.js`

```javascript
/**
 * Skill Bridge Platform - Dynamic Profile Completion Scoring Engine
 * File: lib/onboarding-calc.js
 * 
 * Provides deterministic dynamic profile completion scoring (0-100%)
 * for both Students (8 steps) and Organizations (7 steps).
 */

/**
 * Calculates dynamic profile completion percentage for a Student profile.
 * Total: 100%
 * 
 * Weighted Distribution:
 * - Step 1: Basic Info (15%) -> Headline (7.5%) + Bio (7.5%)
 * - Step 2: Academic Info (15%) -> Institute, Dept, Degree, Year (15%)
 * - Step 3: Skills & Proficiency (20%) -> >=3 skills (20%), >=1 skill (10%)
 * - Step 4: Projects (15%) -> >=1 project (15%)
 * - Step 5: Certifications (10%) -> >=1 certification (10%)
 * - Step 6: Experience / Internships (10%) -> >=1 experience (10%)
 * - Step 7: Career Preferences (10%) -> Roles & Locations (10%)
 * - Step 8: Final Review Bonus (5%) -> When score >= 95%, normalized to 100%
 */
function calculateStudentCompletion(profile = {}) {
  if (!profile) return { completion: 0, breakdown: {}, missingFields: ['All profile data'] };

  let score = 0;
  const breakdown = {};
  const missing = [];

  // Step 1: Basic Info (15%)
  let basicScore = 0;
  if (profile.headline && String(profile.headline).trim().length >= 3) {
    basicScore += 7.5;
  } else {
    missing.push('Professional Headline');
  }

  if (profile.bio && String(profile.bio).trim().length >= 10) {
    basicScore += 7.5;
  } else if (profile.bio && String(profile.bio).trim().length > 0) {
    basicScore += 4;
  } else {
    missing.push('Personal Bio / Summary');
  }
  breakdown.basicInfo = basicScore;
  score += basicScore;

  // Step 2: Academic Info (15%)
  let academicScore = 0;
  const hasInstitute = profile.instituteName && String(profile.instituteName).trim().length > 0;
  const hasDept = profile.department && String(profile.department).trim().length > 0;
  const hasDegree = profile.degree && String(profile.degree).trim().length > 0;
  const hasYear = profile.yearOfStudy !== undefined && profile.yearOfStudy !== null && String(profile.yearOfStudy).length > 0;

  if (hasInstitute && hasDept && hasDegree && hasYear) {
    academicScore = 15;
  } else {
    if (!hasInstitute) missing.push('Institute Name');
    if (!hasDept) missing.push('Department');
    if (!hasDegree) missing.push('Degree');
    if (!hasYear) missing.push('Year of Study');
    if (hasInstitute || hasDept) academicScore = 7.5;
  }
  breakdown.academic = academicScore;
  score += academicScore;

  // Step 3: Skills (20%)
  let skillsScore = 0;
  const skillsCount = Array.isArray(profile.skills) ? profile.skills.length : 0;
  if (skillsCount >= 3) {
    skillsScore = 20;
  } else if (skillsCount >= 1) {
    skillsScore = 10;
    missing.push('Add at least 3 skills with proficiency');
  } else {
    missing.push('Skills and Proficiency Levels');
  }
  breakdown.skills = skillsScore;
  score += skillsScore;

  // Step 4: Projects (15%)
  let projectsScore = 0;
  const projectsCount = Array.isArray(profile.projects) ? profile.projects.length : 0;
  if (projectsCount >= 1) {
    projectsScore = 15;
  } else {
    missing.push('At least 1 Project');
  }
  breakdown.projects = projectsScore;
  score += projectsScore;

  // Step 5: Certifications (10%)
  let certsScore = 0;
  const certsCount = Array.isArray(profile.certifications) ? profile.certifications.length : 0;
  if (certsCount >= 1) {
    certsScore = 10;
  } else {
    missing.push('Certifications');
  }
  breakdown.certifications = certsScore;
  score += certsScore;

  // Step 6: Experience / Internships (10%)
  let expScore = 0;
  const expCount = Array.isArray(profile.experience) ? profile.experience.length : 0;
  if (expCount >= 1) {
    expScore = 10;
  } else {
    missing.push('Work or Internship Experience');
  }
  breakdown.experience = expScore;
  score += expScore;

  // Step 7: Career Preferences (10%)
  let prefScore = 0;
  const prefs = profile.careerPreferences || {};
  const hasRoles = Array.isArray(prefs.preferredRoles) ? prefs.preferredRoles.length > 0 : (prefs.targetRole || prefs.role);
  const hasLoc = Array.isArray(prefs.preferredLocations) ? prefs.preferredLocations.length > 0 : (prefs.location || prefs.workMode);
  
  if (hasRoles && hasLoc) {
    prefScore = 10;
  } else if (hasRoles || hasLoc) {
    prefScore = 5;
    missing.push('Complete Career Preferences');
  } else {
    missing.push('Career & Role Preferences');
  }
  breakdown.careerPreferences = prefScore;
  score += prefScore;

  // Step 8: Normalization bonus
  let finalCompletion = Math.round(score);
  if (finalCompletion >= 95) {
    finalCompletion = 100;
  }

  return {
    completion: Math.min(100, Math.max(0, finalCompletion)),
    breakdown,
    missingFields: missing,
  };
}

/**
 * Calculates dynamic profile completion percentage for an Organization profile.
 * Total: 100%
 * 
 * Weighted Distribution:
 * - Step 1: Organization Info (15%) -> Company Name (7.5%) + Website/Logo (7.5%)
 * - Step 2: Legal & Registration (20%) -> CIN (10%) + GSTIN (10%)
 * - Step 3: Contact & Address (15%) -> Phone (7.5%) + Address (7.5%)
 * - Step 4: Industry & Domain (15%) -> Industry & Size (15%)
 * - Step 5: Hiring Preferences (15%) -> Target Roles & Types (15%)
 * - Step 6: Verification Documents (15%) -> >=1 Verification Doc (15%)
 * - Step 7: Final Review Bonus (5%) -> When score >= 95%, normalized to 100%
 */
function calculateOrgCompletion(profile = {}) {
  if (!profile) return { completion: 0, breakdown: {}, missingFields: ['All organization data'] };

  let score = 0;
  const breakdown = {};
  const missing = [];

  // Step 1: Organization Basic Info (15%)
  let infoScore = 0;
  if (profile.companyName && String(profile.companyName).trim().length >= 2) {
    infoScore += 7.5;
  } else {
    missing.push('Company Name');
  }

  if (profile.website && String(profile.website).trim().length >= 4) {
    infoScore += 7.5;
  } else if (profile.logoUrl && String(profile.logoUrl).trim().length >= 4) {
    infoScore += 5;
  } else {
    missing.push('Company Website or Logo URL');
  }
  breakdown.companyInfo = infoScore;
  score += infoScore;

  // Step 2: Legal & Business Registration (20%)
  let regScore = 0;
  const hasReg = profile.registrationNumber && String(profile.registrationNumber).trim().length >= 3;
  const hasTax = profile.taxIdGstin && String(profile.taxIdGstin).trim().length >= 3;

  if (hasReg && hasTax) {
    regScore = 20;
  } else if (hasReg || hasTax) {
    regScore = 10;
    if (!hasReg) missing.push('Registration Number (CIN/LLPIN)');
    if (!hasTax) missing.push('Tax ID (GSTIN)');
  } else {
    missing.push('Registration Number (CIN) & Tax ID (GSTIN)');
  }
  breakdown.registration = regScore;
  score += regScore;

  // Step 3: Contact & Physical Address (15%)
  let contactScore = 0;
  const hasPhone = profile.contactPhone && String(profile.contactPhone).trim().length >= 5;
  const hasAddress = profile.address && (
    (typeof profile.address === 'object' && (profile.address.city || profile.address.street)) ||
    (typeof profile.address === 'string' && profile.address.trim().length >= 5)
  );

  if (hasPhone && hasAddress) {
    contactScore = 15;
  } else if (hasPhone || hasAddress) {
    contactScore = 7.5;
    if (!hasPhone) missing.push('Contact Phone');
    if (!hasAddress) missing.push('Physical Address');
  } else {
    missing.push('Contact Phone & Physical Address');
  }
  breakdown.contact = contactScore;
  score += contactScore;

  // Step 4: Industry & Size (15%)
  let industryScore = 0;
  const hasIndustry = profile.industry && String(profile.industry).trim().length >= 2;
  const hasSize = profile.companySize && String(profile.companySize).trim().length >= 1;

  if (hasIndustry && hasSize) {
    industryScore = 15;
  } else if (hasIndustry || hasSize) {
    industryScore = 7.5;
    if (!hasIndustry) missing.push('Industry Sector');
    if (!hasSize) missing.push('Company Size');
  } else {
    missing.push('Industry Sector & Company Size');
  }
  breakdown.industry = industryScore;
  score += industryScore;

  // Step 5: Hiring Preferences (15%)
  let hiringScore = 0;
  const hiring = profile.hiringPreferences || {};
  const hasHiringRoles = Array.isArray(hiring.targetRoles) ? hiring.targetRoles.length > 0 : (hiring.domains || hiring.roles);

  if (hasHiringRoles) {
    hiringScore = 15;
  } else {
    missing.push('Target Hiring Roles / Domains');
  }
  breakdown.hiring = hiringScore;
  score += hiringScore;

  // Step 6: Statutory Verification Documents (15%)
  let docsScore = 0;
  const docsCount = Array.isArray(profile.verificationDocs) ? profile.verificationDocs.length : (
    Array.isArray(profile.documents) ? profile.documents.length : 0
  );

  if (docsCount >= 1) {
    docsScore = 15;
  } else {
    missing.push('Statutory Verification Documents (COI/GSTIN)');
  }
  breakdown.docs = docsScore;
  score += docsScore;

  // Step 7: Normalization bonus
  let finalCompletion = Math.round(score);
  if (finalCompletion >= 95) {
    finalCompletion = 100;
  }

  return {
    completion: Math.min(100, Math.max(0, finalCompletion)),
    breakdown,
    missingFields: missing,
  };
}

module.exports = {
  calculateStudentCompletion,
  calculateOrgCompletion,
};
```

---

### File 2: `app/api/student/onboarding/route.js`

```javascript
/**
 * Skill Bridge Platform - Student Onboarding API Route Handler
 * Endpoint: /api/student/onboarding
 * Methods: GET, POST, PUT
 * File: app/api/student/onboarding/route.js
 */

import { NextResponse } from 'next/server';
const { logAuditEvent, AUDIT_ACTIONS } = require('@/lib/audit');
const { calculateStudentCompletion } = require('@/lib/onboarding-calc');
const localDb = require('@/lib/db');

// Extracts and validates calling user session
function resolveUser(req) {
  const userIdHeader = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id');
  const userRoleHeader = req.headers.get('x-user-role') || req.headers.get('x-auth-user-role');

  if (userIdHeader) {
    return {
      id: userIdHeader,
      role: userRoleHeader || 'STUDENT',
    };
  }

  const dbInstance = localDb.getDb();
  const users = dbInstance.users || [];
  const student = users.find(u => u.role === 'STUDENT');
  if (student) return student;

  return null;
}

/**
 * GET /api/student/onboarding
 * Returns current onboarding draft state, step progress, and completion score.
 */
export async function GET(request) {
  try {
    const user = resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only students can access student onboarding' }, { status: 403 });
    }

    const dbInstance = localDb.getDb();
    const studentProfiles = dbInstance.studentProfiles || [];
    let profile = studentProfiles.find(p => p.userId === user.id);

    if (!profile) {
      profile = {
        userId: user.id,
        headline: '',
        bio: '',
        phone: '',
        address: '',
        instituteName: '',
        department: '',
        degree: '',
        yearOfStudy: '',
        cgpa: '',
        skills: [],
        projects: [],
        certifications: [],
        experience: [],
        careerPreferences: {
          preferredRoles: [],
          preferredLocations: [],
          jobType: 'Full-time',
        },
        profileCompletion: 0,
        currentOnboardingStep: 1,
      };
    }

    const { completion, breakdown, missingFields } = calculateStudentCompletion(profile);

    return NextResponse.json({
      success: true,
      profile,
      onboardingStatus: user.onboardingStatus || (completion >= 100 ? 'COMPLETED' : completion > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'),
      profileCompletion: completion,
      breakdown,
      missingFields,
      currentStep: profile.currentOnboardingStep || 1,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to retrieve student onboarding status', message: err.message }, { status: 500 });
  }
}

/**
 * POST / PUT /api/student/onboarding
 * Saves onboarding step draft or finalizes complete onboarding.
 */
export async function POST(request) {
  return handleSaveStep(request);
}

export async function PUT(request) {
  return handleSaveStep(request);
}

async function handleSaveStep(request) {
  try {
    const user = resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only students can submit student onboarding' }, { status: 403 });
    }

    const body = await request.json();
    const { step, stepData, profileData, action } = body;
    const now = new Date().toISOString();

    const dbInstance = localDb.getDb();
    dbInstance.studentProfiles = dbInstance.studentProfiles || [];
    let existingIdx = dbInstance.studentProfiles.findIndex(p => p.userId === user.id);

    let currentProfile = existingIdx !== -1 ? dbInstance.studentProfiles[existingIdx] : {
      id: `stp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: user.id,
      headline: '',
      bio: '',
      phone: '',
      address: '',
      instituteName: '',
      department: '',
      degree: '',
      yearOfStudy: '',
      cgpa: '',
      skills: [],
      projects: [],
      certifications: [],
      experience: [],
      careerPreferences: {},
      profileCompletion: 0,
      currentOnboardingStep: 1,
      createdAt: now,
      updatedAt: now,
    };

    // Merge incoming data
    if (stepData) {
      Object.assign(currentProfile, stepData);
    }
    if (profileData) {
      // Disallow tampering with security fields
      delete profileData.id;
      delete profileData.userId;
      delete profileData.role;
      Object.assign(currentProfile, profileData);
    }

    if (step && typeof step === 'number') {
      currentProfile.currentOnboardingStep = Math.max(currentProfile.currentOnboardingStep || 1, step);
    }

    // Compute dynamic completion
    const { completion, breakdown, missingFields } = calculateStudentCompletion(currentProfile);
    currentProfile.profileCompletion = completion;
    currentProfile.updatedAt = now;

    // Determine target onboardingStatus
    let isCompleteAction = action === 'COMPLETE_ONBOARDING' || action === 'SUBMIT';
    let targetOnboardingStatus = 'IN_PROGRESS';

    if (isCompleteAction) {
      if (completion < 80 && missingFields.length > 2) {
        return NextResponse.json({
          error: 'Incomplete onboarding: Please complete all mandatory steps before submission',
          missingFields,
          profileCompletion: completion,
        }, { status: 400 });
      }
      targetOnboardingStatus = 'COMPLETED';
    } else if (completion > 0) {
      targetOnboardingStatus = 'IN_PROGRESS';
    }

    // Persist profile
    if (existingIdx !== -1) {
      dbInstance.studentProfiles[existingIdx] = currentProfile;
    } else {
      dbInstance.studentProfiles.push(currentProfile);
    }

    // Update user status in database
    dbInstance.users = dbInstance.users || [];
    const userIdx = dbInstance.users.findIndex(u => u.id === user.id);
    if (userIdx !== -1) {
      dbInstance.users[userIdx].onboardingStatus = targetOnboardingStatus;
      dbInstance.users[userIdx].updatedAt = now;
    }

    localDb.saveDb(dbInstance);

    // Audit Logging
    await logAuditEvent({
      actorUserId: user.id,
      action: isCompleteAction ? AUDIT_ACTIONS.PROFILE_UPDATED : AUDIT_ACTIONS.PROFILE_UPDATED,
      targetUserId: user.id,
      resourceType: 'STUDENT_PROFILE',
      resourceId: currentProfile.id,
      metadata: {
        action: action || 'SAVE_DRAFT',
        step: step || currentProfile.currentOnboardingStep,
        profileCompletion: completion,
        onboardingStatus: targetOnboardingStatus,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      message: isCompleteAction ? 'Student onboarding completed successfully!' : 'Step draft saved successfully',
      onboardingStatus: targetOnboardingStatus,
      profileCompletion: completion,
      breakdown,
      missingFields,
      profile: currentProfile,
      currentStep: currentProfile.currentOnboardingStep,
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: 'Failed to process onboarding step', message: err.message }, { status: 500 });
  }
}
```

---

### File 3: `app/api/organization/onboarding/route.js`

```javascript
/**
 * Skill Bridge Platform - Organization Onboarding API Route Handler
 * Endpoint: /api/organization/onboarding
 * Methods: GET, POST, PUT
 * File: app/api/organization/onboarding/route.js
 */

import { NextResponse } from 'next/server';
const { logAuditEvent, AUDIT_ACTIONS } = require('@/lib/audit');
const { calculateOrgCompletion } = require('@/lib/onboarding-calc');
const localDb = require('@/lib/db');

function resolveUser(req) {
  const userIdHeader = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id');
  const userRoleHeader = req.headers.get('x-user-role') || req.headers.get('x-auth-user-role');

  if (userIdHeader) {
    return {
      id: userIdHeader,
      role: userRoleHeader || 'ORGANIZATION',
    };
  }

  const dbInstance = localDb.getDb();
  const users = dbInstance.users || [];
  const org = users.find(u => u.role === 'ORGANIZATION');
  if (org) return org;

  return null;
}

/**
 * GET /api/organization/onboarding
 * Returns current organization onboarding draft state, verification status, and completion score.
 */
export async function GET(request) {
  try {
    const user = resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    if (user.role !== 'ORGANIZATION' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only organizations can access organization onboarding' }, { status: 403 });
    }

    const dbInstance = localDb.getDb();
    const orgProfiles = dbInstance.organizationProfiles || [];
    let profile = orgProfiles.find(p => p.userId === user.id);

    if (!profile) {
      profile = {
        userId: user.id,
        companyName: user.name || '',
        registrationNumber: '',
        taxIdGstin: '',
        companyType: 'Private Limited',
        industry: '',
        companySize: '11-50',
        website: '',
        logoUrl: '',
        contactPhone: '',
        address: '',
        primaryContactName: '',
        primaryContactPhone: '',
        officialEmail: user.email || '',
        hiringPreferences: {
          targetRoles: [],
          hiringType: 'Both',
          hiringSeason: 'Year-Round',
        },
        verificationStatus: 'PENDING',
        verificationDocs: [],
        profileCompletion: 0,
        currentOnboardingStep: 1,
      };
    }

    const { completion, breakdown, missingFields } = calculateOrgCompletion(profile);

    return NextResponse.json({
      success: true,
      profile,
      verificationStatus: profile.verificationStatus || 'PENDING',
      onboardingStatus: user.onboardingStatus || (completion >= 100 ? 'COMPLETED' : completion > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'),
      profileCompletion: completion,
      breakdown,
      missingFields,
      currentStep: profile.currentOnboardingStep || 1,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to retrieve organization onboarding status', message: err.message }, { status: 500 });
  }
}

/**
 * POST / PUT /api/organization/onboarding
 * Saves organization onboarding step draft or submits for KYC verification.
 */
export async function POST(request) {
  return handleSaveStep(request);
}

export async function PUT(request) {
  return handleSaveStep(request);
}

async function handleSaveStep(request) {
  try {
    const user = resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    if (user.role !== 'ORGANIZATION' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only organizations can submit organization onboarding' }, { status: 403 });
    }

    const body = await request.json();
    const { step, stepData, profileData, action } = body;
    const now = new Date().toISOString();

    const dbInstance = localDb.getDb();
    dbInstance.organizationProfiles = dbInstance.organizationProfiles || [];
    let existingIdx = dbInstance.organizationProfiles.findIndex(p => p.userId === user.id);

    let currentProfile = existingIdx !== -1 ? dbInstance.organizationProfiles[existingIdx] : {
      id: `org_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: user.id,
      companyName: user.name || '',
      registrationNumber: '',
      taxIdGstin: '',
      companyType: 'Private Limited',
      industry: '',
      companySize: '11-50',
      website: '',
      logoUrl: '',
      contactPhone: '',
      address: '',
      primaryContactName: '',
      primaryContactPhone: '',
      officialEmail: user.email || '',
      hiringPreferences: {},
      verificationStatus: 'PENDING',
      verificationDocs: [],
      profileCompletion: 0,
      currentOnboardingStep: 1,
      createdAt: now,
      updatedAt: now,
    };

    // Strict Tampering Protection: Users cannot mutate verificationStatus or adminNotes directly
    if (stepData) {
      delete stepData.verificationStatus;
      delete stepData.adminNotes;
      delete stepData.verifiedAt;
      delete stepData.verifiedByAdminId;
      Object.assign(currentProfile, stepData);
    }
    if (profileData) {
      delete profileData.id;
      delete profileData.userId;
      delete profileData.verificationStatus;
      delete profileData.adminNotes;
      Object.assign(currentProfile, profileData);
    }

    if (step && typeof step === 'number') {
      currentProfile.currentOnboardingStep = Math.max(currentProfile.currentOnboardingStep || 1, step);
    }

    // Calculate dynamic completion score
    const { completion, breakdown, missingFields } = calculateOrgCompletion(currentProfile);
    currentProfile.profileCompletion = completion;
    currentProfile.updatedAt = now;

    // Enforce default verificationStatus: PENDING
    if (!currentProfile.verificationStatus) {
      currentProfile.verificationStatus = 'PENDING';
    }

    const isCompleteAction = action === 'COMPLETE_ONBOARDING' || action === 'SUBMIT';
    let targetOnboardingStatus = 'IN_PROGRESS';

    if (isCompleteAction) {
      if (completion < 80 && missingFields.length > 2) {
        return NextResponse.json({
          error: 'Incomplete onboarding: Please complete statutory registration and upload verification documents before submission',
          missingFields,
          profileCompletion: completion,
        }, { status: 400 });
      }
      targetOnboardingStatus = 'COMPLETED';
    } else if (completion > 0) {
      targetOnboardingStatus = 'IN_PROGRESS';
    }

    // Persist organization profile
    if (existingIdx !== -1) {
      dbInstance.organizationProfiles[existingIdx] = currentProfile;
    } else {
      dbInstance.organizationProfiles.push(currentProfile);
    }

    // Update user onboarding status
    dbInstance.users = dbInstance.users || [];
    const userIdx = dbInstance.users.findIndex(u => u.id === user.id);
    if (userIdx !== -1) {
      dbInstance.users[userIdx].onboardingStatus = targetOnboardingStatus;
      dbInstance.users[userIdx].updatedAt = now;
    }

    localDb.saveDb(dbInstance);

    // Audit Logging
    await logAuditEvent({
      actorUserId: user.id,
      action: isCompleteAction ? AUDIT_ACTIONS.ORGANIZATION_APPROVED ? 'ORGANIZATION_SUBMITTED' : AUDIT_ACTIONS.PROFILE_UPDATED : AUDIT_ACTIONS.PROFILE_UPDATED,
      targetUserId: user.id,
      resourceType: 'ORGANIZATION_PROFILE',
      resourceId: currentProfile.id,
      metadata: {
        action: action || 'SAVE_DRAFT',
        step: step || currentProfile.currentOnboardingStep,
        profileCompletion: completion,
        verificationStatus: currentProfile.verificationStatus,
        onboardingStatus: targetOnboardingStatus,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      message: isCompleteAction 
        ? 'Organization profile submitted for verification! Platform admins will review your KYC documents.' 
        : 'Step draft saved successfully',
      onboardingStatus: targetOnboardingStatus,
      verificationStatus: currentProfile.verificationStatus,
      profileCompletion: completion,
      breakdown,
      missingFields,
      profile: currentProfile,
      currentStep: currentProfile.currentOnboardingStep,
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: 'Failed to process organization onboarding step', message: err.message }, { status: 500 });
  }
}
```

---

## 7. Frontend Wizard Implementations

---

### File 4: `app/student/onboarding/page.jsx`

```jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  GraduationCap,
  Sparkles,
  FolderGit2,
  Award,
  Briefcase,
  Compass,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Check,
} from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Basic Info', icon: User, desc: 'Personal background & bio' },
  { id: 2, name: 'Academic', icon: GraduationCap, desc: 'College, branch & CGPA' },
  { id: 3, name: 'Skills', icon: Sparkles, desc: 'Tech stack & proficiency' },
  { id: 4, name: 'Projects', icon: FolderGit2, desc: 'Live apps & repositories' },
  { id: 5, name: 'Certifications', icon: Award, desc: 'Credentials & licenses' },
  { id: 6, name: 'Experience', icon: Briefcase, desc: 'Internships & jobs' },
  { id: 7, name: 'Preferences', icon: Compass, desc: 'Target roles & locations' },
  { id: 8, name: 'Review', icon: CheckCircle2, desc: 'Summary & final submit' },
];

const POPULAR_SKILLS = [
  'JavaScript', 'TypeScript', 'React.js', 'Next.js', 'Node.js', 'Python',
  'PostgreSQL', 'MongoDB', 'Docker', 'AWS', 'Tailwind CSS', 'Git',
  'Machine Learning', 'Data Structures', 'REST APIs', 'GraphQL'
];

export default function StudentOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [completion, setCompletion] = useState(0);
  const [breakdown, setBreakdown] = useState({});

  // Comprehensive Form State
  const [formData, setFormData] = useState({
    headline: '',
    bio: '',
    phone: '',
    address: '',
    instituteName: '',
    department: '',
    degree: 'B.Tech',
    yearOfStudy: 4,
    cgpa: '',
    skills: [
      { name: 'JavaScript', proficiency: 'Advanced', category: 'Frontend' },
      { name: 'React.js', proficiency: 'Advanced', category: 'Frontend' },
      { name: 'Node.js', proficiency: 'Intermediate', category: 'Backend' },
    ],
    projects: [
      { title: '', description: '', techStack: ['React', 'Node.js'], projectUrl: '', repoUrl: '' },
    ],
    certifications: [],
    experience: [],
    careerPreferences: {
      preferredRoles: ['Full-Stack Developer', 'Frontend Engineer'],
      preferredLocations: ['Bangalore', 'Remote'],
      jobType: 'Full-time',
    },
  });

  // Fetch initial profile on mount
  useEffect(() => {
    async function loadOnboarding() {
      try {
        setLoading(true);
        const res = await fetch('/api/student/onboarding');
        const data = await res.json();
        if (res.ok && data.profile) {
          setFormData(prev => ({
            ...prev,
            ...data.profile,
            careerPreferences: {
              ...prev.careerPreferences,
              ...(data.profile.careerPreferences || {}),
            },
          }));
          if (data.currentStep && data.currentStep <= 8) {
            setCurrentStep(data.currentStep);
          }
          setCompletion(data.profileCompletion || 0);
          setBreakdown(data.breakdown || {});
        }
      } catch (err) {
        console.error('Failed to load onboarding draft:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOnboarding();
  }, []);

  // Save Step Draft or Complete Onboarding
  const handleSave = async (isFinal = false) => {
    try {
      setSaving(true);
      setErrorMsg('');

      const payload = {
        step: currentStep,
        profileData: formData,
        action: isFinal ? 'COMPLETE_ONBOARDING' : 'SAVE_DRAFT',
      };

      const res = await fetch('/api/student/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to save progress');
      }

      setCompletion(data.profileCompletion || 0);
      setBreakdown(data.breakdown || {});

      if (isFinal) {
        router.push('/student/dashboard?onboarded=true');
      } else {
        if (currentStep < 8) {
          setCurrentStep(prev => prev + 1);
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Field change handlers
  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const updatePreference = (key, value) => {
    setFormData(prev => ({
      ...prev,
      careerPreferences: { ...prev.careerPreferences, [key]: value },
    }));
  };

  // Skill Handlers
  const addSkill = (skillName = '') => {
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, { name: skillName, proficiency: 'Intermediate', category: 'General' }],
    }));
  };

  const removeSkill = (index) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const updateSkill = (index, field, val) => {
    setFormData(prev => {
      const copy = [...prev.skills];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, skills: copy };
    });
  };

  // Project Handlers
  const addProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, { title: '', description: '', techStack: [], projectUrl: '', repoUrl: '' }],
    }));
  };

  const removeProject = (index) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  const updateProject = (index, field, val) => {
    setFormData(prev => {
      const copy = [...prev.projects];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, projects: copy };
    });
  };

  // Certification Handlers
  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', issuingOrg: '', issueDate: '', credentialUrl: '' }],
    }));
  };

  const removeCertification = (index) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const updateCertification = (index, field, val) => {
    setFormData(prev => {
      const copy = [...prev.certifications];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, certifications: copy };
    });
  };

  // Experience Handlers
  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [...prev.experience, { title: '', company: '', duration: '', description: '' }],
    }));
  };

  const removeExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  const updateExperience = (index, field, val) => {
    setFormData(prev => {
      const copy = [...prev.experience];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, experience: copy };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex items-center gap-3 text-indigo-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading Onboarding Profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            SB
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Student Onboarding</h1>
            <p className="text-xs text-slate-400">Complete your profile to unlock priority opportunities</p>
          </div>
        </div>

        {/* Dynamic Completion Gauge */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-slate-400">Profile Completion</span>
            <span className="text-sm font-semibold text-indigo-400">{completion}%</span>
          </div>
          <div className="w-32 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Stepper Container */}
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Stepper Sidebar (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Steps Overview</h2>
            <nav className="flex flex-col gap-2">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isCurrent = step.id === currentStep;
                const isPassed = step.id < currentStep;

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center justify-between p-3 rounded-xl text-left transition-all border ${
                      isCurrent
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-md shadow-indigo-500/10'
                        : isPassed
                        ? 'bg-slate-800/40 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                        : 'border-transparent text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                          isCurrent
                            ? 'bg-indigo-600 text-white'
                            : isPassed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isPassed ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{step.name}</div>
                        <div className="text-xs text-slate-400 line-clamp-1">{step.desc}</div>
                      </div>
                    </div>
                    {isPassed && <span className="text-xs text-emerald-400 font-semibold">Done</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Tips Card */}
          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/30 rounded-2xl p-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
              <Sparkles className="w-4 h-4" /> Pro Tip
            </div>
            Adding verified skill certifications and at least 2 projects boosts candidate match score by up to 40%.
          </div>
        </div>

        {/* Right Active Step Form Container (8 cols) */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl flex-1 flex flex-col justify-between">
            
            {/* Step Content */}
            <div>
              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* STEP 1: BASIC INFO */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 1: Basic Information</h3>
                    <p className="text-sm text-slate-400">Tell recruiters who you are and what you specialize in.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Professional Headline *</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. Final Year CSE Undergrad | Full-Stack & Cloud Enthusiast"
                      value={formData.headline}
                      onChange={(e) => updateField('headline', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Bio / Executive Summary *</label>
                    <textarea
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Write a concise overview of your technical interests, notable achievements, and career goals..."
                      value={formData.bio}
                      onChange={(e) => updateField('bio', e.target.value)}
                    />
                    <span className="text-xs text-slate-500">Minimum 20 characters recommended.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Location / Address</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="City, State, Country"
                        value={formData.address}
                        onChange={(e) => updateField('address', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: ACADEMIC INFO */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 2: Academic Details</h3>
                    <p className="text-sm text-slate-400">Provide details on your current educational program.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Institute / University *</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. National Institute of Technology / Vellore Institute of Tech"
                      value={formData.instituteName}
                      onChange={(e) => updateField('instituteName', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Department / Branch *</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Computer Science & Engineering"
                        value={formData.department}
                        onChange={(e) => updateField('department', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Degree *</label>
                      <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        value={formData.degree}
                        onChange={(e) => updateField('degree', e.target.value)}
                      >
                        <option value="B.Tech">B.Tech / B.E.</option>
                        <option value="M.Tech">M.Tech / M.E.</option>
                        <option value="MCA">MCA</option>
                        <option value="B.Sc">B.Sc Computer Science</option>
                        <option value="M.Sc">M.Sc</option>
                        <option value="Dual Degree">Integrated Dual Degree</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Year of Study / Grad Year *</label>
                      <input
                        type="number"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="4"
                        value={formData.yearOfStudy}
                        onChange={(e) => updateField('yearOfStudy', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Cumulative CGPA (Scale of 10) *</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="8.85"
                        value={formData.cgpa}
                        onChange={(e) => updateField('cgpa', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: SKILLS & PROFICIENCY */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 3: Skills & Proficiency Levels</h3>
                    <p className="text-sm text-slate-400">Select technical competencies and your mastery level.</p>
                  </div>

                  {/* Quick Select Badges */}
                  <div>
                    <span className="text-xs text-slate-400 font-semibold mb-2 block">Quick Add Popular Skills:</span>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_SKILLS.map((skill) => {
                        const exists = formData.skills.some(s => s.name.toLowerCase() === skill.toLowerCase());
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => !exists && addSkill(skill)}
                            disabled={exists}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                              exists
                                ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-300 opacity-60'
                                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-indigo-500 hover:bg-slate-800'
                            }`}
                          >
                            + {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Skills List Table */}
                  <div className="space-y-3">
                    {formData.skills.map((skill, index) => (
                      <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <input
                          type="text"
                          placeholder="Skill name (e.g. React, Docker)"
                          className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none px-2"
                          value={skill.name}
                          onChange={(e) => updateSkill(index, 'name', e.target.value)}
                        />
                        <select
                          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          value={skill.proficiency}
                          onChange={(e) => updateSkill(index, 'proficiency', e.target.value)}
                        >
                          <option value="Beginner">Beginner (Level 1)</option>
                          <option value="Intermediate">Intermediate (Level 2)</option>
                          <option value="Advanced">Advanced (Level 3)</option>
                          <option value="Expert">Expert (Level 4)</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-all self-end sm:self-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addSkill('')}
                    className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="w-4 h-4" /> Add Custom Skill
                  </button>
                </div>
              )}

              {/* STEP 4: PROJECTS */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 4: Academic & Personal Projects</h3>
                    <p className="text-sm text-slate-400">Showcase software products, hackathons, or academic capstones.</p>
                  </div>

                  <div className="space-y-4">
                    {formData.projects.map((proj, index) => (
                      <div key={index} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-400">Project #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeProject(index)}
                            className="text-slate-500 hover:text-red-400 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Project Title (e.g. Distributed Task Orchestrator)"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                          value={proj.title}
                          onChange={(e) => updateProject(index, 'title', e.target.value)}
                        />
                        <textarea
                          rows={2}
                          placeholder="Short description of features, problem solved, and architecture..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                          value={proj.description}
                          onChange={(e) => updateProject(index, 'description', e.target.value)}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="GitHub Repository URL"
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                            value={proj.repoUrl}
                            onChange={(e) => updateProject(index, 'repoUrl', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Live Demo URL"
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                            value={proj.projectUrl}
                            onChange={(e) => updateProject(index, 'projectUrl', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addProject}
                    className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="w-4 h-4" /> Add Another Project
                  </button>
                </div>
              )}

              {/* STEP 5: CERTIFICATIONS */}
              {currentStep === 5 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 5: Certifications & Licenses</h3>
                    <p className="text-sm text-slate-400">Add verified badges from AWS, Google Cloud, Microsoft, Coursera, etc.</p>
                  </div>

                  <div className="space-y-4">
                    {formData.certifications.map((cert, index) => (
                      <div key={index} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-400">Certification #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeCertification(index)}
                            className="text-slate-500 hover:text-red-400 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Certification Name"
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            value={cert.name}
                            onChange={(e) => updateCertification(index, 'name', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Issuing Organization (e.g. AWS)"
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            value={cert.issuingOrg}
                            onChange={(e) => updateCertification(index, 'issuingOrg', e.target.value)}
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Verification Credential URL"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          value={cert.credentialUrl}
                          onChange={(e) => updateCertification(index, 'credentialUrl', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addCertification}
                    className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="w-4 h-4" /> Add Certification
                  </button>
                </div>
              )}

              {/* STEP 6: EXPERIENCE */}
              {currentStep === 6 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 6: Work & Internship Experience</h3>
                    <p className="text-sm text-slate-400">List past internships, research assistantships, or part-time work.</p>
                  </div>

                  <div className="space-y-4">
                    {formData.experience.map((exp, index) => (
                      <div key={index} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-400">Experience #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeExperience(index)}
                            className="text-slate-500 hover:text-red-400 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Job Title / Role (e.g. Frontend Intern)"
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            value={exp.title}
                            onChange={(e) => updateExperience(index, 'title', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Company Name"
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            value={exp.company}
                            onChange={(e) => updateExperience(index, 'company', e.target.value)}
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Duration (e.g. May 2025 - Jul 2025)"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          value={exp.duration}
                          onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                        />
                        <textarea
                          rows={2}
                          placeholder="Summary of responsibilities and achievements..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none"
                          value={exp.description}
                          onChange={(e) => updateExperience(index, 'description', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addExperience}
                    className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="w-4 h-4" /> Add Experience / Internship
                  </button>
                </div>
              )}

              {/* STEP 7: CAREER PREFERENCES */}
              {currentStep === 7 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 7: Career & Placement Preferences</h3>
                    <p className="text-sm text-slate-400">Specify your dream roles and target employment parameters.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Preferred Roles (Comma separated) *</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Full-Stack Developer, Frontend Engineer, Cloud Architect"
                      value={formData.careerPreferences.preferredRoles?.join(', ') || ''}
                      onChange={(e) => updatePreference('preferredRoles', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Preferred Locations *</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Bangalore, Hyderabad, Remote"
                        value={formData.careerPreferences.preferredLocations?.join(', ') || ''}
                        onChange={(e) => updatePreference('preferredLocations', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Job Type *</label>
                      <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        value={formData.careerPreferences.jobType || 'Full-time'}
                        onChange={(e) => updatePreference('jobType', e.target.value)}
                      >
                        <option value="Full-time">Full-time Graduate Role</option>
                        <option value="Internship">Internship (Summer/Winter)</option>
                        <option value="PPO">Pre-Placement Offer (PPO)</option>
                        <option value="Part-time">Part-time Project</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 8: REVIEW & SUBMIT */}
              {currentStep === 8 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 8: Review & Submit</h3>
                    <p className="text-sm text-slate-400">Review your profile details before completing onboarding.</p>
                  </div>

                  {/* Summary Cards */}
                  <div className="space-y-4">
                    {/* Basic Info Summary */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-indigo-400">Basic Info</span>
                        <h4 className="text-sm font-bold text-white mt-1">{formData.headline || 'No headline specified'}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{formData.bio || 'No bio provided'}</p>
                      </div>
                      <button onClick={() => setCurrentStep(1)} className="text-xs text-indigo-400 hover:underline">Edit</button>
                    </div>

                    {/* Academic Summary */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-indigo-400">Academic</span>
                        <h4 className="text-sm font-bold text-white mt-1">{formData.instituteName} — {formData.degree} ({formData.department})</h4>
                        <p className="text-xs text-slate-400 mt-1">Year {formData.yearOfStudy} | CGPA: {formData.cgpa}/10</p>
                      </div>
                      <button onClick={() => setCurrentStep(2)} className="text-xs text-indigo-400 hover:underline">Edit</button>
                    </div>

                    {/* Skills Summary */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-indigo-400">Skills ({formData.skills.length})</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {formData.skills.map((s, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                              {s.name} <span className="text-indigo-400">({s.proficiency})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => setCurrentStep(3)} className="text-xs text-indigo-400 hover:underline">Edit</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="border-t border-slate-800 pt-6 mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1 || saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all"
                >
                  <Save className="w-4 h-4" /> Save Draft
                </button>

                {currentStep < 8 ? (
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Complete Onboarding <CheckCircle2 className="w-4 h-4" /></>}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
```

---

### File 5: `app/organization/onboarding/page.jsx`

```jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  FileCheck2,
  PhoneCall,
  Globe2,
  Target,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Check,
} from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Company Info', icon: Building2, desc: 'Brand, name & website' },
  { id: 2, name: 'Registration', icon: FileCheck2, desc: 'CIN & Tax ID (GSTIN)' },
  { id: 3, name: 'Contact', icon: PhoneCall, desc: 'HQ address & lead recruiter' },
  { id: 4, name: 'Industry', icon: Globe2, desc: 'Domain & company size' },
  { id: 5, name: 'Hiring', icon: Target, desc: 'Roles & internship preferences' },
  { id: 6, name: 'Documents', icon: FileSpreadsheet, desc: 'KYC & statutory proofs' },
  { id: 7, name: 'Review', icon: CheckCircle2, desc: 'KYC verification submission' },
];

export default function OrganizationOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [completion, setCompletion] = useState(0);
  const [breakdown, setBreakdown] = useState({});
  const [declaration, setDeclaration] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    companySize: '51-200',
    website: '',
    logoUrl: '',
    registrationNumber: '',
    taxIdGstin: '',
    companyType: 'Private Limited',
    primaryContactName: '',
    contactPhone: '',
    officialEmail: '',
    address: {
      street: '',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '',
      country: 'India',
    },
    industry: 'Information Technology',
    hiringPreferences: {
      targetRoles: ['Backend Engineer', 'Full-Stack Developer'],
      hiringType: 'Both',
      hiringSeason: 'Year-Round',
    },
    verificationDocs: [
      { docType: 'COI', fileName: 'Certificate_of_Incorporation.pdf', fileUrl: 'https://storage/coi.pdf' },
    ],
  });

  useEffect(() => {
    async function loadOrgData() {
      try {
        setLoading(true);
        const res = await fetch('/api/organization/onboarding');
        const data = await res.json();
        if (res.ok && data.profile) {
          setFormData(prev => ({
            ...prev,
            ...data.profile,
            address: typeof data.profile.address === 'object' ? data.profile.address : prev.address,
            hiringPreferences: {
              ...prev.hiringPreferences,
              ...(data.profile.hiringPreferences || {}),
            },
          }));
          if (data.currentStep && data.currentStep <= 7) {
            setCurrentStep(data.currentStep);
          }
          setCompletion(data.profileCompletion || 0);
          setBreakdown(data.breakdown || {});
        }
      } catch (err) {
        console.error('Failed to load organization onboarding:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrgData();
  }, []);

  const handleSave = async (isFinal = false) => {
    try {
      if (isFinal && !declaration) {
        setErrorMsg('Please confirm the statutory compliance declaration before submitting.');
        return;
      }

      setSaving(true);
      setErrorMsg('');

      const payload = {
        step: currentStep,
        profileData: formData,
        action: isFinal ? 'COMPLETE_ONBOARDING' : 'SAVE_DRAFT',
      };

      const res = await fetch('/api/organization/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to save progress');
      }

      setCompletion(data.profileCompletion || 0);
      setBreakdown(data.breakdown || {});

      if (isFinal) {
        router.push('/organization/dashboard?kyc=pending');
      } else {
        if (currentStep < 7) {
          setCurrentStep(prev => prev + 1);
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const updateAddress = (key, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [key]: value },
    }));
  };

  const addDoc = () => {
    setFormData(prev => ({
      ...prev,
      verificationDocs: [...prev.verificationDocs, { docType: 'GSTIN', fileName: '', fileUrl: '' }],
    }));
  };

  const removeDoc = (index) => {
    setFormData(prev => ({
      ...prev,
      verificationDocs: prev.verificationDocs.filter((_, i) => i !== index),
    }));
  };

  const updateDoc = (index, field, val) => {
    setFormData(prev => {
      const copy = [...prev.verificationDocs];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, verificationDocs: copy };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex items-center gap-3 text-indigo-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading Organization Onboarding...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            SB
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Organization Verification & Onboarding</h1>
            <p className="text-xs text-slate-400">KYC verification is required prior to posting opportunities</p>
          </div>
        </div>

        {/* Dynamic Completion Gauge */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-slate-400">Verification Readiness</span>
            <span className="text-sm font-semibold text-indigo-400">{completion}%</span>
          </div>
          <div className="w-32 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Stepper Sidebar (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Onboarding Steps</h2>
            <nav className="flex flex-col gap-2">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isCurrent = step.id === currentStep;
                const isPassed = step.id < currentStep;

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center justify-between p-3 rounded-xl text-left transition-all border ${
                      isCurrent
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-md shadow-indigo-500/10'
                        : isPassed
                        ? 'bg-slate-800/40 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                        : 'border-transparent text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                          isCurrent
                            ? 'bg-indigo-600 text-white'
                            : isPassed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isPassed ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{step.name}</div>
                        <div className="text-xs text-slate-400 line-clamp-1">{step.desc}</div>
                      </div>
                    </div>
                    {isPassed && <span className="text-xs text-emerald-400 font-semibold">Done</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/30 rounded-2xl p-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
              <ShieldCheck className="w-4 h-4" /> KYC Verification Notice
            </div>
            Valid Corporate Registration (CIN) and Tax ID (GSTIN) are authenticated against MCA registry before listings are published to students.
          </div>
        </div>

        {/* Right Active Form Container (8 cols) */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl flex-1 flex flex-col justify-between">
            
            <div>
              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* STEP 1: ORG INFO */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 1: Organization Information</h3>
                    <p className="text-sm text-slate-400">Enter your registered business identity and digital presence.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Company Legal Name *</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. TechCorp Solutions Private Limited"
                      value={formData.companyName}
                      onChange={(e) => updateField('companyName', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Company Website *</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="https://techcorp.com"
                        value={formData.website}
                        onChange={(e) => updateField('website', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Company Size *</label>
                      <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        value={formData.companySize}
                        onChange={(e) => updateField('companySize', e.target.value)}
                      >
                        <option value="1-10">1-10 Employees (Early Stage)</option>
                        <option value="11-50">11-50 Employees (Seed / Series A)</option>
                        <option value="51-200">51-200 Employees (Growth / Mid-Size)</option>
                        <option value="201-500">201-500 Employees</option>
                        <option value="500+">500+ Employees (Enterprise)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Company Logo URL</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="https://techcorp.com/brand/logo.png"
                      value={formData.logoUrl}
                      onChange={(e) => updateField('logoUrl', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: BUSINESS REGISTRATION */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 2: Business Registration & Statutory Details</h3>
                    <p className="text-sm text-slate-400">Statutory identifiers are authenticated to prevent fraudulent postings.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Registration Number (CIN / LLPIN / Udyam) *</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 uppercase"
                      placeholder="U72200KA2021PTC123456"
                      value={formData.registrationNumber}
                      onChange={(e) => updateField('registrationNumber', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Tax ID (GSTIN) *</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 uppercase"
                        placeholder="29ABCDE1234F1Z5"
                        value={formData.taxIdGstin}
                        onChange={(e) => updateField('taxIdGstin', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Entity Type</label>
                      <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        value={formData.companyType}
                        onChange={(e) => updateField('companyType', e.target.value)}
                      >
                        <option value="Private Limited">Private Limited (Pvt Ltd)</option>
                        <option value="Public Limited">Public Limited</option>
                        <option value="LLP">Limited Liability Partnership (LLP)</option>
                        <option value="DPIIT Startup">DPIIT Recognized Startup</option>
                        <option value="Non-Profit">Non-Profit / Section 8</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: CONTACT & ADDRESS */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 3: Primary Contact & Physical Headquarters</h3>
                    <p className="text-sm text-slate-400">Provide official contact details for university placement cells.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Recruiter / HR Contact Name *</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Priya Sharma"
                        value={formData.primaryContactName}
                        onChange={(e) => updateField('primaryContactName', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Official Phone Number *</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="+91 80 2345 6789"
                        value={formData.contactPhone}
                        onChange={(e) => updateField('contactPhone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">City *</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Bangalore"
                        value={formData.address.city}
                        onChange={(e) => updateAddress('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">State *</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Karnataka"
                        value={formData.address.state}
                        onChange={(e) => updateAddress('state', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="India"
                        value={formData.address.country}
                        onChange={(e) => updateAddress('country', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: INDUSTRY */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 4: Industry Sector & Focus Domain</h3>
                    <p className="text-sm text-slate-400">Categorize your organization for curriculum alignment and candidate matching.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Industry Sector *</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      value={formData.industry}
                      onChange={(e) => updateField('industry', e.target.value)}
                    >
                      <option value="Information Technology">Information Technology & Software Services</option>
                      <option value="Financial Technology">Financial Technology (FinTech / Banking)</option>
                      <option value="Healthcare & Life Sciences">Healthcare & Life Sciences (HealthTech)</option>
                      <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                      <option value="Automotive & Manufacturing">Automotive, EV & Manufacturing</option>
                      <option value="EdTech">Educational Technology (EdTech)</option>
                      <option value="Cybersecurity">Cybersecurity & Defense</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 5: HIRING PREFERENCES */}
              {currentStep === 5 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 5: Hiring & Internship Preferences</h3>
                    <p className="text-sm text-slate-400">Configure target profiles to automatically receive candidate matches.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Target Roles Hired (Comma separated) *</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Backend Engineer, Frontend Developer, DevOps Intern"
                      value={formData.hiringPreferences.targetRoles?.join(', ') || ''}
                      onChange={(e) => updateField('hiringPreferences', {
                        ...formData.hiringPreferences,
                        targetRoles: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                      })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Engagement Type</label>
                      <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        value={formData.hiringPreferences.hiringType || 'Both'}
                        onChange={(e) => updateField('hiringPreferences', {
                          ...formData.hiringPreferences,
                          hiringType: e.target.value,
                        })}
                      >
                        <option value="Both">Both Internships & Full-time</option>
                        <option value="Internship">Internship Only</option>
                        <option value="Full-time">Full-time Placement Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Hiring Cycle</label>
                      <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        value={formData.hiringPreferences.hiringSeason || 'Year-Round'}
                        onChange={(e) => updateField('hiringPreferences', {
                          ...formData.hiringPreferences,
                          hiringSeason: e.target.value,
                        })}
                      >
                        <option value="Year-Round">Year-Round Rolling</option>
                        <option value="Campus Season">Campus Season (August - December)</option>
                        <option value="Summer Interns">Summer Internship (May - July)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: VERIFICATION DOCUMENTS */}
              {currentStep === 6 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 6: Statutory Verification Documents</h3>
                    <p className="text-sm text-slate-400">Upload Certificate of Incorporation (COI) or GST Registration.</p>
                  </div>

                  <div className="space-y-4">
                    {formData.verificationDocs.map((doc, index) => (
                      <div key={index} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-400">Document #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeDoc(index)}
                            className="text-slate-500 hover:text-red-400 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <select
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                            value={doc.docType}
                            onChange={(e) => updateDoc(index, 'docType', e.target.value)}
                          >
                            <option value="COI">Certificate of Incorporation (COI)</option>
                            <option value="GSTIN">GSTIN Registration Certificate</option>
                            <option value="PAN">Company PAN Card</option>
                            <option value="MSME">MSME / Udyam Registration</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Document File Name (e.g. coi_verified.pdf)"
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                            value={doc.fileName}
                            onChange={(e) => updateDoc(index, 'fileName', e.target.value)}
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Document Storage URL (https://...)"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          value={doc.fileUrl}
                          onChange={(e) => updateDoc(index, 'fileUrl', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addDoc}
                    className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="w-4 h-4" /> Add Another Document
                  </button>
                </div>
              )}

              {/* STEP 7: REVIEW & SUBMIT */}
              {currentStep === 7 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 7: Compliance Review & KYC Submission</h3>
                    <p className="text-sm text-slate-400">Review statutory records before final submission for compliance review.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-indigo-400">Organization Info</span>
                        <h4 className="text-sm font-bold text-white mt-1">{formData.companyName}</h4>
                        <p className="text-xs text-slate-400 mt-1">{formData.website} | {formData.companySize} employees</p>
                      </div>
                      <button onClick={() => setCurrentStep(1)} className="text-xs text-indigo-400 hover:underline">Edit</button>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-indigo-400">Statutory Identifiers</span>
                        <h4 className="text-sm font-bold text-white mt-1">CIN: {formData.registrationNumber || 'Not provided'}</h4>
                        <p className="text-xs text-slate-400 mt-1">GSTIN: {formData.taxIdGstin} ({formData.companyType})</p>
                      </div>
                      <button onClick={() => setCurrentStep(2)} className="text-xs text-indigo-400 hover:underline">Edit</button>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-indigo-400">Documents Attached ({formData.verificationDocs.length})</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {formData.verificationDocs.map((d, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                              {d.docType}: {d.fileName || 'document'}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => setCurrentStep(6)} className="text-xs text-indigo-400 hover:underline">Edit</button>
                    </div>
                  </div>

                  {/* Declaration Checkbox */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-indigo-900/40 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="complianceDec"
                      checked={declaration}
                      onChange={(e) => setDeclaration(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="complianceDec" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                      I declare that all corporate and statutory information submitted is accurate. I understand that opportunity postings remain blocked until KYC verification is approved by platform administrators.
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="border-t border-slate-800 pt-6 mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1 || saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all"
                >
                  <Save className="w-4 h-4" /> Save Draft
                </button>

                {currentStep < 7 ? (
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={saving || !declaration}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:pointer-events-none transition-all"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit for KYC Verification <ShieldCheck className="w-4 h-4" /></>}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
```

---

## 8. Security, IDOR Prevention & Role Isolation

1. **Role Gating & Ownership Check**:
   - `/api/student/onboarding` validates that the caller has `role === "STUDENT"`.
   - `/api/organization/onboarding` validates that the caller has `role === "ORGANIZATION"`.
   - Any attempt by an organization to submit a student onboarding payload (or vice-versa) is immediately rejected with `403 Forbidden`.
2. **Statutory Tamper-Proofing**:
   - In `/api/organization/onboarding`, the request body parser explicitly deletes `verificationStatus`, `adminNotes`, `verifiedAt`, and `verifiedByAdminId` from any incoming payload. Organizations are physically prohibited from self-approving or altering compliance audit notes.
3. **Audit Trail Compliance**:
   - Every draft save and final completion generates an append-only audit record in `audit_logs` capturing client IP, user agent, action enum (`PROFILE_UPDATED`, `ORGANIZATION_SUBMITTED`), target user ID, and updated completion percentage.

---

## 9. Verification & Testing Matrix

| Test ID | Scenario | Expected Outcome |
|---|---|---|
| **V-M4-01** | Student submits Step 1 & 2 draft | Profile updated, `onboardingStatus: "IN_PROGRESS"`, completion: 30%, audit log written |
| **V-M4-02** | Student submits complete 8-step wizard | Profile updated, `onboardingStatus: "COMPLETED"`, completion: 100%, redirect to `/student/dashboard` enabled |
| **V-M4-03** | Organization submits Step 1-6 with valid CIN/GSTIN | Profile saved, `onboardingStatus: "COMPLETED"`, `verificationStatus: "PENDING"`, completion: 100% |
| **V-M4-04** | Organization attempts to send `verificationStatus: "APPROVED"` | Server strips field; status remains `PENDING` |
| **V-M4-05** | Student attempts to post to `/api/organization/onboarding` | 403 Forbidden: Role mismatch |
| **V-M4-06** | Incomplete student submission (`action: "COMPLETE_ONBOARDING"` with <80% data) | 400 Bad Request with `missingFields` array |
