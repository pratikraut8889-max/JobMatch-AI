import { z } from 'zod';

// ==========================================
// USER & AUTH TYPES
// ==========================================
export type JdInputMode = 'text' | 'url' | 'images';
export type ResumeInputMode = 'file' | 'text';

export interface ImageDataItem {
  data: string; // base64 string
  mimeType: string;
  name: string;
  size?: number;
}

export interface FileDataItem {
  data: string; // base64 string
  mimeType: string;
  name: string;
  size: number;
}

export type PipelineStepNumber = 1 | 2 | 3 | 4 | 5;

export interface PipelineProgress {
  currentStep: PipelineStepNumber;
  completedSteps: number[];
  stepLabel: string;
  isProcessing: boolean;
  error?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  hasConsented: boolean;
  analysesToday: number;
  emailsSentToday: number;
  lastEmailSentAt?: string;
  connectedGmail?: string;
  gmailConnectedAt?: string;
  gmailTokenExpired?: boolean;
}

// ==========================================
// RESUME TYPES & SCHEMAS
// ==========================================
export const ResumeExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  dates: z.string(),
  achievements: z.array(z.string()),
});

export const ResumeEducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  year: z.string().optional(),
});

export const ResumeProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()).default([]),
});

export const StructuredResumeSchema = z.object({
  name: z.string().default('Candidate'),
  contactInfo: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
  }).default({}),
  summary: z.string().default(''),
  skills: z.array(z.string()).default([]),
  experience: z.array(ResumeExperienceSchema).default([]),
  education: z.array(ResumeEducationSchema).default([]),
  projects: z.array(ResumeProjectSchema).default([]),
  certifications: z.array(z.string()).default([]),
  rawText: z.string().default(''),
});

export type StructuredResume = z.infer<typeof StructuredResumeSchema>;

export interface SavedResumeVersion {
  id: string;
  userId: string;
  title: string; // e.g. "Full-Stack", "Backend", "Data"
  structuredData: StructuredResume;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  updatedAt: string;
}

// ==========================================
// JOB DESCRIPTION (JD) ANALYSIS SCHEMA
// ==========================================
export const JdAnalysisSchema = z.object({
  job_title: z.string(),
  company_name: z.string(),
  location: z.string(),
  work_mode: z.enum(['Remote', 'Hybrid', 'On-site', 'Not specified']).default('Not specified'),
  employment_type: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship', 'Not specified']).default('Not specified'),
  seniority: z.string().default('Mid-Level'),
  salary_if_listed: z.string().default('Not listed'),
  required_skills: z.array(z.string()).default([]),
  nice_to_have_skills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  keywords_for_ATS: z.array(z.string()).default([]),
  contact_emails_found: z.array(z.string()).default([]),
  application_deadline: z.string().default('Not specified'),
  red_flags: z.array(z.string()).default([]),
  role_summary: z.string().default(''),
});

export type JdAnalysis = z.infer<typeof JdAnalysisSchema>;

// ==========================================
// COMPANY RESEARCH SCHEMA (Search Grounded)
// ==========================================
export const GroundingSourceSchema = z.object({
  title: z.string(),
  url: z.string(),
});

export const CompanyResearchSchema = z.object({
  company_name: z.string(),
  summary: z.string(),
  industry: z.string(),
  size: z.string().default('Not found'),
  headquarters: z.string().default('Not found'),
  products_services: z.array(z.string()).default([]),
  recent_news: z.array(z.string()).default([]),
  culture_values: z.string().default('Not found'),
  tech_stack: z.array(z.string()).default([]),
  competitors: z.array(z.string()).default([]),
  interview_reputation_signals: z.string().default('Not found'),
  source_links: z.array(GroundingSourceSchema).default([]),
  confidence_note: z.string().optional(),
  cached_at: z.string().optional(),
});

export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;

// ==========================================
// RESUME VS JD MATCH SCHEMA
// ==========================================
export const ScoreCategorySchema = z.object({
  name: z.string(),
  weight: z.number(), // percentage, e.g. 30
  score: z.number(), // 0 to 100
  reason: z.string(),
});

export const ResumeEditSuggestionSchema = z.object({
  target_section: z.string(),
  current_framing: z.string(),
  suggested_rewrite: z.string(),
  rationale: z.string(),
});

export const AtsKeywordCheckSchema = z.object({
  keyword: z.string(),
  status: z.enum(['present', 'missing']),
  context_found_or_tip: z.string(),
});

export const ResumeMatchSchema = z.object({
  overall_score: z.number().min(0).max(100),
  breakdown: z.object({
    skills_match: ScoreCategorySchema,
    experience_level: ScoreCategorySchema,
    keywords_ats: ScoreCategorySchema,
    education: ScoreCategorySchema,
    domain_fit: ScoreCategorySchema,
  }),
  matching_skills: z.array(z.string()).default([]),
  partially_matching_skills: z.array(z.string()).default([]),
  missing_skills: z.array(z.string()).default([]),
  top_strengths: z.array(z.string()).default([]),
  top_gaps: z.array(z.string()).default([]),
  resume_edit_suggestions: z.array(ResumeEditSuggestionSchema).default([]),
  ats_checklist: z.array(AtsKeywordCheckSchema).default([]),
});

export type ResumeMatch = z.infer<typeof ResumeMatchSchema>;

// ==========================================
// HR / RECRUITER CONTACT SCHEMA
// ==========================================
export const RecruiterContactSchema = z.object({
  name: z.string().default('Hiring Team'),
  role: z.string().default('Recruiter / Talent Partner'),
  email: z.string(),
  source_url: z.string().default(''),
  confidence_label: z.enum(['VERIFIED SOURCE', 'PATTERN GUESS']),
  hunter_status: z.enum(['valid', 'risky', 'invalid', 'not_checked']).default('not_checked'),
  notes: z.string().optional(),
});

export const RecruiterContactsResultSchema = z.object({
  contacts: z.array(RecruiterContactSchema).default([]),
  linkedin_connection_note: z.string(),
  general_application_advice: z.string(),
});

export type RecruiterContact = z.infer<typeof RecruiterContactSchema>;
export type RecruiterContactsResult = z.infer<typeof RecruiterContactsResultSchema>;

// ==========================================
// EMAIL GENERATOR SCHEMAS
// ==========================================
export const EmailDraftVariantSchema = z.object({
  subject: z.string(),
  body: z.string(),
  word_count: z.number(),
  company_fact_referenced: z.string(),
});

export const QualityCheckSchema = z.object({
  word_count: z.number(),
  is_ideal_length: z.boolean(),
  has_unfilled_placeholders: z.boolean(),
  missing_attachment_mention: z.boolean(),
  cliche_warnings: z.array(z.string()).default([]),
});

export const GeneratedEmailsSchema = z.object({
  formal: EmailDraftVariantSchema,
  friendly: EmailDraftVariantSchema,
  confident_concise: EmailDraftVariantSchema,
  cover_letter: EmailDraftVariantSchema,
  follow_up_email: EmailDraftVariantSchema,
});

export type GeneratedEmails = z.infer<typeof GeneratedEmailsSchema>;

// ==========================================
// FULL ANALYSIS RESULT
// ==========================================
export interface FullJobAnalysis {
  id: string;
  userId: string;
  resumeVersionId: string;
  jdAnalysis: JdAnalysis;
  companyResearch: CompanyResearch;
  resumeMatch: ResumeMatch;
  recruiterContacts: RecruiterContactsResult;
  emails: GeneratedEmails;
  createdAt: string;
}

// ==========================================
// KANBAN APPLICATION TRACKER
// ==========================================
export type KanbanStatus =
  | 'Saved'
  | 'Applied'
  | 'Follow-up due'
  | 'Interview'
  | 'Offer'
  | 'Rejected';

export interface TrackerApplication {
  id: string;
  userId: string;
  analysisId?: string;
  jobTitle: string;
  companyName: string;
  location?: string;
  salary?: string;
  status: KanbanStatus;
  appliedDate?: string;
  followUpDueDate?: string;
  lastContactedDate?: string;
  contactEmail?: string;
  contactName?: string;
  matchScore?: number;
  sentEmailSubject?: string;
  sentEmailBody?: string;
  sentMessageId?: string;
  notes?: string;
  resumeVersionUsed?: string;
  createdAt: string;
  updatedAt: string;
}
