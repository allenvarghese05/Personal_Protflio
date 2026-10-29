/**
 * The story of each project, told as a short case study:
 *   Problem → What I built → How it works → (Key decisions, in projects.js)
 *   → What's next.
 * Each entry lives beside its project in src/data/projects/<id>.js — the problem statements
 * lead with the idea behind the app. Facts, stack and metrics stay in
 * projects.js; this file is the narrative + how the project is shown.
 *
 * `media` drives the hero image:
 *   frame: 'browser' | 'phone' | 'private'
 *   url:   the address shown in the browser frame
 *   shots: real screenshots ('/projects/<id>/01.jpg' …) — empty = designed
 *          placeholder. Drop images in /public/projects/<id>/ and list them.
 * `live`: a public URL for the "Visit live" button (null = hidden).
 */
import { PROJECT_STUDIES } from '@/data/projects';

export const CASE_STUDIES = PROJECT_STUDIES;

export const caseStudyFor = (id) => CASE_STUDIES[id] || null;
