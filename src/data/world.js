import { PALETTE } from '@/lib/palette';
import { ENGINEERING_PROJECTS } from '@/data/projects';

/**
 * Allen's World — the surface layout. Stone mesas rise out of a sea of
 * clouds; you walk on their flat tops and cross between them on causeways.
 *
 * Everything walkable is described here (mesa discs + causeway strips), so
 * navigation (lib/worldNav.js), rendering (AllenWorld) and the dock all read
 * one source. Adding a district = add a mesa, a causeway to it, and a zone.
 */

// Walkable mesa tops. `r` = walkable radius (the rock itself is a touch wider).
export const MESAS = [
  { id: 'landing', center: [0, 0], r: 9, label: 'Landing Site' },
  { id: 'engineering', center: [0, -34], r: 13, label: 'Engineering' },
  { id: 'observatory', center: [-32, -4], r: 10, label: 'Observatory' },
  { id: 'studio', center: [32, -4], r: 10, label: 'Studio' },
  { id: 'comms', center: [0, 30], r: 8, label: 'Comms' },
];

// Stone causeways between mesas: [mesaA, mesaB], `w` = walkable width.
// Every district hangs off the landing site — a hub you can always return to.
export const CAUSEWAYS = [
  { id: 'landing-engineering', a: 'landing', b: 'engineering', w: 3.2 },
  { id: 'landing-observatory', a: 'landing', b: 'observatory', w: 3.2 },
  { id: 'landing-studio', a: 'landing', b: 'studio', w: 3.2 },
  { id: 'landing-comms', a: 'landing', b: 'comms', w: 3.2 },
];

// Districts — what the dock and labels know about. `arrive` is where the
// click-to-travel route ends (and where the camera frames the district).
export const zones = [
  {
    id: 'landing',
    label: 'Landing Site',
    blurb: 'Where you touched down',
    mesa: 'landing',
    arrive: [0, 5],
  },
  {
    id: 'engineering',
    label: 'Engineering',
    blurb: 'Six projects · walk up to any monolith',
    mesa: 'engineering',
    arrive: [0, -23.5],
    color: PALETTE.accent,
    accent: PALETTE.accentHi,
  },
  // Stations — each has a landmark you walk up to (`landmark`, obstacle
  // radius `block`); within `near` of it, E or a click opens its room.
  {
    id: 'observatory',
    label: 'Observatory',
    blurb: 'About · journey · skills',
    mesa: 'observatory',
    arrive: [-30.2, -4],
    landmark: [-35, -4.5],
    block: 3.2,
    near: 5.6,
  },
  {
    id: 'studio',
    label: 'Studio',
    blurb: 'Photography · film · sound',
    mesa: 'studio',
    arrive: [30.2, -4],
    landmark: [35, -4.5],
    block: 3.9, // the pavilion is rectangular — cover its corners
    near: 5.6,
  },
  {
    id: 'comms',
    label: 'Comms',
    blurb: 'Contact · resume',
    mesa: 'comms',
    arrive: [0, 27.2],
    landmark: [0, 32],
    block: 1.7,
    near: 5.2,
  },
];

/** Districts with a landmark you can walk up to and enter. */
export const STATIONS = zones.filter((z) => z.landmark);

export const zoneById = (id) => zones.find((z) => z.id === id);
export const mesaById = (id) => MESAS.find((m) => m.id === id);

/*
 * The project monoliths — one per project, standing in an arc on the
 * Engineering mesa and facing the causeway you arrive on (an amphitheatre).
 * Order follows ENGINEERING_PROJECTS, left → right as you walk in.
 */
const ARC_CENTER = [0, -30];
const ARC_R = 7.4;
const ARC_SPAN = 128; // degrees, total

export const MONOLITHS = ENGINEERING_PROJECTS.map((p, i, all) => {
  const t = all.length === 1 ? 0.5 : i / (all.length - 1);
  const deg = -ARC_SPAN / 2 + t * ARC_SPAN;
  const a = (deg * Math.PI) / 180;
  const x = ARC_CENTER[0] + Math.sin(a) * ARC_R;
  const z = ARC_CENTER[1] - Math.cos(a) * ARC_R;
  return {
    id: p.id,
    index: i + 1,
    position: [x, z],
    // face the arc's centre (toward the arriving visitor)
    rotationY: Math.atan2(ARC_CENTER[0] - x, ARC_CENTER[1] - z),
  };
});

export const MONOLITH_BLOCK_R = 1.25; // the astronaut stops this far from a stone
export const MONOLITH_NEAR_R = 3.0; // within this, its preview tag shows + E opens it

/** Everything solid you can't walk through: stones + station landmarks. */
export const OBSTACLES = [
  ...MONOLITHS.map((m) => ({ position: m.position, r: MONOLITH_BLOCK_R })),
  ...zones.filter((z) => z.landmark).map((z) => ({ position: z.landmark, r: z.block })),
];
