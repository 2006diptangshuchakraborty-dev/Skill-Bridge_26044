"use client";

import React, { useEffect, useState } from "react";
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  FolderGit2,
  Pencil,
  Plus,
  Trash2,
  X,
  Save,
  BriefcaseBusiness,
} from "lucide-react";

import EvidenceBadge from "../../../components/shared/EvidenceBadge";
import ReputationBreakdown from "../../../components/reputation/ReputationBreakdown";

const emptySkill = {
  name: "",
  proficiencyLabel: "Intermediate",
  confidenceScore: 75,
  evidenceLevel: 1,
  evidence: "",
};

const emptyProject = {
  title: "",
  description: "",
  skillsUsed: [],
};

const emptyCertification = {
  title: "",
  issuer: "",
  issueDate: "",
};

const emptyExperience = {
  company: "",
  role: "",
  description: "",
  startDate: "",
  endDate: "",
};

/* -------------------------------------------------------------------------- */
/*                            HELPERS                                         */
/* -------------------------------------------------------------------------- */

function getInitialProfile() {
  return {
    fullName: "",
    email: "",
    phone: "",
    headline: "",
    bio: "",
    instituteName: "",
    department: "",
    degree: "",
    yearOfStudy: "",
    graduationYear: "",
    cgpa: "",
    githubURL: "",
    linkedinURL: "",
    skills: [],
    projects: [],
    certifications: [],
    experience: [],
    careerPreferences: {
      preferredRoles: [],
      preferredLocations: [],
      jobType: "Full-time",
    },
    profileCompletion: 0,
    currentOnboardingStep: 1,
  };
}

function normalizeProfile(profile, user) {
  const data = profile || {};

  return {
    ...getInitialProfile(),
    ...data,

    fullName:
      data.fullName ||
      user?.name ||
      "",

    email:
      data.email ||
      user?.email ||
      "",

    githubURL:
      data.githubURL ||
      data.githubUrl ||
      "",

    linkedinURL:
      data.linkedinURL ||
      data.linkedinUrl ||
      "",

    skills: Array.isArray(data.skills)
      ? data.skills
      : [],

    projects: Array.isArray(data.projects)
      ? data.projects
      : [],

    certifications: Array.isArray(
      data.certifications
    )
      ? data.certifications
      : [],

    experience: Array.isArray(
      data.experience
    )
      ? data.experience
      : [],

    careerPreferences:
      data.careerPreferences &&
      typeof data.careerPreferences === "object"
        ? data.careerPreferences
        : {
            preferredRoles: [],
            preferredLocations: [],
            jobType: "Full-time",
          },
  };
}

/* -------------------------------------------------------------------------- */
/*                         MAIN COMPONENT                                     */
/* -------------------------------------------------------------------------- */

export default function StudentProfilePage() {
  const [student, setStudent] = useState(null);

  const [form, setForm] = useState(
    getInitialProfile()
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ---------------------------------------------------------------------- */
  /*                         LOAD PROFILE                                   */
  /* ---------------------------------------------------------------------- */

  const loadStudent = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/profile/setup",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        const text = await response.text();

        console.error(
          "Profile API returned:",
          text.substring(0, 500)
        );

        throw new Error(
          `Profile API returned ${response.status}.`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load profile."
        );
      }

      if (!data.success) {
        throw new Error(
          data?.error ||
            "Failed to load profile."
        );
      }

      const normalized = normalizeProfile(
        data.profile,
        data.user
      );

      const studentData = {
        ...normalized,

        id:
          data.profile?.id ||
          null,

        userId:
          data.profile?.userId ||
          data.user?.id ||
          null,

        name:
          normalized.fullName ||
          data.user?.name ||
          "Student",

        email:
          normalized.email ||
          data.user?.email ||
          "",

        department:
          normalized.department || "",

        year:
          normalized.yearOfStudy || "",

        semester:
          normalized.semester || "",

        institute:
          normalized.instituteName || "",

        skills: normalized.skills,

        projects: normalized.projects,

        certifications:
          normalized.certifications,

        experience:
          normalized.experience,
      };

      setStudent(studentData);
      setForm(normalized);
    } catch (err) {
      console.error(
        "Error loading student profile:",
        err
      );

      setError(
        err?.message ||
          "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudent();
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                           FORM UPDATE                                  */
  /* ---------------------------------------------------------------------- */

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /* ---------------------------------------------------------------------- */
  /*                           SKILLS                                       */
  /* ---------------------------------------------------------------------- */

  const addSkill = () => {
    setForm((previous) => ({
      ...previous,
      skills: [
        ...previous.skills,
        {
          ...emptySkill,
        },
      ],
    }));
  };

  const updateSkill = (
    index,
    field,
    value
  ) => {
    setForm((previous) => {
      const skills = [...previous.skills];

      skills[index] = {
        ...skills[index],
        [field]: value,
      };

      return {
        ...previous,
        skills,
      };
    });
  };

  const removeSkill = (index) => {
    setForm((previous) => ({
      ...previous,
      skills: previous.skills.filter(
        (_, i) => i !== index
      ),
    }));
  };

  /* ---------------------------------------------------------------------- */
  /*                           PROJECTS                                     */
  /* ---------------------------------------------------------------------- */

  const addProject = () => {
    setForm((previous) => ({
      ...previous,
      projects: [
        ...previous.projects,
        {
          ...emptyProject,
        },
      ],
    }));
  };

  const updateProject = (
    index,
    field,
    value
  ) => {
    setForm((previous) => {
      const projects = [
        ...previous.projects,
      ];

      projects[index] = {
        ...projects[index],
        [field]: value,
      };

      return {
        ...previous,
        projects,
      };
    });
  };

  const removeProject = (index) => {
    setForm((previous) => ({
      ...previous,
      projects: previous.projects.filter(
        (_, i) => i !== index
      ),
    }));
  };

  /* ---------------------------------------------------------------------- */
  /*                         CERTIFICATIONS                                 */
  /* ---------------------------------------------------------------------- */

  const addCertification = () => {
    setForm((previous) => ({
      ...previous,
      certifications: [
        ...previous.certifications,
        {
          ...emptyCertification,
        },
      ],
    }));
  };

  const updateCertification = (
    index,
    field,
    value
  ) => {
    setForm((previous) => {
      const certifications = [
        ...previous.certifications,
      ];

      certifications[index] = {
        ...certifications[index],
        [field]: value,
      };

      return {
        ...previous,
        certifications,
      };
    });
  };

  const removeCertification = (
    index
  ) => {
    setForm((previous) => ({
      ...previous,
      certifications:
        previous.certifications.filter(
          (_, i) => i !== index
        ),
    }));
  };

  /* ---------------------------------------------------------------------- */
  /*                           EXPERIENCE                                   */
  /* ---------------------------------------------------------------------- */

  const addExperience = () => {
    setForm((previous) => ({
      ...previous,
      experience: [
        ...previous.experience,
        {
          ...emptyExperience,
        },
      ],
    }));
  };

  const updateExperience = (
    index,
    field,
    value
  ) => {
    setForm((previous) => {
      const experience = [
        ...previous.experience,
      ];

      experience[index] = {
        ...experience[index],
        [field]: value,
      };

      return {
        ...previous,
        experience,
      };
    });
  };

  const removeExperience = (
    index
  ) => {
    setForm((previous) => ({
      ...previous,
      experience:
        previous.experience.filter(
          (_, i) => i !== index
        ),
    }));
  };

  /* ---------------------------------------------------------------------- */
  /*                             SAVE                                       */
  /* ---------------------------------------------------------------------- */

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      /*
       * Do NOT send:
       *
       * id
       * userId
       * role
       *
       * The server gets those from Better Auth.
       */

      const payload = {
        action: "SAVE_DRAFT",

        profileData: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          headline: form.headline,
          bio: form.bio,
          instituteName:
            form.instituteName,
          department: form.department,
          degree: form.degree,
          yearOfStudy:
            form.yearOfStudy,
          graduationYear:
            form.graduationYear
              ? Number(form.graduationYear)
              : null,
          cgpa:
            form.cgpa === ""
              ? null
              : Number(form.cgpa),
          githubURL: form.githubURL,
          linkedinURL:
            form.linkedinURL,

          skills: form.skills,

          projects: form.projects,

          certifications:
            form.certifications,

          experience:
            form.experience,

          careerPreferences:
            form.careerPreferences,

          currentOnboardingStep:
            form.currentOnboardingStep || 1,
        },
      };

      const response = await fetch(
        "/api/profile/setup",
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify(payload),
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        const text = await response.text();

        console.error(
          "Save API returned:",
          text.substring(0, 500)
        );

        throw new Error(
          `Server returned ${response.status} instead of JSON.`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Failed to save profile."
        );
      }

      if (!data.success) {
        throw new Error(
          data?.error ||
            "Failed to save profile."
        );
      }

      const savedProfile =
        normalizeProfile(
          data.profile,
          student
        );

      setForm(savedProfile);

      setStudent((previous) => ({
        ...previous,

        ...savedProfile,

        id:
          data.profile?.id ||
          previous?.id ||
          null,

        userId:
          data.profile?.userId ||
          previous?.userId ||
          null,

        name:
          savedProfile.fullName ||
          previous?.name ||
          "Student",

        email:
          savedProfile.email ||
          previous?.email ||
          "",

        department:
          savedProfile.department ||
          "",

        institute:
          savedProfile.instituteName ||
          "",

        year:
          savedProfile.yearOfStudy ||
          "",

        skills:
          savedProfile.skills,

        projects:
          savedProfile.projects,

        certifications:
          savedProfile.certifications,

        experience:
          savedProfile.experience,
      }));

      setEditing(false);

      setSuccess(
        "Profile saved successfully."
      );

      /*
       * Tell other components that the profile
       * has changed.
       */
      window.dispatchEvent(
        new Event(
          "sih_persona_changed"
        )
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Save profile error:",
        err
      );

      setError(
        err?.message ||
          "Unable to save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /*                           CANCEL                                       */
  /* ---------------------------------------------------------------------- */

  const cancelEditing = () => {
    if (student) {
      setForm(
        normalizeProfile(
          student,
          student
        )
      );
    }

    setEditing(false);
    setError("");
  };

  /* ---------------------------------------------------------------------- */
  /*                             LOADING                                    */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 font-mono text-xs">
        Loading your profile...
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /*                              ERROR                                     */
  /* ---------------------------------------------------------------------- */

  if (error && !student) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="bg-slate-900 border border-red-900/50 rounded-3xl p-8 text-center">
          <p className="text-red-400 text-sm">
            {error}
          </p>

          <button
            onClick={loadStudent}
            className="mt-5 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="py-16 text-center text-slate-400">
        Student profile not found.
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /*                              PAGE                                      */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">

      {/* ================================================================ */}
      {/* ALERTS                                                           */}
      {/* ================================================================ */}

      {error && (
        <div className="bg-red-950/40 border border-red-900/50 text-red-300 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 rounded-xl px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

          <div className="flex items-center gap-5">

            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-3xl">

              {(form.fullName ||
                student.name ||
                "S")
                .charAt(0)
                .toUpperCase()}

            </div>

            <div>

              <div className="flex items-center gap-3 flex-wrap">

                <h1 className="text-2xl font-bold text-slate-100">
                  {form.fullName ||
                    student.name}
                </h1>

                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Student
                </span>

              </div>

              <p className="text-xs text-slate-400 mt-2">
                {form.department ||
                  "Department not specified"}

                {form.yearOfStudy && (
                  <>
                    {" • "}
                    Year{" "}
                    {form.yearOfStudy}
                  </>
                )}

                {form.instituteName && (
                  <>
                    {" • "}
                    {form.instituteName}
                  </>
                )}
              </p>

              <p className="text-xs font-mono text-slate-500 mt-1">
                {form.email}
              </p>

            </div>

          </div>

          <div className="flex gap-2">

            {!editing ? (
              <button
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setEditing(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition"
              >
                <Pencil size={16} />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={cancelEditing}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm"
                >
                  <X size={16} />
                  Cancel
                </button>

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm"
                >
                  <Save size={16} />

                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </>
            )}

          </div>

        </div>

      </div>

      {/* ================================================================ */}
      {/* PERSONAL INFORMATION                                             */}
      {/* ================================================================ */}

      <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">

        <h2 className="text-lg font-bold text-slate-100 mb-5 flex items-center gap-2">
          <BriefcaseBusiness className="text-teal-400" />
          Personal Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Field
            label="Full Name"
            value={form.fullName}
            editing={editing}
            onChange={(value) =>
              updateField(
                "fullName",
                value
              )
            }
          />

          <Field
            label="Email"
            value={form.email}
            editing={editing}
            onChange={(value) =>
              updateField(
                "email",
                value
              )
            }
            type="email"
          />

          <Field
            label="Phone"
            value={form.phone}
            editing={editing}
            onChange={(value) =>
              updateField(
                "phone",
                value
              )
            }
          />

          <Field
            label="Headline"
            value={form.headline}
            editing={editing}
            onChange={(value) =>
              updateField(
                "headline",
                value
              )
            }
          />

          <Field
            label="Institute"
            value={
              form.instituteName
            }
            editing={editing}
            onChange={(value) =>
              updateField(
                "instituteName",
                value
              )
            }
          />

          <Field
            label="Department"
            value={form.department}
            editing={editing}
            onChange={(value) =>
              updateField(
                "department",
                value
              )
            }
          />

          <Field
            label="Degree"
            value={form.degree}
            editing={editing}
            onChange={(value) =>
              updateField(
                "degree",
                value
              )
            }
          />

          <Field
            label="Year of Study"
            value={form.yearOfStudy}
            editing={editing}
            onChange={(value) =>
              updateField(
                "yearOfStudy",
                value
              )
            }
          />

          <Field
            label="Graduation Year"
            value={form.graduationYear}
            editing={editing}
            onChange={(value) =>
              updateField(
                "graduationYear",
                value
              )
            }
            type="number"
          />

          <Field
            label="CGPA"
            value={form.cgpa}
            editing={editing}
            onChange={(value) =>
              updateField(
                "cgpa",
                value
              )
            }
            type="number"
            step="0.01"
          />

          <Field
            label="GitHub URL"
            value={form.githubURL}
            editing={editing}
            onChange={(value) =>
              updateField(
                "githubURL",
                value
              )
            }
          />

          <Field
            label="LinkedIn URL"
            value={form.linkedinURL}
            editing={editing}
            onChange={(value) =>
              updateField(
                "linkedinURL",
                value
              )
            }
          />

        </div>

        <div className="mt-5">
          <Field
            label="Bio"
            value={form.bio}
            editing={editing}
            onChange={(value) =>
              updateField(
                "bio",
                value
              )
            }
            textarea
          />
        </div>

      </section>

      {/* ================================================================ */}
      {/* SKILLS                                                           */}
      {/* ================================================================ */}

      <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">

        <div className="flex items-center justify-between border-b border-slate-800 pb-4">

          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" />
              Skills
            </h2>

            <p className="text-xs text-slate-400 mt-1">
              Add your skills and evidence.
            </p>
          </div>

          {editing && (
            <button
              onClick={addSkill}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold"
            >
              <Plus size={15} />
              Add Skill
            </button>
          )}

        </div>

        <div className="space-y-4 mt-5">

          {form.skills.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">
              No skills added yet.
            </p>
          )}

          {form.skills.map(
            (skill, index) => (

              <div
                key={index}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
              >

                {editing ? (

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <Input
                      label="Skill Name"
                      value={
                        skill.name || ""
                      }
                      onChange={(value) =>
                        updateSkill(
                          index,
                          "name",
                          value
                        )
                      }
                    />

                    <Select
                      label="Proficiency"
                      value={
                        skill.proficiencyLabel ||
                        "Intermediate"
                      }
                      options={[
                        "Beginner",
                        "Intermediate",
                        "Advanced",
                        "Expert",
                      ]}
                      onChange={(value) =>
                        updateSkill(
                          index,
                          "proficiencyLabel",
                          value
                        )
                      }
                    />

                    <Input
                      label="Confidence Score"
                      type="number"
                      min="0"
                      max="100"
                      value={
                        skill.confidenceScore ??
                        75
                      }
                      onChange={(value) =>
                        updateSkill(
                          index,
                          "confidenceScore",
                          Number(value)
                        )
                      }
                    />

                    <Select
                      label="Evidence Level"
                      value={String(
                        skill.evidenceLevel ||
                          1
                      )}
                      options={[
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                      ]}
                      onChange={(value) =>
                        updateSkill(
                          index,
                          "evidenceLevel",
                          Number(value)
                        )
                      }
                    />

                    <div className="md:col-span-2">
                      <Input
                        label="Evidence"
                        value={
                          skill.evidence ||
                          ""
                        }
                        onChange={(value) =>
                          updateSkill(
                            index,
                            "evidence",
                            value
                          )
                        }
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end">

                      <button
                        onClick={() =>
                          removeSkill(
                            index
                          )
                        }
                        className="text-red-400 hover:text-red-300 text-xs inline-flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Remove Skill
                      </button>

                    </div>

                  </div>

                ) : (

                  <div className="flex items-center justify-between">

                    <div>
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <CheckCircle2
                          size={16}
                          className="text-emerald-400"
                        />
                        {skill.name ||
                          "Unnamed Skill"}
                      </div>

                      <p className="text-xs text-slate-500 mt-1">
                        {skill.proficiencyLabel ||
                          "Intermediate"}{" "}
                        • Confidence{" "}
                        {skill.confidenceScore ??
                          75}
                        /100
                      </p>
                    </div>

                    <EvidenceBadge
                      level={
                        Number(
                          skill.evidenceLevel
                        ) || 1
                      }
                    />

                  </div>

                )}

              </div>

            )
          )}

        </div>

      </section>

      {/* ================================================================ */}
      {/* PROJECTS                                                         */}
      {/* ================================================================ */}

      <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">

        <div className="flex items-center justify-between border-b border-slate-800 pb-4">

          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FolderGit2 className="text-teal-400" />
            Projects
          </h2>

          {editing && (
            <button
              onClick={addProject}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold"
            >
              <Plus size={15} />
              Add Project
            </button>
          )}

        </div>

        <div className="space-y-4 mt-5">

          {form.projects.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">
              No projects added yet.
            </p>
          )}

          {form.projects.map(
            (project, index) => (

              <div
                key={index}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
              >

                {editing ? (

                  <div className="space-y-3">

                    <Input
                      label="Project Title"
                      value={
                        project.title ||
                        ""
                      }
                      onChange={(value) =>
                        updateProject(
                          index,
                          "title",
                          value
                        )
                      }
                    />

                    <Field
                      label="Description"
                      value={
                        project.description ||
                        ""
                      }
                      editing
                      onChange={(value) =>
                        updateProject(
                          index,
                          "description",
                          value
                        )
                      }
                      textarea
                    />

                    <Input
                      label="Technologies"
                      value={
                        Array.isArray(
                          project.skillsUsed
                        )
                          ? project.skillsUsed.join(
                              ", "
                            )
                          : ""
                      }
                      onChange={(value) =>
                        updateProject(
                          index,
                          "skillsUsed",
                          value
                            .split(",")
                            .map(
                              (item) =>
                                item.trim()
                            )
                            .filter(Boolean)
                        )
                      }
                    />

                    <button
                      onClick={() =>
                        removeProject(
                          index
                        )
                      }
                      className="text-red-400 text-xs inline-flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Remove Project
                    </button>

                  </div>

                ) : (

                  <>
                    <h3 className="font-bold text-slate-200">
                      {project.title ||
                        "Untitled Project"}
                    </h3>

                    <p className="text-xs text-slate-400 mt-1">
                      {project.description ||
                        "No description"}
                    </p>

                    {project.skillsUsed?.length >
                      0 && (
                      <p className="text-[10px] text-emerald-400 font-mono mt-2">
                        Tech:{" "}
                        {project.skillsUsed.join(
                          ", "
                        )}
                      </p>
                    )}
                  </>

                )}

              </div>

            )
          )}

        </div>

      </section>

      {/* ================================================================ */}
      {/* CERTIFICATIONS                                                   */}
      {/* ================================================================ */}

      <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">

        <div className="flex items-center justify-between border-b border-slate-800 pb-4">

          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Award className="text-purple-400" />
            Certifications
          </h2>

          {editing && (
            <button
              onClick={addCertification}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold"
            >
              <Plus size={15} />
              Add Certification
            </button>
          )}

        </div>

        <div className="space-y-4 mt-5">

          {form.certifications.length ===
            0 && (
            <p className="text-sm text-slate-500 text-center py-6">
              No certifications added yet.
            </p>
          )}

          {form.certifications.map(
            (cert, index) => (

              <div
                key={index}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
              >

                {editing ? (

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <Input
                      label="Certification"
                      value={
                        cert.title || ""
                      }
                      onChange={(value) =>
                        updateCertification(
                          index,
                          "title",
                          value
                        )
                      }
                    />

                    <Input
                      label="Issuer"
                      value={
                        cert.issuer || ""
                      }
                      onChange={(value) =>
                        updateCertification(
                          index,
                          "issuer",
                          value
                        )
                      }
                    />

                    <Input
                      label="Issue Date"
                      type="date"
                      value={
                        cert.issueDate ||
                        ""
                      }
                      onChange={(value) =>
                        updateCertification(
                          index,
                          "issueDate",
                          value
                        )
                      }
                    />

                    <div className="flex items-end">

                      <button
                        onClick={() =>
                          removeCertification(
                            index
                          )
                        }
                        className="text-red-400 text-xs inline-flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>

                    </div>

                  </div>

                ) : (

                  <>
                    <h3 className="font-bold text-slate-200">
                      {cert.title ||
                        "Certification"}
                    </h3>

                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>
                        {cert.issuer ||
                          ""}
                      </span>

                      <span>
                        {cert.issueDate ||
                          ""}
                      </span>
                    </div>
                  </>

                )}

              </div>

            )
          )}

        </div>

      </section>

      {/* ================================================================ */}
      {/* EXPERIENCE                                                       */}
      {/* ================================================================ */}

      <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">

        <div className="flex items-center justify-between border-b border-slate-800 pb-4">

          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BriefcaseBusiness className="text-blue-400" />
            Experience
          </h2>

          {editing && (
            <button
              onClick={addExperience}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold"
            >
              <Plus size={15} />
              Add Experience
            </button>
          )}

        </div>

        <div className="space-y-4 mt-5">

          {form.experience.length ===
            0 && (
            <p className="text-sm text-slate-500 text-center py-6">
              No experience added yet.
            </p>
          )}

          {form.experience.map(
            (item, index) => (

              <div
                key={index}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
              >

                {editing ? (

                  <div className="space-y-3">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                      <Input
                        label="Company"
                        value={
                          item.company ||
                          ""
                        }
                        onChange={(value) =>
                          updateExperience(
                            index,
                            "company",
                            value
                          )
                        }
                      />

                      <Input
                        label="Role"
                        value={
                          item.role || ""
                        }
                        onChange={(value) =>
                          updateExperience(
                            index,
                            "role",
                            value
                          )
                        }
                      />

                      <Input
                        label="Start Date"
                        type="date"
                        value={
                          item.startDate ||
                          ""
                        }
                        onChange={(value) =>
                          updateExperience(
                            index,
                            "startDate",
                            value
                          )
                        }
                      />

                      <Input
                        label="End Date"
                        type="date"
                        value={
                          item.endDate ||
                          ""
                        }
                        onChange={(value) =>
                          updateExperience(
                            index,
                            "endDate",
                            value
                          )
                        }
                      />

                    </div>

                    <Field
                      label="Description"
                      value={
                        item.description ||
                        ""
                      }
                      editing
                      onChange={(value) =>
                        updateExperience(
                          index,
                          "description",
                          value
                        )
                      }
                      textarea
                    />

                    <button
                      onClick={() =>
                        removeExperience(
                          index
                        )
                      }
                      className="text-red-400 text-xs inline-flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Remove Experience
                    </button>

                  </div>

                ) : (

                  <>
                    <h3 className="font-bold text-slate-200">
                      {item.role ||
                        "Experience"}
                    </h3>

                    <p className="text-xs text-emerald-400 mt-1">
                      {item.company || ""}
                    </p>

                    <p className="text-xs text-slate-400 mt-2">
                      {item.description ||
                        ""}
                    </p>
                  </>

                )}

              </div>
            )
          )}

        </div>

      </section>

      {/* ================================================================ */}
      {/* REPUTATION                                                       */}
      {/* ================================================================ */}

      {student.id && (
        <ReputationBreakdown
          targetRole="STUDENT"
          targetEntityId={
            student.id
          }
          targetUserId={
            student.userId ||
            student.id
          }
          entityName={
            form.fullName ||
            student.name
          }
        />
      )}

    </div>
  );
}

/* ========================================================================== */
/*                                FIELD                                      */
/* ========================================================================== */

function Field({
  label,
  value,
  editing,
  onChange,
  textarea = false,
  type = "text",
  step,
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-500 mb-1.5">
        {label}
      </label>

      {editing ? (
        textarea ? (
          <textarea
            value={value ?? ""}
            onChange={(event) =>
              onChange(event.target.value)
            }
            rows={4}
            className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 outline-none rounded-xl px-3 py-2.5 text-sm text-slate-200 resize-none"
          />
        ) : (
          <input
            type={type}
            step={step}
            value={value ?? ""}
            onChange={(event) =>
              onChange(event.target.value)
            }
            className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 outline-none rounded-xl px-3 py-2.5 text-sm text-slate-200"
          />
        )
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 min-h-[42px]">
          {value || "Not provided"}
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/*                                 INPUT                                      */
/* ========================================================================== */

function Input({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-500 mb-1.5">
        {label}
      </label>

      <input
        type={type}
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 outline-none rounded-xl px-3 py-2.5 text-sm text-slate-200"
      />
    </div>
  );
}

/* ========================================================================== */
/*                                 SELECT                                     */
/* ========================================================================== */

function Select({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-500 mb-1.5">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 outline-none rounded-xl px-3 py-2.5 text-sm text-slate-200"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
