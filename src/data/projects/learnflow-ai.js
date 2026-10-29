/**
 * learnflow-ai — the project's wall card, brief data and case-study copy.
 * Facts only from the project's own repository.
 */
import { PALETTE } from '@/lib/palette';

export const project = {
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
};

export const caseStudy = {
  media: { frame: 'browser', url: 'learnflow-ai.app', shots: [] },
  live: 'https://learnflow-ai.app/',
  liveLabel: 'View demo',
  problem:
    'A student’s day is scattered across Canvas, lecture recordings, slides, notes and a dozen tabs — and every time something doesn’t make sense, getting help means leaving what you’re doing.',
  built:
    'A desktop learning companion that pulls assignments from Canvas, transcribes lectures live, and explains anything on screen — a highlight or a screenshot — without switching apps.',
  how: [
    'Canvas syncs over OAuth2; assignments are broken into actionable steps.',
    'A system-wide highlighter and screenshot tool feed Google Cloud Vision OCR → GPT-4o-mini, returning an explanation in under two seconds.',
    'Lectures are captured twice: the Web Speech API for live captions, and system-audio loopback sent to Whisper.',
    'A thin Express proxy on Railway fronts OpenAI and Supabase (PostgreSQL).',
  ],
  next: ['Public launch — currently pre-launch, distributed through GitHub Releases.'],
};
