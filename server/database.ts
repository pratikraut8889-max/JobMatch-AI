import fs from 'fs';
import path from 'path';
import {
  UserProfile,
  SavedResumeVersion,
  CompanyResearch,
  FullJobAnalysis,
  TrackerApplication,
} from '../shared/types';

interface SentEmailRecord {
  id: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  messageId: string;
  sentAt: string;
}

interface DatabaseSchema {
  users: Record<string, UserProfile>;
  userTokens: Record<string, string>; // Encrypted refresh token per userId
  resumes: Record<string, SavedResumeVersion[]>; // userId -> versions (max 3)
  companyCache: Record<string, { data: CompanyResearch; cachedAt: number }>;
  analyses: Record<string, FullJobAnalysis[]>; // userId -> analyses
  tracker: Record<string, TrackerApplication[]>; // userId -> applications
  sentEmails: SentEmailRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

class DatabaseStore {
  private data: DatabaseSchema = {
    users: {},
    userTokens: {},
    resumes: {},
    companyCache: {},
    analyses: {},
    tracker: {},
    sentEmails: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('Could not read persistent DB file, using memory store:', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database file:', err);
    }
  }

  // --- Users & Consent ---
  getUser(userId: string): UserProfile {
    if (!this.data.users[userId]) {
      this.data.users[userId] = {
        id: userId,
        email: `${userId}@user.local`,
        name: 'Job Seeker',
        createdAt: new Date().toISOString(),
        hasConsented: false,
        analysesToday: 0,
        emailsSentToday: 0,
      };
      this.save();
    }
    return this.data.users[userId];
  }

  updateUserConsent(userId: string, consented: boolean): UserProfile {
    const user = this.getUser(userId);
    user.hasConsented = consented;
    this.save();
    return user;
  }

  incrementAnalysisCount(userId: string): number {
    const user = this.getUser(userId);
    user.analysesToday = (user.analysesToday || 0) + 1;
    this.save();
    return user.analysesToday;
  }

  incrementEmailCount(userId: string): number {
    const user = this.getUser(userId);
    user.emailsSentToday = (user.emailsSentToday || 0) + 1;
    user.lastEmailSentAt = new Date().toISOString();
    this.save();
    return user.emailsSentToday;
  }

  // --- OAuth Refresh Tokens & Connected Gmail ---
  saveEncryptedToken(userId: string, encryptedToken: string) {
    this.data.userTokens[userId] = encryptedToken;
    this.save();
  }

  getEncryptedToken(userId: string): string | undefined {
    return this.data.userTokens[userId];
  }

  deleteEncryptedToken(userId: string) {
    delete this.data.userTokens[userId];
    this.save();
  }

  setConnectedGmail(userId: string, email: string) {
    const user = this.getUser(userId);
    user.connectedGmail = email;
    user.gmailConnectedAt = new Date().toISOString();
    user.gmailTokenExpired = false;
    this.save();
    return user;
  }

  setGmailTokenExpired(userId: string, expired: boolean) {
    const user = this.getUser(userId);
    user.gmailTokenExpired = expired;
    this.save();
    return user;
  }

  disconnectUserGmail(userId: string) {
    const user = this.getUser(userId);
    user.connectedGmail = undefined;
    user.gmailConnectedAt = undefined;
    user.gmailTokenExpired = false;
    delete this.data.userTokens[userId];
    this.save();
    return user;
  }

  // --- Resumes (Max 3 per user) ---
  getUserResumes(userId: string): SavedResumeVersion[] {
    return this.data.resumes[userId] || [];
  }

  saveResume(userId: string, resume: SavedResumeVersion): SavedResumeVersion[] {
    if (!this.data.resumes[userId]) {
      this.data.resumes[userId] = [];
    }

    const existingIndex = this.data.resumes[userId].findIndex((r) => r.id === resume.id);
    if (existingIndex >= 0) {
      this.data.resumes[userId][existingIndex] = resume;
    } else {
      // Max 3 versions limit
      if (this.data.resumes[userId].length >= 3) {
        throw new Error('Maximum of 3 resume versions reached. Please remove an existing version first.');
      }
      this.data.resumes[userId].push(resume);
    }

    this.save();
    return this.data.resumes[userId];
  }

  deleteResume(userId: string, resumeId: string): SavedResumeVersion[] {
    if (this.data.resumes[userId]) {
      this.data.resumes[userId] = this.data.resumes[userId].filter((r) => r.id !== resumeId);
      this.save();
    }
    return this.data.resumes[userId] || [];
  }

  // --- Company Research Cache (7 Days TTL) ---
  getCompanyResearch(companyName: string): CompanyResearch | null {
    const normalized = companyName.trim().toLowerCase();
    const entry = this.data.companyCache[normalized];
    if (!entry) return null;

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - entry.cachedAt > SEVEN_DAYS_MS) {
      delete this.data.companyCache[normalized];
      this.save();
      return null;
    }

    return entry.data;
  }

  saveCompanyResearch(companyName: string, research: CompanyResearch) {
    const normalized = companyName.trim().toLowerCase();
    this.data.companyCache[normalized] = {
      data: {
        ...research,
        cached_at: new Date().toISOString(),
      },
      cachedAt: Date.now(),
    };
    this.save();
  }

  // --- Analyses History ---
  saveAnalysis(analysis: FullJobAnalysis) {
    const userId = analysis.userId;
    if (!this.data.analyses[userId]) {
      this.data.analyses[userId] = [];
    }
    this.data.analyses[userId].unshift(analysis);
    this.save();
  }

  getUserAnalyses(userId: string): FullJobAnalysis[] {
    return this.data.analyses[userId] || [];
  }

  // --- Kanban Tracker ---
  getUserApplications(userId: string): TrackerApplication[] {
    return this.data.tracker[userId] || [];
  }

  saveApplication(application: TrackerApplication): TrackerApplication {
    const userId = application.userId;
    if (!this.data.tracker[userId]) {
      this.data.tracker[userId] = [];
    }

    const index = this.data.tracker[userId].findIndex((a) => a.id === application.id);
    if (index >= 0) {
      this.data.tracker[userId][index] = application;
    } else {
      this.data.tracker[userId].unshift(application);
    }

    this.save();
    return application;
  }

  deleteApplication(userId: string, applicationId: string) {
    if (this.data.tracker[userId]) {
      this.data.tracker[userId] = this.data.tracker[userId].filter((a) => a.id !== applicationId);
      this.save();
    }
  }

  // --- Sent Emails & Safety Rules ---
  logSentEmail(record: SentEmailRecord) {
    this.data.sentEmails.push(record);
    this.incrementEmailCount(record.userId);
    this.save();
  }

  checkRecentEmailToRecipient(userId: string, recipientEmail: string): SentEmailRecord | undefined {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return this.data.sentEmails.find(
      (e) =>
        e.userId === userId &&
        e.recipientEmail.toLowerCase() === recipientEmail.toLowerCase() &&
        now - new Date(e.sentAt).getTime() < SEVEN_DAYS_MS
    );
  }

  // --- GDPR / DPDP: Delete My Data ---
  deleteUserData(userId: string) {
    delete this.data.users[userId];
    delete this.data.userTokens[userId];
    delete this.data.resumes[userId];
    delete this.data.analyses[userId];
    delete this.data.tracker[userId];
    this.data.sentEmails = this.data.sentEmails.filter((e) => e.userId !== userId);
    this.save();
  }
}

export const db = new DatabaseStore();
