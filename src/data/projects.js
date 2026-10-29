/**
 * Mission Control content — the Engineering District project briefs.
 *
 * Single source of truth for the Mission Control UI (no per-project JSX). Each
 * project carries its own `architectureGraph` (nodes + edges) for the
 * force-directed diagram. `kind` drives the accent colour:
 * signature | current | award | project. `cardBadge` overrides the badge word
 * on the wall card; `flowEnd` labels the end of the generic flow panel.
 * Everything here comes from each project's own README — no invented metrics.
 */

import { PALETTE } from '@/lib/palette';

// Graph node colours — named by role, drawn from the one palette.
const C = {
  amber: PALETTE.accent,
  teal: PALETTE.jade,
  blue: PALETTE.ice,
  purple: PALETTE.lilac,
  grey: PALETTE.slate,
};

export const ENGINEERING_PROJECTS = [
  {
    id: 'iet',
    kind: 'signature',
    badge: 'CLIENT SYSTEM · SOLE ENGINEER',
    label: 'Church Building Application System',
    subtitle:
      'Grant workflow for church construction across India — 21 statuses in one engine, race-safe phased funding, and a Super Admin console that changes the rules without a deploy',
    role: 'Software Solutions Architect',
    company: 'Indian Evangelical Team',
    dateRange: 'Jan 2026 – Present',
    location: 'Remote, India',
    description:
      'Digitalised the end-to-end lifecycle of church construction for a national evangelical organisation in India, replacing a paper process. Sole engineer across every layer — schema, workflow engine, API, offline-capable forms, analytics, notifications, security and CI. One engine moves each application through 21 statuses from submission to HQ review, the President’s approval and three Finance-released construction phases, then three years of reporting; a Super Admin console changes the rules without a deploy, and every change is frozen per application.',
    tags: ['Next.js 16', 'React 19', 'TypeScript', 'Prisma + PostgreSQL', 'Supabase'],
    metrics: [
      { value: '21', label: 'Workflow statuses, one engine' },
      { value: '18', label: 'Prisma models' },
      { value: '1.28s', label: 'All-time analytics, from 146.7 s' },
      { value: '700+', label: 'Automated checks in CI' },
    ],
    primaryStack: ['Next.js 16', 'React 19', 'TypeScript', 'PostgreSQL', 'Prisma 6', 'Supabase'],
    secondaryStack: ['Zod 4', 'Tailwind CSS v4', 'jose (JWT)', 'Recharts', 'ExcelJS', 'Service Worker + IndexedDB', 'Supabase Storage', 'GitHub Actions', 'Semgrep', 'Biome'],
    keyDecisions: [
      {
        title: 'Money moves in one transaction — or not at all',
        body: 'Every workflow action is one Prisma transaction around a compare-and-set on the status and the approved amount: zero rows matched means someone got there first (409, nothing written); one row means the status, the fund release, the history row and the audit row commit together. Race-tested: released never exceeds approved.',
      },
      {
        title: 'A rule change never rewrites the past',
        body: 'Super Admins change rules from a schema-driven console, so each application freezes the rules, field policy and document types it was submitted under (requirementsSnapshot), and one function judges every edit, resubmission and review by them.',
      },
      {
        title: 'Permissions live at the API, not the UI',
        body: 'Every protected route reads the session, validates the body with zod, then checks row-level access — own application, led division, file owner — before the engine re-checks role and status. The UI is a convenience, never the boundary.',
      },
    ],
    // the git history, chapter by chapter (start / end are the commit dates)
    timeline: [
      { week: 'Jan 29 – Feb 14', start: '2026-01-29', end: '2026-02-14', title: 'The prototype', desc: '13-model schema, the 9-page form, the approval flow, phase tracking and reports — 17 commits.', done: true },
      { week: 'Oct 3', start: '2026-10-03', end: '2026-10-03', title: 'The restart', desc: '56 TypeScript errors fixed, two security holes closed, and the heaviest report rewritten: 147 s → 2.8 s on the same connection.', done: true },
      { week: 'Oct 5', start: '2026-10-05', end: '2026-10-05', title: 'The engine', desc: 'In nine batches: the workflow engine, Finance releases, the daily job, the offline form.', done: true },
      { week: 'Oct 6 – 7', start: '2026-10-06', end: '2026-10-07', title: 'Money & scopes', desc: 'Approved amounts with a race-safe cap, multi-division leaders, five-scope analytics + Excel.', done: true },
      { week: 'Oct 13', start: '2026-10-13', end: '2026-10-13', title: 'Notifications', desc: '24 in-app events, five audiences — and the analytics chart kit.', done: true },
      { week: 'Oct 14 – 19', start: '2026-10-14', end: '2026-10-19', title: 'Production readiness', desc: 'CI/CD, clean-up, the security pass, nonce CSP, server-rendered first paint, design tokens.', done: true },
      { week: 'Oct 20 – 22', start: '2026-10-20', end: '2026-10-22', title: 'Mission Control', desc: 'MC-0 to MC-7: the schema-driven console, history and undo, field policy, document types.', done: true },
      { week: 'Oct 23', start: '2026-10-23', end: '2026-10-23', title: 'The audit', desc: 'CHU-27 to 33: seeds, the last Super Admin, email case, migrations, magic-byte uploads.', done: true },
    ],
    architectureGraph: {
      nodes: [
        { id: 'engine', label: 'Workflow engine', description: 'src/lib/workflow/engine.ts — every status change except the applicant’s own submit and resubmit, which write the same history and audit rows (the resubmit under the same compare-and-set). 14 actions, each one Prisma transaction around a compare-and-set, with a history row and an audit row.', category: 'workflow', importance: 'center', x: 50, y: 30 },
        { id: 'api', label: 'API routes', description: '37 route handlers. Each protected one checks the session first (requireUser(), or getCurrentUser() underneath), validates any JSON body with a zod schema, then checks row access. Status changes go through the engine.', category: 'core', importance: 'primary', x: 27, y: 50 },
        { id: 'pages', label: 'Server pages', description: '20 App Router pages. The dashboard, the six list pages, the application detail and Mission Control render on the server with their data already in the HTML; the lists and the detail use loadInitial, which calls the route handler in-process.', category: 'core', importance: 'primary', x: 27, y: 32 },
        { id: 'proxy', label: 'Edge proxy', description: 'src/proxy.ts — a fresh CSP nonce per request, an Origin check on every mutation, and a request id on every response.', category: 'auth', importance: 'secondary', x: 27, y: 14 },
        { id: 'auth', label: 'Sessions & access', description: 'HS256 session JWT in an httpOnly cookie, scrypt passwords, an atomic login lockout, and one row-level rule per entity (canAccessApplication).', category: 'auth', importance: 'primary', x: 27, y: 68 },
        { id: 'offline', label: 'Offline form', description: 'A service worker caches the form; IndexedDB queues answers and files with the owner’s id; on reconnect it posts once with an offlineId.', category: 'storage', importance: 'secondary', x: 27, y: 86 },
        { id: 'funding', label: 'Money rules', description: 'src/lib/finance/funding.ts — approval ≤ requested, releases ≤ approved − released, and only the President can adjust afterwards (a top-up may go above requested, never below what is released). Pure functions, 26 unit checks.', category: 'workflow', importance: 'primary', x: 50, y: 46 },
        { id: 'config', label: 'Config · Mission Control', description: 'Zod schema with code defaults, sparse overrides in SystemConfig, a generated Super Admin editor, history with undo, and a snapshot frozen on every application.', category: 'core', importance: 'primary', x: 50, y: 12 },
        { id: 'notify', label: 'Notifications', description: '24 event types routed by a pure recipient matrix to five audiences; written after the response, deduped per user.', category: 'realtime', importance: 'secondary', x: 50, y: 62 },
        { id: 'analytics', label: 'Analytics', description: 'Five scopes (organisation, division, church, pastor, project), one access rule per role × scope, 4 queries in one Promise.all, a 60 s cache.', category: 'data', importance: 'secondary', x: 50, y: 78 },
        { id: 'daily', label: 'Daily job', description: '00:30 IST, idempotent: report templates, due and overdue, the delayed flag, ban expiry, retention, archive purge, one audit row.', category: 'workflow', importance: 'secondary', x: 50, y: 93 },
        { id: 'database', label: 'PostgreSQL · Prisma', description: '18 models and 12 enums on Supabase Postgres, with relationJoins and a baseline migration (0_init) that CI checks for drift.', category: 'data', importance: 'primary', x: 73, y: 30 },
        { id: 'history', label: 'History & audit', description: 'ApplicationStatusHistory for every transition and AuditLog for every action, login event and config change — kept indefinitely.', category: 'data', importance: 'secondary', x: 73, y: 50 },
        { id: 'fund-release', label: 'FundRelease', description: 'One immutable row per tranche: amount, transaction reference, who released it — written in the same transaction as the status move.', category: 'data', importance: 'secondary', x: 73, y: 66 },
        { id: 'storage', label: 'Private bucket', description: 'Supabase Storage. Files are typed by magic bytes on upload, stored under the uploader’s id, and only ever handed out as 1-hour signed links.', category: 'storage', importance: 'secondary', x: 73, y: 84 },
        { id: 'pgcron', label: 'pg_cron', description: 'Supabase’s scheduler calls /api/cron/daily at 00:30 IST with a bearer secret, compared in constant time.', category: 'infrastructure', importance: 'leaf', x: 93, y: 88 },
        { id: 'excel', label: 'Excel export', description: 'ExcelJS workbook of exactly the analytics view on screen — summary, status, money, releases, phases, trends, reports.', category: 'data', importance: 'leaf', x: 93, y: 70 },
        { id: 'tier-pastor', label: 'Pastor', description: 'Applies for their church, builds, uploads phase photos, and files monthly and bi-annual reports.', category: 'workflow', importance: 'leaf', x: 6, y: 12 },
        { id: 'tier-division', label: 'Division Leader', description: 'A pastor with oversight: acts as the applicant for any project in the divisions they lead, and reviews those churches’ reports.', category: 'workflow', importance: 'leaf', x: 6, y: 27 },
        { id: 'tier-hq', label: 'HQ Team', description: 'Starts each review, flags exact fields for changes, approves or rejects, and reviews every construction phase.', category: 'workflow', importance: 'leaf', x: 6, y: 42 },
        { id: 'tier-president', label: 'President', description: 'Gives the one final approval and sets the approved amount; can hold, resume and adjust it later.', category: 'workflow', importance: 'leaf', x: 6, y: 57 },
        { id: 'tier-finance', label: 'Finance', description: 'Releases each of the three tranches — never more, in total, than the President approved.', category: 'workflow', importance: 'leaf', x: 6, y: 72 },
        { id: 'tier-admin', label: 'Super Admin', description: 'Runs Mission Control — rules, form fields, document types, people and places. Grants deadline extensions; takes no other workflow action.', category: 'auth', importance: 'leaf', x: 6, y: 87 },
      ],
      edges: [
        { source: 'tier-pastor', target: 'offline', label: 'fills in the form', direction: 'one-way' },
        { source: 'tier-pastor', target: 'pages', label: '', direction: 'two-way' },
        { source: 'tier-division', target: 'pages', label: '', direction: 'two-way' },
        { source: 'tier-hq', target: 'pages', label: '', direction: 'two-way' },
        { source: 'tier-president', target: 'pages', label: '', direction: 'two-way' },
        { source: 'tier-finance', target: 'pages', label: '', direction: 'two-way' },
        { source: 'tier-admin', target: 'pages', label: 'Mission Control', direction: 'two-way' },
        { source: 'proxy', target: 'pages', label: 'nonce · Origin check', direction: 'one-way' },
        { source: 'proxy', target: 'api', label: '', direction: 'one-way' },
        { source: 'pages', target: 'api', label: 'loadInitial, in-process', direction: 'one-way' },
        { source: 'offline', target: 'api', label: 'posts once · offlineId', direction: 'one-way' },
        { source: 'api', target: 'auth', label: 'session · zod', direction: 'one-way' },
        { source: 'api', target: 'engine', label: 'workflow actions', direction: 'two-way' },
        { source: 'api', target: 'config', label: 'settings · snapshot', direction: 'two-way' },
        { source: 'api', target: 'analytics', label: 'scoped views', direction: 'two-way' },
        { source: 'api', target: 'daily', label: '/api/cron/daily', direction: 'one-way' },
        { source: 'api', target: 'storage', label: 'signed links only', direction: 'two-way' },
        { source: 'engine', target: 'funding', label: 'the release cap', direction: 'one-way' },
        { source: 'engine', target: 'config', label: 'phase rules · getConfig()', direction: 'one-way' },
        { source: 'engine', target: 'database', label: 'compare-and-set', direction: 'two-way' },
        { source: 'engine', target: 'history', label: 'same transaction', direction: 'one-way' },
        { source: 'engine', target: 'fund-release', label: 'same transaction', direction: 'one-way' },
        { source: 'engine', target: 'notify', label: 'after commit', direction: 'one-way' },
        { source: 'config', target: 'database', label: 'sparse overrides', direction: 'two-way' },
        { source: 'auth', target: 'database', label: 'atomic lockout', direction: 'two-way' },
        { source: 'analytics', target: 'database', label: '4 queries, one Promise.all', direction: 'one-way' },
        { source: 'analytics', target: 'excel', label: 'the view on screen', direction: 'one-way' },
        { source: 'notify', target: 'database', label: 'deduped rows', direction: 'one-way' },
        { source: 'pgcron', target: 'api', label: 'bearer, constant-time', direction: 'one-way' },
        { source: 'daily', target: 'database', label: 'idempotent steps', direction: 'one-way' },
        { source: 'daily', target: 'notify', label: 'grouped reminders', direction: 'one-way' },
      ],
    },
  },

  {
    id: 'learnflow-ai',
    kind: 'current',
    badge: 'CURRENT BUILD · FOUNDING ENGINEER',
    label: 'LearnFlow AI',
    subtitle:
      'AI desktop companion for real-time lecture transcription and personalised GPT-4o tutoring',
    role: 'Co-Founder & Founding Engineer',
    company: 'LearnFlow AI',
    dateRange: '2024 – Present',
    location: 'Pre-launch',
    description:
      "LearnFlow AI centralizes the fragmented student workflow into one desktop app: it syncs assignments and due dates from Canvas via OAuth2, breaks them into actionable steps, and pairs that with a universal screenshot/highlight tool that surfaces AI explanations anywhere on screen without tab-switching. The OCR-to-AI explanation pipeline (Google Cloud Vision → GPT-4o-mini) processes captured content in under 2 seconds, and lectures are captured through a dual audio pipeline — Web Speech API for live in-browser transcription and an internal audio loopback feed sent to OpenAI's Whisper API for system audio. Pre-launch, distributed via GitHub Releases with an Express/Supabase backend hosted on Railway.",
    tags: ['Electron', 'React 19', 'GPT-4o', 'PostgreSQL', 'Whisper API'],
    metrics: [
      { value: 'sub-2s', label: 'OCR → AI explanation' },
      { value: '<150ms', label: 'Query · 50K+ records' },
      { value: '5', label: 'Live context sources' },
      { value: '15+', label: 'PostgreSQL tables' },
    ],
    primaryStack: [
      'Electron',
      'React',
      'Express.js (Node.js)',
      'Supabase (PostgreSQL)',
      'OpenAI (Whisper-1 + GPT-4o-mini)',
    ],
    secondaryStack: [
      'Google Cloud Vision OCR',
      'Web Speech API',
      'Canvas LMS API (OAuth2)',
      'electron-audio-loopback',
      'Railway (hosting)',
    ],
    keyDecisions: [
      {
        title: 'Electron over a web app',
        body: "System-wide text capture, screen capture across any application, global keyboard shortcuts, and microphone access all require native OS-level APIs that a browser sandbox can't provide. Electron lets the React frontend behave like a native app while reusing web tooling.",
      },
      {
        title: 'Railway over Docker/Azure/Kubernetes',
        body: 'The backend is a thin Express proxy in front of OpenAI and Supabase, which do the heavy lifting. At pre-launch scale, Azure App Service/AKS would cost $50-150+/month and take 10-15 days to wire up CI/CD, versus Railway at $5-20/month with 1-2 hours of setup — which still scales to an estimated 10,000-50,000+ concurrent users on the Pro tier.',
      },
      {
        title: 'Dual audio pipeline for transcription',
        body: "Live in-browser captioning uses the free, low-latency Web Speech API for interim results. In parallel, system audio captured via electron-audio-loopback is chunked into 10-second segments and transcribed through OpenAI's Whisper API for higher-accuracy final transcripts — balancing real-time feedback against transcription quality.",
      },
    ],
    timeline: [
      { week: 'WEEK 1', title: 'Architecture & Schema Design', desc: 'PostgreSQL schema, 15+ table design, API structure planning', done: true },
      { week: 'WEEK 2', title: 'Electron Foundation', desc: 'Cross-platform desktop shell, Mac and Windows audio handlers', done: true },
      { week: 'WEEK 3', title: 'Whisper Integration', desc: 'Real-time audio streaming to Whisper API, transcript pipeline', done: true },
      { week: 'WEEK 4', title: 'Context Assembly Engine', desc: '5-pipeline orchestration — slides, notes, syllabus, assignments', done: true },
      { week: 'WEEK 5', title: 'GPT-4o Tutor Layer', desc: 'Prompt engineering, context window management, response streaming', done: true },
      { week: 'WEEK 6', title: 'React 19 UI', desc: 'Real-time transcript view, AI tutor interface, session management', done: true },
      { week: 'WEEK 7', title: 'Performance Optimisation', desc: 'PostgreSQL indexing, sub-150ms query achievement on 50K+ records', done: true },
      { week: 'WEEK 8', title: 'Beta Launch & Iteration', desc: '150+ user onboarding, retention tracking, satisfaction measurement', done: true },
    ],
    // Per-project graph palette (core = ice, LearnFlow's accent).
    graphColors: {
      core: PALETTE.ice,
      audio: PALETTE.accent,
      ai: PALETTE.lilac,
      storage: PALETTE.slate,
      ui: PALETTE.jade,
      infrastructure: PALETTE.slate,
      data: PALETTE.sand,
    },
    deployment: {
      url: 'learnflow-ai.app',
      href: 'https://learnflow-ai.app/',
      platform: 'WEB APP',
      type: 'MARKETING SITE',
      status: 'OPERATIONAL',
      build: 'PRODUCTION',
    },
    architectureGraph: {
      nodes: [
        { id: 'learnflow-ai', label: 'LearnFlow AI', description: 'Electron desktop learning companion app', category: 'core', importance: 'center', x: 50, y: 45 },
        { id: 'electron-shell', label: 'Electron Shell', description: 'Wraps the React UI as a native desktop app with OS-level access', category: 'infrastructure', importance: 'primary', x: 85, y: 50 },
        { id: 'react-ui', label: 'React UI', description: 'Material-UI dashboard, notetaker, highlighter popups, settings', category: 'ui', importance: 'primary', x: 80, y: 35 },
        { id: 'express-backend', label: 'Express Backend API', description: 'Thin Node.js proxy server on port 3001 routing requests to AI/OCR/data services', category: 'infrastructure', importance: 'primary', x: 55, y: 55 },
        { id: 'supabase', label: 'Supabase (PostgreSQL)', description: 'Stores users, highlights, transcripts, study sessions, projects, quiz/exam performance', category: 'storage', importance: 'primary', x: 50, y: 85 },
        { id: 'whisper-api', label: 'OpenAI Whisper API', description: 'Transcribes system audio chunks (whisper-1 model) sent from the internal audio capture service', category: 'ai', importance: 'primary', x: 35, y: 25 },
        { id: 'gpt4o-mini', label: 'GPT-4o-mini', description: 'Generates text explanations, importance scoring, study guides, and summaries', category: 'ai', importance: 'primary', x: 60, y: 25 },
        { id: 'canvas-lms', label: 'Canvas LMS', description: 'External LMS integrated via OAuth2 to sync courses, assignments, and due dates', category: 'data', importance: 'primary', x: 12, y: 60 },
        { id: 'google-vision-ocr', label: 'Google Cloud Vision OCR', description: 'Extracts text from screenshots of slides, documents, and on-screen content', category: 'ai', importance: 'secondary', x: 45, y: 12 },
        { id: 'web-speech-api', label: 'Web Speech API', description: 'Browser-native real-time speech-to-text for live lecture captioning', category: 'audio', importance: 'secondary', x: 10, y: 22 },
        { id: 'internal-audio-capture', label: 'Internal Audio Capture', description: 'electron-audio-loopback service capturing system audio in 10-second chunks for Whisper', category: 'audio', importance: 'secondary', x: 14, y: 38 },
        { id: 'railway', label: 'Railway', description: 'Hosts the Express backend; chosen over Azure/Kubernetes for pre-launch scale', category: 'infrastructure', importance: 'secondary', x: 90, y: 88 },
        { id: 'text-highlighter', label: 'Text Highlighter Service', description: 'System-wide text capture that triggers GPT-4o-mini explanations via popup', category: 'ui', importance: 'leaf', x: 88, y: 18 },
        { id: 'screen-capture', label: 'Screen Capture Service', description: 'Top-right corner screenshot popup tool feeding OCR + AI explanation pipeline', category: 'ui', importance: 'leaf', x: 88, y: 65 },
        { id: 'study-session-manager', label: 'Study Session Manager', description: 'Periodic screen captures during study sessions, aggregated into AI-generated summaries', category: 'core', importance: 'leaf', x: 38, y: 75 },
        { id: 'smart-practice', label: 'Smart Practice', description: 'AI-generated flashcards, quizzes, and mock exams with performance analytics', category: 'ai', importance: 'leaf', x: 65, y: 75 },
        { id: 'ai-browser', label: 'AI Study Browser', description: 'Built-in browser with one-click AI page summarization', category: 'ui', importance: 'leaf', x: 85, y: 80 },
      ],
      edges: [
        { source: 'electron-shell', target: 'react-ui', label: 'wraps', direction: 'one-way' },
        { source: 'react-ui', target: 'express-backend', label: 'calls API', direction: 'two-way' },
        { source: 'express-backend', target: 'whisper-api', label: 'transcribes audio', direction: 'one-way' },
        { source: 'express-backend', target: 'gpt4o-mini', label: 'generates explanations', direction: 'one-way' },
        { source: 'express-backend', target: 'google-vision-ocr', label: 'extracts text', direction: 'one-way' },
        { source: 'express-backend', target: 'supabase', label: 'persists data', direction: 'two-way' },
        { source: 'canvas-lms', target: 'express-backend', label: 'syncs assignments via OAuth2', direction: 'one-way' },
        { source: 'internal-audio-capture', target: 'express-backend', label: 'sends audio chunks', direction: 'one-way' },
        { source: 'web-speech-api', target: 'react-ui', label: 'streams live transcript', direction: 'one-way' },
        { source: 'screen-capture', target: 'express-backend', label: 'sends screenshot', direction: 'one-way' },
        { source: 'text-highlighter', target: 'express-backend', label: 'requests explanation', direction: 'one-way' },
        { source: 'study-session-manager', target: 'express-backend', label: 'requests summary/study guide', direction: 'one-way' },
        { source: 'smart-practice', target: 'supabase', label: 'records performance', direction: 'one-way' },
        { source: 'ai-browser', target: 'express-backend', label: 'requests page summary', direction: 'one-way' },
        { source: 'express-backend', target: 'railway', label: 'deployed on', direction: 'one-way' },
      ],
    },
  },

  {
    id: 'aircast',
    kind: 'award',
    cardBadge: 'NASA GLOBAL NOMINEE',
    badge: 'NASA SPACE APPS 2025 · GLOBAL NOMINEE',
    label: 'AirCast',
    subtitle:
      'AI air-quality forecasting from space to street — fuses NASA’s TEMPO satellite, ground sensors and live weather into a 6-hour forecast and a plain-English brief',
    role: 'Full-stack · Backend · Cloud/DevOps',
    company: 'Team Relentless (with Aahil Afraz)',
    dateRange: 'NASA Space Apps 2025',
    location: 'Top 1,219 of 11,500+ teams',
    repo: 'https://github.com/allenvarghese05/aircast-nasa-hackathon',
    description:
      'Air pollution kills an estimated 7 million people a year, yet the data that could warn people is scattered across satellites, sparse ground stations and weather systems. AirCast fuses all three into one answer: “Is it safe to go outside right now — and when will it be better?” It streams NASA TEMPO Level-2 NO₂ granules (NetCDF) from Azure Blob Storage, snaps to the nearest satellite pixel, cross-validates the result against live OpenAQ ground sensors with a satellite-vs-ground correlation score, and projects air quality six hours forward with an explainable, physics-informed model driven by live wind, heat, rain, humidity and traffic cycles. GPT-4o-mini turns the fused dataset into an A–F daily brief and a context-aware chat assistant, and a five-profile safety engine gives children, seniors, athletes, adults and care facilities their own best and worst times. Built during the 2025 U.S. government shutdown — when NASA’s data updates paused, the app pinned the last TEMPO granule, labelled its exact age and kept working.',
    tags: ['Python', 'Flask', 'NASA TEMPO', 'OpenAI', 'Azure'],
    metrics: [
      { value: '1,219', label: 'Global Nominee · of 11,500+ teams' },
      { value: '3', label: 'Data sources fused' },
      { value: '6-hr', label: 'Explainable AQI forecast' },
      { value: '5', label: 'Per-group safety profiles' },
    ],
    primaryStack: ['Python 3.11', 'Flask 3.0', 'NASA TEMPO L2 NO₂', 'OpenAI gpt-4o-mini', 'Azure App Service'],
    secondaryStack: ['netCDF4 + NumPy', 'OpenAQ v3', 'OpenWeather 2.5', 'Google Maps JS API', 'Chart.js', 'Azure Blob Storage', 'GitHub Actions', 'Gunicorn'],
    keyDecisions: [
      {
        title: 'Explainable physics model over a black box',
        body: 'Each forecast hour is adjusted by readable multipliers — strong wind ×0.75, rain ×0.65, heat above 85°F ×1.20, rush hour ×1.15 — compounded with a 0.9 decay. Every prediction returns its reason (“improving as wind disperses pollution”), which is what makes the AI brief and health alerts concrete.',
      },
      {
        title: 'Cross-validate the satellite against the street',
        body: 'For the same coordinates the app compares TEMPO-derived AQI with live ground-sensor AQI and renders a correlation score — accuracy = 100 − |tempo − ground| ÷ max × 100. That reconciliation step is the heart of the NASA challenge.',
      },
      {
        title: 'Graceful degradation on every dependency',
        body: 'Every external call has a realistic fallback, missing keys degrade to cached or synthetic data, and the AI endpoints return friendly HTTP 200s on failure. Proven in production during the government shutdown, when the app cached through the upstream outage and labelled the data’s age instead of breaking.',
      },
    ],
    graphColors: { core: PALETTE.accent, data: PALETTE.ice, ai: PALETTE.lilac, ui: PALETTE.jade, storage: PALETTE.slate, infrastructure: PALETTE.slate, location: PALETTE.sand },
    architectureGraph: {
      nodes: [
        { id: 'flask', label: 'Flask API', description: 'Flask monolith serving the SPA and 8 JSON endpoints from one process; every dependency wrapped in a graceful-degradation layer.', category: 'core', importance: 'center', x: 50, y: 48 },
        { id: 'spa', label: 'Browser SPA', description: 'Vanilla JS single-page app — zero framework, zero build step — with a dark glassmorphism design system.', category: 'ui', importance: 'primary', x: 50, y: 12 },
        { id: 'tempo', label: 'TEMPO Ingestion', description: 'Streams the TEMPO_NO2_L2_V04 NetCDF granule into memory, reads the HDF groups and snaps to the nearest satellite pixel (argmin over a Manhattan-distance field).', category: 'data', importance: 'primary', x: 18, y: 62 },
        { id: 'openaq', label: 'Ground Sensors', description: 'OpenAQ v3 stations within 25 km; PM2.5 → AQI via the EPA piecewise-linear breakpoint formula, with a triple-layered fallback.', category: 'data', importance: 'primary', x: 38, y: 82 },
        { id: 'weather', label: 'Live Meteorology', description: 'OpenWeather current conditions + forecast — the variables that govern how pollution disperses.', category: 'data', importance: 'primary', x: 62, y: 82 },
        { id: 'forecast', label: 'Forecast Engine', description: 'Physics-informed 6-hour projection: meteorology and traffic-cycle multipliers with a 0.9 decay, each hour returning a human-readable reason.', category: 'core', importance: 'primary', x: 82, y: 62 },
        { id: 'safety', label: 'Safety Engine', description: 'Five risk profiles (care facilities, children, seniors, athletes, adults) with their own AQI thresholds and best/worst time windows.', category: 'core', importance: 'secondary', x: 88, y: 38 },
        { id: 'gpt', label: 'GPT-4o-mini', description: 'Writes the A–F daily brief and powers the session-aware chat assistant, fed the full fused context.', category: 'ai', importance: 'primary', x: 78, y: 18 },
        { id: 'fusion', label: 'Satellite ↔ Ground', description: 'Correlation score between TEMPO-derived and ground AQI for the same coordinates.', category: 'core', importance: 'secondary', x: 28, y: 38 },
        { id: 'blob', label: 'Azure Blob Storage', description: 'Caches the TEMPO granule; the app pinned the last available one during the 2025 shutdown.', category: 'storage', importance: 'secondary', x: 8, y: 84 },
        { id: 'nasa', label: 'NASA TEMPO', description: 'Geostationary air-quality instrument ~35,786 km up, measuring hourly at 2–8 km resolution.', category: 'location', importance: 'leaf', x: 6, y: 44 },
        { id: 'maps', label: 'Google Maps', description: 'Dark map with animated AQI markers, heatmap overlay, geocoded search and geolocation.', category: 'ui', importance: 'leaf', x: 26, y: 14 },
        { id: 'charts', label: 'Chart.js', description: 'Forecast and weather graphs colour-coded by EPA AQI category.', category: 'ui', importance: 'leaf', x: 68, y: 6 },
        { id: 'azure', label: 'Azure App Service', description: 'Production slot, deployed by GitHub Actions on every push to main; Gunicorn with a 600s timeout for the NetCDF cold start.', category: 'infrastructure', importance: 'secondary', x: 94, y: 84 },
      ],
      edges: [
        { source: 'spa', target: 'flask', label: 'fetch /api/*', direction: 'two-way' },
        { source: 'flask', target: 'tempo', label: '/api/tempo', direction: 'one-way' },
        { source: 'flask', target: 'openaq', label: '/api/air-quality', direction: 'one-way' },
        { source: 'flask', target: 'weather', label: '/api/weather', direction: 'one-way' },
        { source: 'flask', target: 'forecast', label: '/api/forecast', direction: 'one-way' },
        { source: 'forecast', target: 'safety', label: 'best / worst windows', direction: 'one-way' },
        { source: 'flask', target: 'gpt', label: '/api/ai-summary · /api/ai-chat', direction: 'one-way' },
        { source: 'tempo', target: 'fusion', label: 'satellite AQI', direction: 'one-way' },
        { source: 'openaq', target: 'fusion', label: 'ground AQI', direction: 'one-way' },
        { source: 'weather', target: 'forecast', label: 'drives', direction: 'one-way' },
        { source: 'blob', target: 'tempo', label: 'granule', direction: 'one-way' },
        { source: 'nasa', target: 'blob', label: 'L2 NO₂', direction: 'one-way' },
        { source: 'spa', target: 'maps', label: 'renders', direction: 'one-way' },
        { source: 'spa', target: 'charts', label: 'renders', direction: 'one-way' },
        { source: 'flask', target: 'azure', label: 'deployed on', direction: 'one-way' },
      ],
    },
  },

  {
    id: 'college-matcher',
    kind: 'project',
    cardBadge: 'PERSONAL PROJECT',
    badge: 'PERSONAL PROJECT',
    label: 'College Matcher',
    subtitle:
      'AI college & career discovery — an assessment, a real-time AI voice counselor and a multi-factor matching engine',
    role: 'Full-stack · Personal project',
    repo: 'https://github.com/allenvarghese05/college-matcher',
    flowEnd: 'MATCHES',
    description:
      'A web platform that helps students find their ideal colleges and career paths. Students take a multi-step assessment or talk it through with an AI voice counselor — real-time speech recognition through the Web Speech API, context-aware responses, audio visualisation and pause/resume sessions. A matching engine weighs academics, interests, career goals, geography and finances to produce ranked schools with match percentages, alongside career paths with salary and growth data. Includes a filterable school browser and a consistent light/dark design system built mobile-first.',
    tags: ['React 18', 'Node.js', 'Express', 'OpenAI', 'Web Speech API'],
    metrics: [
      { value: '5', label: 'Matching factors weighed' },
      { value: '2', label: 'Assessment modes · form & voice' },
    ],
    primaryStack: ['React 18', 'Node.js', 'Express.js', 'OpenAI API', 'Web Speech API'],
    secondaryStack: ['React Router', 'Axios', 'MongoDB', 'Multer', 'CSS-in-JS'],
    keyDecisions: [
      {
        title: 'A voice counselor, not just a form',
        body: 'College choice is a conversation, so the assessment can be spoken: live transcription, context-aware follow-ups, visual audio feedback and pause/resume — with a fallback for browsers that lack the Speech API.',
      },
      {
        title: 'Multi-factor matching',
        body: 'Recommendations weigh the academic profile, interests and activities, career goals, geographic preferences and financial constraints together, and surface a match percentage instead of a flat list.',
      },
      {
        title: 'One design system across every page',
        body: 'CSS variables drive theming with automatic light/dark detection; layouts are mobile-first with Flexbox and Grid so the assessment, browser and results feel like one product.',
      },
    ],
    architectureGraph: {
      nodes: [
        { id: 'app', label: 'College Matcher', description: 'React 18 single-page app with client-side routing.', category: 'core', importance: 'center', x: 50, y: 45 },
        { id: 'assessment', label: 'Assessment', description: 'Multi-step form with progress tracking and a smart question flow.', category: 'ui', importance: 'primary', x: 20, y: 22 },
        { id: 'voice', label: 'AI Voice Counselor', description: 'Web Speech API recognition + synthesis, conversation history, pause/resume.', category: 'ai', importance: 'primary', x: 78, y: 20 },
        { id: 'matching', label: 'Matching Engine', description: 'Weighs academics, interests, career goals, geography and finances into ranked matches.', category: 'core', importance: 'primary', x: 50, y: 80 },
        { id: 'browse', label: 'School Browser', description: 'Filterable, searchable school database with key statistics.', category: 'ui', importance: 'secondary', x: 14, y: 62 },
        { id: 'results', label: 'Results & Careers', description: 'Match percentages, school profiles and career paths with salary and growth data.', category: 'ui', importance: 'secondary', x: 86, y: 62 },
        { id: 'api', label: 'Express API', description: 'Node.js + Express backend serving routes and models.', category: 'infrastructure', importance: 'primary', x: 50, y: 12 },
        { id: 'openai', label: 'OpenAI', description: 'Natural-language processing for the counselor conversation.', category: 'ai', importance: 'secondary', x: 90, y: 38 },
      ],
      edges: [
        { source: 'app', target: 'assessment', label: 'hosts', direction: 'one-way' },
        { source: 'app', target: 'voice', label: 'hosts', direction: 'one-way' },
        { source: 'assessment', target: 'matching', label: 'answers', direction: 'one-way' },
        { source: 'voice', target: 'matching', label: 'answers', direction: 'one-way' },
        { source: 'matching', target: 'results', label: 'ranks', direction: 'one-way' },
        { source: 'app', target: 'browse', label: 'hosts', direction: 'one-way' },
        { source: 'app', target: 'api', label: 'calls', direction: 'two-way' },
        { source: 'voice', target: 'openai', label: 'converses via', direction: 'one-way' },
      ],
    },
  },

  {
    id: 'jam-duel',
    kind: 'project',
    cardBadge: 'CLASS PROJECT',
    badge: 'CLASS PROJECT · INFO 310',
    label: 'Jam Duel',
    subtitle:
      'Head-to-head song battles — daily voting with streaks, friends, and GPT-4 music recommendations',
    role: 'Full-stack · Class project',
    company: 'INFO 310',
    repo: 'https://github.com/allenvarghese05/JamDuel',
    flowEnd: 'BATTLES',
    description:
      'A social music app where users create battles between any two songs and vote on head-to-head matchups. Each user gets 10 votes a day with a midnight reset and streak tracking, can add friends, compare taste and see voting history, and receives personalised recommendations from GPT-4 based on their favourite songs and voting history, grouped by mood. Spotify powers search, album artwork and 30-second previews; YouTube adds thumbnails and in-app playback. Built with a React + TypeScript client and an Express + PostgreSQL server, and it runs in a demo mode when API keys are missing.',
    tags: ['React', 'TypeScript', 'Express', 'PostgreSQL', 'Spotify API'],
    metrics: [
      { value: '10', label: 'Votes per day · streaks tracked' },
      { value: '3', label: 'APIs · Spotify, YouTube, OpenAI' },
      { value: '4', label: 'Core data models' },
    ],
    primaryStack: ['React + TypeScript', 'Express.js', 'PostgreSQL', 'Spotify Web API', 'OpenAI GPT-4'],
    secondaryStack: ['YouTube Data API v3', 'Tailwind CSS', 'React Context (Auth)', 'nodemon'],
    keyDecisions: [
      {
        title: 'A daily vote budget',
        body: 'Ten votes a day with a midnight reset and streaks makes every vote count and turns the app into a daily habit instead of an endless swipe.',
      },
      {
        title: 'Recommendations from behaviour, not just likes',
        body: 'GPT-4 reads a user’s favourite songs and their voting history to generate suggestions grouped by mood and theme, refreshed daily.',
      },
      {
        title: 'Degrade to a demo mode',
        body: 'Without API keys the app still runs with placeholders and basic recommendations, so it can be demoed and developed without every credential in place.',
      },
    ],
    architectureGraph: {
      nodes: [
        { id: 'client', label: 'React Client', description: 'React + TypeScript frontend with Tailwind CSS and an Auth context.', category: 'ui', importance: 'center', x: 50, y: 40 },
        { id: 'server', label: 'Express Server', description: 'Express.js API: battles, voting, friends and recommendations.', category: 'core', importance: 'primary', x: 50, y: 72 },
        { id: 'db', label: 'PostgreSQL', description: 'Users (stats, streaks), Songs, Battles and Recommendations.', category: 'storage', importance: 'primary', x: 22, y: 88 },
        { id: 'spotify', label: 'Spotify API', description: 'Song search, album artwork, metadata and 30-second previews.', category: 'data', importance: 'primary', x: 14, y: 50 },
        { id: 'youtube', label: 'YouTube API', description: 'Video thumbnails and in-app playback.', category: 'data', importance: 'secondary', x: 86, y: 50 },
        { id: 'gpt4', label: 'GPT-4', description: 'Personalised recommendations from favourites and voting history, grouped by mood.', category: 'ai', importance: 'primary', x: 80, y: 88 },
        { id: 'battles', label: 'Battles & Votes', description: '10 votes a day, midnight reset, streaks and live results.', category: 'core', importance: 'secondary', x: 30, y: 14 },
        { id: 'social', label: 'Friends', description: 'Add friends, view profiles and voting history, compare taste.', category: 'core', importance: 'secondary', x: 70, y: 14 },
      ],
      edges: [
        { source: 'client', target: 'server', label: 'REST', direction: 'two-way' },
        { source: 'server', target: 'db', label: 'persists', direction: 'two-way' },
        { source: 'server', target: 'spotify', label: 'searches', direction: 'one-way' },
        { source: 'server', target: 'youtube', label: 'fetches video', direction: 'one-way' },
        { source: 'server', target: 'gpt4', label: 'recommends via', direction: 'one-way' },
        { source: 'client', target: 'battles', label: 'renders', direction: 'one-way' },
        { source: 'client', target: 'social', label: 'renders', direction: 'one-way' },
      ],
    },
  },

  {
    id: 'streetspot',
    kind: 'project',
    cardBadge: 'PROTOTYPE',
    badge: 'PERSONAL PROJECT · MOBILE PROTOTYPE',
    label: 'StreetSpot',
    subtitle:
      'Crowdsourced street-parking finder for dense cities — a live map, spot reporting and a gamified contributor system',
    role: 'Mobile · Personal project',
    location: 'Built for Philadelphia',
    repo: 'https://github.com/allenvarghese05/streetspot-app',
    flowEnd: 'PROTOTYPE',
    description:
      'A React Native app that tackles circling the block for parking in dense cities like Philadelphia. Drivers leaving or finding a spot report it; others see nearby availability on an interactive map. Accurate reports earn points (10 base plus bonuses) that level users from Rookie to Legend, with badges and leaderboards to keep the crowd-sourced data fresh. Phase 1 — authentication, the map, spot reporting, gamification, profiles and leaderboards — is built with Expo and Firebase Auth. The real-time backend (Node, Socket.io, MongoDB Atlas), push alerts and predictive “spots usually open after 6pm” insights are the planned next phase.',
    tags: ['React Native', 'Expo', 'Google Maps', 'Firebase Auth', 'Gamification'],
    metrics: [
      { value: '6', label: 'App screens built' },
      { value: '10+', label: 'Points per accurate report' },
      { value: '3', label: 'Platforms · iOS, Android, web' },
    ],
    primaryStack: ['React Native', 'Expo', 'React Native Maps', 'Firebase Auth', 'React Navigation'],
    secondaryStack: ['React Native Paper', 'Expo Location', 'Socket.io (planned)', 'Node/Express (planned)', 'MongoDB Atlas (planned)'],
    keyDecisions: [
      {
        title: 'Gamify the crowd-sourcing',
        body: 'Crowd-sourced data dies without contributors, so reporting earns points, levels (Rookie → Legend), badges and leaderboard rank — rewarding accuracy, not just volume.',
      },
      {
        title: 'Expo for one codebase',
        body: 'A single React Native codebase targets iOS, Android and web, keeping a solo prototype shippable across platforms.',
      },
      {
        title: 'Offline-first by design',
        body: 'Street-level signal is unreliable, so reports and spots are cached locally and sync when connectivity returns.',
      },
    ],
    architectureGraph: {
      nodes: [
        { id: 'app', label: 'StreetSpot App', description: 'React Native + Expo app for iOS, Android and web.', category: 'core', importance: 'center', x: 50, y: 42 },
        { id: 'map', label: 'Map Screen', description: 'Google Maps with custom markers, nearby filtering and live availability.', category: 'ui', importance: 'primary', x: 20, y: 18 },
        { id: 'report', label: 'Spot Reporting', description: 'Report a spot with location, type and restrictions.', category: 'ui', importance: 'primary', x: 80, y: 18 },
        { id: 'game', label: 'Gamification', description: 'Points, levels, achievements and leaderboards.', category: 'core', importance: 'primary', x: 84, y: 60 },
        { id: 'auth', label: 'Firebase Auth', description: 'Email/password authentication via an Auth context.', category: 'auth', importance: 'primary', x: 16, y: 62 },
        { id: 'location', label: 'Expo Location', description: 'GPS services for nearby spots.', category: 'location', importance: 'secondary', x: 30, y: 86 },
        { id: 'backend', label: 'Realtime Backend', description: 'Planned: Node/Express, Socket.io and MongoDB Atlas.', category: 'infrastructure', importance: 'secondary', x: 70, y: 86 },
      ],
      edges: [
        { source: 'app', target: 'map', label: 'navigates', direction: 'one-way' },
        { source: 'app', target: 'report', label: 'navigates', direction: 'one-way' },
        { source: 'report', target: 'game', label: 'awards points', direction: 'one-way' },
        { source: 'app', target: 'auth', label: 'signs in', direction: 'one-way' },
        { source: 'map', target: 'location', label: 'locates', direction: 'one-way' },
        { source: 'app', target: 'backend', label: 'planned sync', direction: 'two-way' },
      ],
    },
  },
];

export const projectById = (id) => ENGINEERING_PROJECTS.find((p) => p.id === id);
