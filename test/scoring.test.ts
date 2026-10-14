import assert from 'assert';
import {
  StructuredResumeSchema,
  JdAnalysisSchema,
  ResumeMatchSchema,
  QualityCheckSchema,
} from '../shared/types';
import { performQualityCheck } from '../server/emailService';

console.log('=== Running JobMatch AI Unit Tests ===\n');

// 1. Test StructuredResumeSchema validation
{
  console.log('Test 1: Validating StructuredResumeSchema...');
  const sampleResume = {
    name: 'Alexander Chen',
    contactInfo: {
      email: 'alex.chen@example.com',
      location: 'San Francisco, CA',
    },
    summary: 'Senior Software Engineer with 8 years of experience building web tools.',
    skills: ['TypeScript', 'React', 'Node.js'],
    experience: [
      {
        company: 'Veloce Systems',
        title: 'Senior Engineer',
        dates: '2021 - Present',
        achievements: ['Cut query latency by 40% with client caching.'],
      },
    ],
    education: [
      {
        institution: 'UC Berkeley',
        degree: 'B.S. in Computer Science',
      },
    ],
    projects: [],
    certifications: [],
    rawText: 'Resume text',
  };

  const parsed = StructuredResumeSchema.parse(sampleResume);
  assert.strictEqual(parsed.name, 'Alexander Chen');
  assert.strictEqual(parsed.skills.length, 3);
  console.log('✓ StructuredResumeSchema passed.');
}

// 2. Test JdAnalysisSchema validation
{
  console.log('\nTest 2: Validating JdAnalysisSchema...');
  const sampleJd = {
    job_title: 'Staff Frontend Engineer',
    company_name: 'Linear',
    location: 'Remote',
    work_mode: 'Remote',
    employment_type: 'Full-time',
    seniority: 'Staff',
    salary_if_listed: '$180,000 - $220,000',
    required_skills: ['React', 'TypeScript', 'WebSockets'],
    nice_to_have_skills: ['IndexedDB', 'SQLite'],
    responsibilities: ['Build real-time client sync protocol'],
    keywords_for_ATS: ['TypeScript', 'React', 'Offline-first'],
    contact_emails_found: ['talent@linear.app'],
    application_deadline: 'Rolling',
    red_flags: [],
    role_summary: 'Leading frontend performance and real-time synchronization.',
  };

  const parsed = JdAnalysisSchema.parse(sampleJd);
  assert.strictEqual(parsed.company_name, 'Linear');
  assert.strictEqual(parsed.work_mode, 'Remote');
  console.log('✓ JdAnalysisSchema passed.');
}

// 3. Test ResumeMatchSchema breakdown weights
{
  console.log('\nTest 3: Validating ResumeMatch breakdown weighting logic...');
  const sampleMatch = {
    overall_score: 84,
    breakdown: {
      skills_match: { name: 'Skills Match', weight: 35, score: 90, reason: 'High TypeScript match' },
      experience_level: { name: 'Experience', weight: 25, score: 85, reason: '8 years matches staff' },
      keywords_ats: { name: 'ATS Keywords', weight: 15, score: 80, reason: 'Key terms present' },
      education: { name: 'Education', weight: 10, score: 95, reason: 'CS degree matches' },
      domain_fit: { name: 'Domain Fit', weight: 15, score: 70, reason: 'Developer tools background' },
    },
    matching_skills: ['TypeScript', 'React'],
    partially_matching_skills: ['WebSockets'],
    missing_skills: ['Rust'],
    top_strengths: ['Deep TypeScript mastery'],
    top_gaps: ['Lacks native mobile experience'],
    resume_edit_suggestions: [
      {
        target_section: 'Experience',
        current_framing: 'Worked on sync',
        suggested_rewrite: 'Engineered optimistic offline-first sync protocol cutting latency by 40%',
        rationale: 'Targets JD emphasis on instant UI',
      },
    ],
    ats_checklist: [
      { keyword: 'TypeScript', status: 'present', context_found_or_tip: 'Found in experience' },
    ],
  };

  const parsed = ResumeMatchSchema.parse(sampleMatch);
  const totalWeight =
    parsed.breakdown.skills_match.weight +
    parsed.breakdown.experience_level.weight +
    parsed.breakdown.keywords_ats.weight +
    parsed.breakdown.education.weight +
    parsed.breakdown.domain_fit.weight;

  assert.strictEqual(totalWeight, 100, 'Category weights must sum to exactly 100%');
  console.log('✓ ResumeMatch breakdown weighting verified (Total weight: 100%).');
}

// 4. Test Email Quality and Spam Diagnostics
{
  console.log('\nTest 4: Testing performQualityCheck algorithm...');
  const cleanBody = `
Dear Hiring Team,

I came across Linear's recent Sync Engine v2 update and was deeply impressed by your commitment to sub-16ms client latency across desktop and web applications. With eight years of professional experience building real-time collaboration engines using React and WebSockets at Veloce Systems, I have consistently focused on optimizing client-side performance, data structures, and perceived responsiveness.

In my current role, I architected an optimistic local-first caching layer with IndexedDB that reduced median query latency from 240ms to 8ms for 85,000 active daily engineers. I also engineered our custom keyboard command palette supporting fuzzy search across 50,000 workspace entities with sub-16ms render times. In addition, I successfully led our build system migration to Vite, cutting dev startup times from 42s to 1.2s and trimming production bundle size by 32%.

Linear's obsessive attention to craft, keyboard-first navigation, and snappy interface design matches how I approach building modern developer software. I am available to join within 30 days and would love to discuss how my distributed state and real-time experience can contribute to Linear's next phase of product growth.

Best regards,
Alex Chen
`.trim();

  const cleanCheck = performQualityCheck(cleanBody);
  assert.strictEqual(cleanCheck.is_ideal_length, true, 'Clean body should meet word count target');
  assert.strictEqual(cleanCheck.has_unfilled_placeholders, false, 'No placeholder brackets should be found');
  assert.strictEqual(cleanCheck.cliche_warnings.length, 0, 'No cliches should be found in clean email');

  // Test with unfilled bracket and cliché
  const dirtyBody = `I am writing to express my interest in [Company Name]. I am a proven go-getter.`;
  const dirtyCheck = performQualityCheck(dirtyBody);
  assert.strictEqual(dirtyCheck.has_unfilled_placeholders, true, 'Should flag [Company Name]');
  assert.strictEqual(dirtyCheck.cliche_warnings.length > 0, true, 'Should detect cliches');
  console.log('✓ Quality check diagnostics passed.');
}

console.log('\n=== All Unit Tests Passed Successfully! ===');
