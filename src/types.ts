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

export interface Step1JdAnalysis {
  jobTitle: string;
  companyName: string;
  location: string;
  seniority: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  responsibilities: string[];
  contactsFoundInJd: string[];
  roleSummary: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface Step2CompanyResearch {
  companyName: string;
  companyOverview: string;
  companySize: string;
  productsAndServices: string[];
  recentNews: string[];
  companyCulture: string;
  techStack: string[];
  sourceLinks: GroundingSource[];
}

export interface ResumeImprovementSuggestion {
  title: string;
  detail: string;
  concreteAction: string;
}

export interface Step3ResumeComparison {
  matchScore: number; // 0 to 100
  scoreExplanation: string;
  matchingSkills: string[];
  missingSkills: string[];
  candidateStrengths: string[];
  resumeImprovementSuggestions: ResumeImprovementSuggestion[];
}

export interface VerifiedContact {
  name?: string;
  email: string;
  role?: string;
  source: string;
}

export interface GuessedEmailPattern {
  pattern: string;
  example: string;
  status: 'UNVERIFIED GUESS';
  rationale: string;
}

export interface Step4RecruiterContacts {
  verifiedContacts: VerifiedContact[];
  guessedEmailPattern?: GuessedEmailPattern;
  recommendations: string[];
}

export interface EmailDraft {
  subject: string;
  body: string;
  companyFactUsed: string;
  wordCount: number;
}

export interface Step5EmailDrafts {
  formal: EmailDraft;
  friendly: EmailDraft;
}

export interface FullAnalysisResult {
  jdAnalysis: Step1JdAnalysis;
  companyResearch: Step2CompanyResearch;
  resumeComparison: Step3ResumeComparison;
  recruiterContacts: Step4RecruiterContacts;
  emailDrafts: Step5EmailDrafts;
  analyzedAt: string;
}

export type PipelineStepNumber = 1 | 2 | 3 | 4 | 5;

export interface PipelineProgress {
  currentStep: PipelineStepNumber;
  completedSteps: number[];
  stepLabel: string;
  isProcessing: boolean;
  error?: string;
}
