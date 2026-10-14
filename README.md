# JobMatch AI v2.0 — Production-Ready AI Application Assistant

Job seekers input target job postings (via URL, pasted text, or screenshots) along with their resume. JobMatch AI parses requirements, researches the company via Google Search Grounding, scores alignment with transparent weighting, flags red flags, finds recruiter contacts, generates tailored application emails referencing authentic experience, and tracks every application in a Kanban board.

---

## 1. System Architecture

```
├── /client             # React 19 + TypeScript + Tailwind CSS (SPA)
│   ├── src/components  # JobInputTabs, ResumeManager, ResultsDashboard, KanbanBoard, QualityCheck
│   └── src/types       # Client UI view models & state
├── /server             # Node.js + Express + TypeScript Backend
│   ├── security.ts     # SSRF defense, private IP filtering, AES-256-GCM token encryption
│   ├── database.ts     # Scoped persistence (.data/db.json) with GDPR data erasure
│   ├── gemini.ts       # Structured Gemini 3.8 Flash pipeline with Zod validation & Search Grounding
│   └── emailService.ts # Gmail API OAuth dispatch, cooldown, 7-day duplicate blocker, Hunter.io
├── /shared             # Unified Zod schemas & TypeScript definitions
│   └── types.ts        # StructuredResume, JdAnalysis, CompanyResearch, ResumeMatch, TrackerApplication
├── Dockerfile          # Production multi-stage Node 22 Alpine container
└── README.md           # Deployment, OAuth, and operational documentation
```

---

## 2. Core Capabilities

1. **Job Description Ingestion**:
   - **Paste Plain Text**: Instant text analysis.
   - **Paste URL**: SSRF-protected crawler blocking private IP spaces, loopbacks, and excessive payloads.
   - **Upload Screenshots (up to 5 images)**: Multi-modal Gemini 3.8 Flash Vision extraction.
   - **Red Flags Detection**: Automatically warns if job mentions unpaid trials, wire transfers, pyramid models, or unrealistic hours.

2. **Resume Version Manager**:
   - Save up to **3 specialized versions** per user (e.g., "Full-Stack Track", "AI/ML Focus", "Backend").
   - Automatically parsed into structured JSON: skills, contact info, chronological experience, education, projects, and certifications.
   - Ingests PDF, DOCX (Word), or scanned image files (up to 5 MB, validated by content).

3. **Grounded Company Intelligence (Google Search)**:
   - Researches company mission, headcount, headquarters, products/services, recent 12-month press, culture/values, tech stack, and competitors.
   - Every claim links directly to a verified Google Search Grounding citation.
   - Caches company research for **7 days** to minimize latency and API cost.

4. **Transparent Match Scoring & ATS Checklist**:
   - Overall score (0-100) computed from 5 weighted pillars:
     - Skills Match (35%)
     - Experience Level (25%)
     - ATS Keywords (15%)
     - Education (10%)
     - Domain Fit (15%)
   - **5-8 Concrete Resume Rewrites**: Specific bullet point rewrites using strictly real facts already present in the resume.
   - **ATS Checklist**: Identifies present vs. missing keywords with context recommendations.

5. **Recruiter & HR Contact Finder**:
   - Labels contacts **VERIFIED SOURCE** (found in JD or careers listing) or **PATTERN GUESS** (corporate syntax with bounce warning).
   - Generates a concise **LinkedIn connection note** (under 300 characters).
   - Optional live email verification via Hunter.io when `HUNTER_API_KEY` is configured.

6. **Tailored Application Email Generator & Quality Diagnostic**:
   - Tones: **Formal**, **Friendly**, **Confident-Concise**, plus full **Cover Letter** and **Follow-Up Email** (for 5-7 days later).
   - Strictly references real resume achievements and one authentic company fact (zero hallucination).
   - **Real-Time Quality Check**: Flags unfilled brackets (`[Company]`), improper length (150-200 words), generic fluff cliches, or missing attachment references.

7. **Sending Options & Safety Guardrails**:
   - **Option A (Instant)**: "Open in Gmail" compose link pre-filling recipient, subject, and body.
   - **Option B (In-App)**: Send direct via Gmail API using OAuth 2.0 (`gmail.send` scope).
   - **Safety Limits**: Max 20 emails/day per user, anti-spam cooldown between sends, and a **block on sending to the same recipient twice within 7 days** unless confirmed.
   - Refresh tokens encrypted with AES-256-GCM at rest; "Disconnect Gmail" revokes tokens immediately.

8. **Application Tracker (Kanban)**:
   - Columns: **Saved**, **Applied**, **Follow-up due**, **Interview**, **Offer**, **Rejected**.
   - Tracks sent emails, dates, notes, and displays a reminder badge when a follow-up is due.
   - One-click **CSV export** for spreadsheet workflows.

9. **Privacy & Legal Compliance**:
   - Consent banner prior to first upload.
   - Written with GDPR and India DPDP Act expectations in mind.
   - **"Delete My Data"** button wipes all user resumes, tracker entries, and tokens permanently.

---

## 3. Local Development Setup

### Prerequisites
- Node.js v18.0.0 or higher
- npm or bun

### Step-by-Step
1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Add your keys in `.env`:
   ```env
   GEMINI_API_KEY="your_gemini_api_key"
   APP_URL="http://localhost:3000"
   PORT=3000
   GOOGLE_CLIENT_ID=""
   GOOGLE_CLIENT_SECRET=""
   ENCRYPTION_KEY="jobmatch_super_secure_key_32chars!"
   DAILY_EMAIL_LIMIT="20"
   DAILY_ANALYSIS_LIMIT="5"
   ```

3. **Run Unit Tests**:
   ```bash
   npm test
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:3000`.

---

## 4. Google Cloud Console OAuth Setup (For Gmail API Sending)

JobMatch AI includes a secure, official Google OAuth 2.0 flow for sending personalized application outreach emails directly from the user's connected Gmail account:

### 4.1 Environment Variables
Configure the following keys in your `.env` file (or container runtime):
```env
# OAuth 2.0 Client credentials generated in Google Cloud Console
GOOGLE_CLIENT_ID="1234567890-abcdef.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret"

# Authorized OAuth redirect URI (must match GCP Console exactly)
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

### 4.2 Step-by-Step Google Cloud Console Configuration

1. **Create or Open a Cloud Project**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Click **Select a project > New Project**, name it (e.g. `JobMatch AI`), and click **Create**.

2. **Enable the Gmail API**:
   - Navigate to **APIs & Services > Library**.
   - Search for **Gmail API** and click **Enable**.

3. **Configure OAuth Consent Screen & Scopes**:
   - Go to **APIs & Services > OAuth consent screen**.
   - Select **User Type: External** and click **Create**.
   - Provide your App name (`JobMatch AI`), user support email, and developer contact email.
   - On the **Scopes** step, click **Add or Remove Scopes**.
   - Add **ONLY** the send scope:
     ```
     https://www.googleapis.com/auth/gmail.send
     ```
   - Click **Update** and **Save and Continue**.

4. **Add Test Users (Crucial for Testing Status)**:
   > ⚠️ **Important:** While your OAuth consent screen is in **Testing** status, Google restricts access solely to accounts added as Test Users. Any other Gmail account will see `Error 403: access_denied` / `App not verified`.
   - On the **OAuth consent screen** page, scroll down to the **Test users** section.
   - Click **+ ADD USERS**.
   - Enter the exact Gmail address(es) you wish to authorize and send emails from (e.g., `you@gmail.com`).
   - Click **Save**.

5. **Create OAuth 2.0 Client ID & Authorized Redirect URIs**:
   - Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Select **Application type: Web application**.
   - Name it (e.g., `JobMatch AI Web Client`).
   - Under **Authorized JavaScript origins**, add:
     - `http://localhost:3000` (for local development)
     - `https://your-cloud-run-service.run.app` (for production)
   - Under **Authorized redirect URIs**, add:
     - `http://localhost:3000/api/auth/google/callback` (for local development)
     - `https://your-cloud-run-service.run.app/api/auth/google/callback` (for production)
   - Click **Create**.
   - Copy the generated **Client ID** and **Client Secret** into your `.env` file.

### 4.3 Gmail Sending Architecture & Security Guardrails

- **Connect at Onboarding & Settings**: Users are guided to connect Gmail at Step 1 of onboarding or through the Settings modal.
- **Account Chooser (`prompt=select_account`)**: Always presents Google's account selection screen, allowing the user to pick any Gmail account (even different from their primary sign-in account).
- **Offline Access (`access_type=offline`)**: Requests an offline refresh token using the authorization code flow so users do not have to re-login on every session.
- **Minimal Scope Discipline**: Operates strictly on `https://www.googleapis.com/auth/gmail.send`. The app cannot read, delete, or inspect private inbox contents.
- **Sender Transparency**: The sender address is **always** the connected Gmail account, explicitly displayed as `Sending as: <connected email>`.
- **Token Revocation**: Clicking **"Disconnect / Switch account"** automatically revokes the token at `https://oauth2.googleapis.com/revoke` and purges it from local storage.
- **Encrypted Token Storage**: Refresh tokens are encrypted with AES-256-GCM before being stored on the server. User passwords are never accepted, requested, or stored.
- **Token Expiry Recovery**: If a token is revoked or expired, the UI immediately alerts the user with a **"Reconnect Gmail"** button instead of failing silently.
- **Explicit Confirmation Preview**: Every email dispatch presents a full preview of recipient, subject, and body, requiring an explicit user checkbox confirmation. Emails are never auto-sent.

---

## 5. Docker Build & Cloud Run Deployment

### Docker Build (Local)
Build the container image:
```bash
docker build -t jobmatch-ai:v2.0 .
```

Run the container locally:
```bash
docker run -p 3000:3000 \
  -e GEMINI_API_KEY="your_api_key" \
  -e ENCRYPTION_KEY="jobmatch_super_secure_key_32chars!" \
  jobmatch-ai:v2.0
```

### Deploy to Google Cloud Run
1. Authenticate with Google Cloud CLI:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
2. Build and push the image to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/jobmatch-ai:v2.0
   ```
3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy jobmatch-ai \
     --image gcr.io/YOUR_PROJECT_ID/jobmatch-ai:v2.0 \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars GEMINI_API_KEY="your_api_key",ENCRYPTION_KEY="jobmatch_super_secure_key_32chars!"
   ```

---

## 6. Pre-Launch Verification Checklist

- [x] **Zero Client-Side Keys**: Gemini API key and OAuth secrets accessed strictly on the Express backend.
- [x] **SSRF Protection**: Webpage fetcher rejects loopback, RFC 1918 private IPs, local hostnames, and payloads > 3 MB.
- [x] **Zod Validation**: Every pipeline step validates structured JSON output with fallback error recovery.
- [x] **Prompt-Injection Defense**: All external JD, resume, and webpage content wrapped in `<UNTRUSTED_EXTERNAL_DATA>` tags.
- [x] **Anti-Spam Safeguards**: Daily email limits (20/day), cooldown timer, and 7-day duplicate outreach warning.
- [x] **GDPR / DPDP Compliance**: Clear consent banner, privacy policy, and working "Delete My Data" endpoint.
- [x] **WCAG AA Accessibility**: Keyboard navigable, high-contrast dark/light mode, and semantic HTML elements.
- [x] **Health Check**: `/healthz` endpoint responds with uptime and service status.

---

## 7. Known Limitations

1. **Login-Walled Job Boards**: Some platforms (e.g. LinkedIn or Glassdoor private postings) require user credentials to view full role descriptions. For these links, JobMatch AI gracefully alerts the user to copy and paste the text directly into the "Paste Text" tab.
2. **Company Grounding Freshness**: Google Search Grounding depends on publicly indexed web sources. For very early-stage stealth startups (under 3 employees), company news or tech stack details may be thin and will be labeled as "Not found".
3. **Email Deliverability**: Guessed email patterns are heuristic estimates based on corporate naming conventions. Always verify the recruiter's exact profile via LinkedIn before dispatching an email.
